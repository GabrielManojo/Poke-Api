import { Router } from "express";
import { cachedFetch } from "../cache.js";

const router = Router();

const POKEAPI = "https://pokeapi.co/api/v2";

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

        // Return empty data immediately if the team is empty.
        if (!team || !team.length) {
            return res.json({ pokemonWeaknesses: [], teamWeaknesses: [] });
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

        res.json({ pokemonWeaknesses, teamWeaknesses });
    } catch (error) {
        console.error("[POST /api/team/weaknesses]", error.message);
        res.status(500).json({ error: "Could not compute team weaknesses." });
    }
});

export default router;
