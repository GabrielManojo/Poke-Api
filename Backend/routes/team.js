import { Router } from "express";
import { cachedFetch } from "../cache.js";

const router = Router();

const POKEAPI = "https://pokeapi.co/api/v2";

// URL of the separate Python/Flask AI agent (see /AI-Agent). Configurable via
// Backend/.env so it can point somewhere other than localhost in deployment.
const AI_AGENT_URL = process.env.AI_AGENT_URL || "http://localhost:5002";

// ─── Shared weakness computation ───────────────────────────────────────────────
// Used by both /weaknesses (rendered in the sidebar) and /recommendation
// (sent to the AI agent as grounding data) so the two never disagree and the
// AI agent never has to re-derive type match-ups itself.
//
// team: [{ id, name, typeNames: string[] }]
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
    try {
        const { team } = req.body;
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
router.post("/recommendation", async (req, res) => {
    try {
        const { team } = req.body;

        if (!team || !team.length) {
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
