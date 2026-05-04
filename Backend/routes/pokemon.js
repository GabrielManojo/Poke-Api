import { Router } from "express";
import { cachedFetch } from "../cache.js";

const router = Router();

// Base URL for the upstream public PokeAPI — only defined once here.
const POKEAPI = "https://pokeapi.co/api/v2";

// ─── Helper: recursively walk an evolution chain node ─────────────────────────
// The PokeAPI evolution chain is a linked-list tree where each node can have
// multiple branches (e.g. Eevee).  We DFS every branch to collect all species
// names in the chain.
function extractEvolutionNames(node) {
    const names = [node.species.name];

    if (!node.evolves_to.length) {
        return names;
    }

    return [
        ...names,
        ...node.evolves_to.flatMap((nextNode) => extractEvolutionNames(nextNode)),
    ];
}

// ─── GET /api/pokemon ─────────────────────────────────────────────────────────
// Returns fully-hydrated Pokemon objects in pages.
// Query params:
//   - limit  (default 151)
//   - offset (default 0)
// Total is capped by POKEMON_LIMIT (defaults to 1025).
router.get("/", async (req, res) => {
    try {
        const totalLimit = Number(process.env.POKEMON_LIMIT || 151);
        const requestedLimit = Number(req.query.limit || 151);
        const requestedOffset = Number(req.query.offset || 0);

        const safeOffset = Math.max(0, requestedOffset);
        const safeLimit = Math.max(1, requestedLimit);
        const remaining = Math.max(totalLimit - safeOffset, 0);
        const pageLimit = Math.min(safeLimit, remaining);

        // If the requested offset is past the configured max, return an empty page.
        if (pageLimit === 0) {
            return res.json({
                results: [],
                total: totalLimit,
                limit: safeLimit,
                offset: safeOffset,
                nextOffset: null,
                hasMore: false,
            });
        }

        const listData = await cachedFetch(
            `${POKEAPI}/pokemon?limit=${pageLimit}&offset=${safeOffset}`
        );

        // Fetch every Pokemon's full data in parallel.
        // cachedFetch ensures repeated requests for the same URL are free.
        const fullPokemonData = await Promise.all(
            listData.results.map((entry) => cachedFetch(entry.url))
        );

        const nextOffset = safeOffset + pageLimit;

        res.json({
            results: fullPokemonData,
            total: totalLimit,
            limit: pageLimit,
            offset: safeOffset,
            nextOffset: nextOffset < totalLimit ? nextOffset : null,
            hasMore: nextOffset < totalLimit,
        });
    } catch (error) {
        console.error("[GET /api/pokemon]", error.message);
        res.status(500).json({ error: "Could not load Pokemon list." });
    }
});

// ─── GET /api/pokemon/:nameOrId ───────────────────────────────────────────────
// Returns the full PokeAPI data object for a single Pokemon.
// Used by the evolution chain loader to get sprite + types for each stage.
router.get("/:nameOrId", async (req, res) => {
    try {
        const { nameOrId } = req.params;
        const data = await cachedFetch(`${POKEAPI}/pokemon/${nameOrId}`);
        res.json(data);
    } catch (error) {
        console.error(`[GET /api/pokemon/${req.params.nameOrId}]`, error.message);
        res.status(404).json({ error: "Pokemon not found." });
    }
});

// ─── GET /api/pokemon/:nameOrId/detail ───────────────────────────────────────
// Aggregates everything the detail view needs into a single backend call so the
// frontend never has to chain multiple requests itself:
//   • weaknesses  — type names that deal 2× damage to this Pokemon
//   • evolutionPokemons — [{ id, name, image, types }] for each chain stage
//
// This endpoint is the main reason the frontend hooks are so short — all the
// multi-step logic (species → evolution chain → types → weakness aggregation)
// is done here on the server where results can also be cached.
router.get("/:nameOrId/detail", async (req, res) => {
    try {
        const { nameOrId } = req.params;

        // 1. Fetch the base Pokemon object to get its types and species URL.
        const pokemon = await cachedFetch(`${POKEAPI}/pokemon/${nameOrId}`);

        // 2. Fetch the species to get the evolution chain URL.
        const speciesData = await cachedFetch(pokemon.species.url);

        // 3. Fetch the evolution chain.
        const evolutionData = await cachedFetch(speciesData.evolution_chain.url);

        // 4. Fetch damage relations for each of the Pokemon's types in parallel.
        const typeData = await Promise.all(
            pokemon.types.map((entry) => cachedFetch(entry.type.url))
        );

        // 5. Collect unique weakness type names (types that deal 2× damage).
        const weaknesses = [
            ...new Set(
                typeData.flatMap((entry) =>
                    entry.damage_relations.double_damage_from.map((t) => t.name)
                )
            ),
        ];

        // 6. Walk the evolution chain tree and deduplicate species names.
        const evolutionNames = [
            ...new Set(extractEvolutionNames(evolutionData.chain)),
        ];

        // 7. Fetch each evolution stage's Pokemon data for sprite + types.
        const evolutionPokemons = await Promise.all(
            evolutionNames.map(async (name) => {
                const evoPokemon = await cachedFetch(`${POKEAPI}/pokemon/${name}`);
                return {
                    id: evoPokemon.id,
                    name: evoPokemon.name,
                    image: evoPokemon.sprites.front_default,
                    types: evoPokemon.types.map((t) => t.type.name),
                };
            })
        );

        res.json({ weaknesses, evolutionPokemons });
    } catch (error) {
        console.error(`[GET /api/pokemon/${req.params.nameOrId}/detail]`, error.message);
        res.status(500).json({ error: "Could not load Pokemon detail." });
    }
});

// ─── GET /api/species/:nameOrId ───────────────────────────────────────────────
// Proxies the PokeAPI pokemon-species endpoint.
// Used when the frontend needs raw species data (e.g. Pokédex descriptions).
router.get("/species/:nameOrId", async (req, res) => {
    try {
        const { nameOrId } = req.params;
        const data = await cachedFetch(`${POKEAPI}/pokemon-species/${nameOrId}`);
        res.json(data);
    } catch (error) {
        console.error(`[GET /api/species/${req.params.nameOrId}]`, error.message);
        res.status(404).json({ error: "Species not found." });
    }
});

// ─── GET /api/evolution/:id ───────────────────────────────────────────────────
// Proxies the PokeAPI evolution-chain endpoint.
router.get("/evolution/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const data = await cachedFetch(`${POKEAPI}/evolution-chain/${id}`);
        res.json(data);
    } catch (error) {
        console.error(`[GET /api/evolution/${req.params.id}]`, error.message);
        res.status(404).json({ error: "Evolution chain not found." });
    }
});

// ─── GET /api/type/:nameOrId ──────────────────────────────────────────────────
// Proxies the PokeAPI type endpoint (damage relations, etc.).
router.get("/type/:nameOrId", async (req, res) => {
    try {
        const { nameOrId } = req.params;
        const data = await cachedFetch(`${POKEAPI}/type/${nameOrId}`);
        res.json(data);
    } catch (error) {
        console.error(`[GET /api/type/${req.params.nameOrId}]`, error.message);
        res.status(404).json({ error: "Type not found." });
    }
});

export default router;
