import { Router } from "express";
import { cachedFetch } from "../cache.js";

const router = Router();

const POKEAPI = "https://pokeapi.co/api/v2";

// URL of the separate Python/Flask AI agent (see /AI-Agent). Configurable via
// Backend/.env so it can point somewhere other than localhost in deployment.
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://localhost:5002";

// Must match the frontend's TEAM_LIMIT (Frontend/src/hooks/useTeamManager.js).
// Enforced here too so a client that skips the UI can't send an oversized
// team and force extra PokeAPI/Gemini calls.
const TEAM_LIMIT = 6;

// The 18 canonical Pokemon type names. Any typeNames value that isn't in
// this set is dropped before it ever reaches a PokeAPI URL or the Gemini
// prompt — closes off a URL-injection path through
// `${POKEAPI}/type/${typeName}` and keeps junk out of the AI prompt.
const VALID_TYPES = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting",
    "poison", "ground", "flying", "psychic", "bug", "rock", "ghost",
    "dragon", "dark", "steel", "fairy",
]);

// ─── Shared request validation ─────────────────────────────────────────────
// Used by both /weaknesses and /recommendation to reject malformed or
// oversized payloads before any PokeAPI or Gemini call is made. Throws a
// descriptive Error on invalid input; returns a sanitized team array
// otherwise (bad typeNames entries silently filtered rather than rejecting
// the whole request, since that's recoverable).
function validateAndSanitizeTeam(team) {
    if (team === undefined || team === null) {
        return [];
    }
    if (!Array.isArray(team)) {
        throw new Error("team must be an array");
    }
    if (team.length > TEAM_LIMIT) {
        throw new Error(`team must contain at most ${TEAM_LIMIT} Pokemon`);
    }

    return team.map((member, index) => {
        if (
            !member ||
            typeof member !== "object" ||
            typeof member.name !== "string" ||
            !member.name.trim() ||
            !Number.isFinite(member.id)
        ) {
            throw new Error(`team[${index}] is missing a valid id/name`);
        }

        const typeNames = Array.isArray(member.typeNames)
            ? member.typeNames.filter(
                  (t) => typeof t === "string" && VALID_TYPES.has(t)
              )
            : [];

        return { id: member.id, name: member.name, typeNames };
    });
}

// ─── Shared weakness computation ───────────────────────────────────────────────
// Used by both /weaknesses (rendered in the sidebar) and /recommendation
// (sent to the AI agent as grounding data) so the two never disagree and the
// AI agent never has to re-derive type match-ups itself.
//
// team: [{ id, name, typeNames: string[] }] — expected to already be
// sanitized via validateAndSanitizeTeam().
// Returns: { pokemonWeaknesses: [{ id, name, weaknesses }], teamWeaknesses: [{ name, count }] }
async function computeTeamWeaknesses(team) {
    if (!team || !team.length) {
        return { pokemonWeaknesses: [], teamWeaknesses: [] };
    }

    // Gather every unique type name across all team members in one pass.
    // This avoids redundant API calls when multiple Pokemon share a type.
    const uniqueTypeNames = [
        ...new Set(team.flatMap((member) => member.typeNames)),
    ];

    // Fetch damage relations for each unique type in parallel.
    const typeWeaknessEntries = await Promise.all(
        uniqueTypeNames.map(async (typeName) => {
            const typeData = await cachedFetch(`${POKEAPI}/type/${typeName}`);
            return [
                typeName,
                typeData.damage_relations.double_damage_from.map((t) => t.name),
            ];
        })
    );

    // Build a fast lookup: typeName → weakness names[].
    const weaknessByType = new Map(typeWeaknessEntries);

    // Compute the deduplicated, sorted weakness list for every team member.
    const pokemonWeaknesses = team.map((member) => {
        const memberWeaknesses = new Set(
            member.typeNames.flatMap(
                (typeName) => weaknessByType.get(typeName) || []
            )
        );

        return {
            id: member.id,
            name: member.name,
            weaknesses: [...memberWeaknesses].sort((a, b) =>
                a.localeCompare(b)
            ),
        };
    });

    // Count how many team members are weak to each attack type.
    const weaknessCounter = pokemonWeaknesses.reduce((counter, member) => {
        member.weaknesses.forEach((name) => {
            counter.set(name, (counter.get(name) || 0) + 1);
        });
        return counter;
    }, new Map());

    // Convert to a sorted array: most-shared weaknesses first.
    const teamWeaknesses = [...weaknessCounter.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    return { pokemonWeaknesses, teamWeaknesses };
}

// ─── POST /api/team/weaknesses ────────────────────────────────────────────────
// Accepts the user's current team and returns a full weakness analysis.
// Moving this computation to the backend means the frontend just sends one
// request and receives ready-to-render data — no aggregation logic in React.
//
// Request body:
//   {
//     team: [
//       { id: number, name: string, typeNames: string[] }
//       // e.g. { id: 6, name: "charizard", typeNames: ["fire", "flying"] }
//     ]
//   }
//
// Response:
//   {
//     pokemonWeaknesses: [{ id, name, weaknesses: string[] }],
//     teamWeaknesses:    [{ name: string, count: number }]
//   }
router.post("/weaknesses", async (req, res) => {
    let team;
    try {
        team = validateAndSanitizeTeam(req.body?.team);
    } catch (error) {
        return res.status(400).json({ error: error.message || "Invalid team payload." });
    }

    try {
        const result = await computeTeamWeaknesses(team);
        res.json(result);
    } catch (error) {
        console.error("[POST /api/team/weaknesses]", error.message);
        res.status(500).json({ error: "Could not compute team weaknesses." });
    }
});

// ─── POST /api/team/recommendation ─────────────────────────────────────────────
// Asks the Python AI agent (see /AI-Agent, powered by Gemini) whether the
// team is good and what to add. We compute the weakness data ourselves with
// the same trusted logic as /weaknesses and send it along as grounding data,
// so the AI only has to reason about it rather than re-derive type match-ups.
//
// Request body: same shape as /weaknesses.
// Response: { recommendation: string }
//
// Rate-limited per client IP (see MIN_RECOMMENDATION_INTERVAL_MS below) as a
// server-side backstop: the frontend already debounces 800ms between calls,
// but that's a client-side courtesy a scripted caller could ignore. Without
// this, an automated client hammering this endpoint could rack up Gemini
// usage with no cost to itself.
const MIN_RECOMMENDATION_INTERVAL_MS = 500;
const lastRequestByIp = new Map();

router.post("/recommendation", async (req, res) => {
    const clientIp = req.ip;
    const now = Date.now();
    const lastRequestAt = lastRequestByIp.get(clientIp);
    if (lastRequestAt && now - lastRequestAt < MIN_RECOMMENDATION_INTERVAL_MS) {
        return res.status(429).json({
            error: "Too many requests — please slow down.",
        });
    }
    lastRequestByIp.set(clientIp, now);

    let team;
    try {
        team = validateAndSanitizeTeam(req.body?.team);
    } catch (error) {
        return res.status(400).json({ error: error.message || "Invalid team payload." });
    }

    try {
        if (!team.length) {
            return res.json({
                recommendation: "Add Pokemon to your team to get AI advice.",
            });
        }

        const { pokemonWeaknesses, teamWeaknesses } = await computeTeamWeaknesses(team);

        const agentResponse = await fetch(`${AI_AGENT_URL}/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team, pokemonWeaknesses, teamWeaknesses }),
        });

        if (!agentResponse.ok) {
            throw new Error(`AI agent responded with ${agentResponse.status}`);
        }

        const data = await agentResponse.json();
        res.json({ recommendation: data.recommendation });
    } catch (error) {
        console.error("[POST /api/team/recommendation]", error.message);
        res.status(502).json({
            error:
                "Could not reach the AI agent. Make sure the AI-Agent Python server is running (see AI-Agent/README.md).",
        });
    }
});

export default router;
