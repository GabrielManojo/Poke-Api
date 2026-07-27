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
// Total is capped by POKEMON_LIMIT (defaults to 151).
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

// ─── GET /api/pokemon/batch ─────────────────────────────────────────────────────
// Hydrates a specific list of Dex IDs/names in parallel. Used by the
// "Legendary only" filter: the frontend knows the legendary Dex IDs already
// (no search needed) and just needs them fetched even if normal sequential
// pagination hasn't reached them yet. Registered ABOVE /:nameOrId so "batch"
// isn't swallowed as a nameOrId lookup.
// Query params:
//   - ids  required. Comma-separated Dex IDs or names, e.g. "144,145,146".
router.get("/batch", async (req, res) => {
    try {
        const idsParam = String(req.query.ids || "").trim();

        if (!idsParam) {
            return res.json({ results: [] });
        }

        const ids = idsParam
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean);

        // Safety cap so a malformed/huge id list can't fan out into hundreds
        // of upstream requests at once.
        const MAX_BATCH_SIZE = 150;
        const limitedIds = ids.slice(0, MAX_BATCH_SIZE);

        const results = await Promise.all(
            limitedIds.map((id) => cachedFetch(`${POKEAPI}/pokemon/${id}`))
        );

        res.json({ results });
    } catch (error) {
        console.error("[GET /api/pokemon/batch]", error.message);
        res.status(500).json({ error: "Could not load Pokemon batch." });
    }
});

// ─── GET /api/pokemon/search ───────────────────────────────────────────────────
// Searches Pokemon names (case-insensitive substring match) across a Dex
// range, so the frontend can find a match even if it hasn't been paginated
// into the loaded list yet. Registered ABOVE /:nameOrId — otherwise Express
// would treat "search" itself as a nameOrId lookup.
// Query params:
//   - q      required. Case-insensitive substring to match against names.
//   - start  1-based Dex number to start from (default 1).
//   - end    1-based Dex number to end at, inclusive (default POKEMON_LIMIT).
router.get("/search", async (req, res) => {
    try {
        const totalLimit = Number(process.env.POKEMON_LIMIT || 151);
        const query = String(req.query.q || "").trim().toLowerCase();
        const start = Math.max(1, Number(req.query.start) || 1);
        const end = Math.min(totalLimit, Number(req.query.end) || totalLimit);

        if (!query || start > end) {
            return res.json({ results: [], matchCount: 0 });
        }

        // Lightweight master list for the range — just { name, url } pairs.
        // Cheap even across the full 1025 because nothing is hydrated here.
        const offset = start - 1;
        const limit = end - start + 1;
        const listData = await cachedFetch(
            `${POKEAPI}/pokemon?limit=${limit}&offset=${offset}`
        );

        const matches = listData.results.filter((entry) =>
            entry.name.includes(query)
        );

        // Cap how many we hydrate per request so a broad query (e.g. a
        // single letter) can't trigger hundreds of upstream fetches at once.
        const MAX_SEARCH_RESULTS = 30;
        const limitedMatches = matches.slice(0, MAX_SEARCH_RESULTS);

        const results = await Promise.all(
            limitedMatches.map((entry) => cachedFetch(entry.url))
        );

        res.json({ results, matchCount: matches.length });
    } catch (error) {
        console.error("[GET /api/pokemon/search]", error.message);
        res.status(500).json({ error: "Could not search Pokemon." });
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
