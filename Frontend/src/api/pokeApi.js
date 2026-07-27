// ─── Frontend API client ──────────────────────────────────────────────────────
// Every request from the React app to our Express backend goes through this
// file.  Benefits:
//   • BASE_URL is defined exactly once — change the port or host in one place.
//   • All fetch logic is isolated here, keeping React hooks free of raw fetch
//     calls and URL construction.
//   • Easy to swap in a different transport (axios, etc.) without touching hooks.

const BASE_URL = "http://localhost:5000/api";

// Shared fetch wrapper: throws a descriptive Error on non-OK responses.
async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, options);

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${path} (${res.status})`);
    }

    return res.json();
}

// ─── Pokemon ─────────────────────────────────────────────────────────────────

// Fetches one page of Pokemon from the backend.
// Returns:
// { results, total, limit, offset, nextOffset, hasMore }
export async function fetchPokemonList({ limit = 10, offset = 0 } = {}) {
    return apiFetch(`/pokemon?limit=${limit}&offset=${offset}`);
}

// Fetches a single Pokemon by name or numeric ID.
export async function fetchPokemon(nameOrId) {
    return apiFetch(`/pokemon/${nameOrId}`);
}

// Searches Pokemon names (case-insensitive substring) across a Dex range,
// so a match can be found and shown even if it hasn't been paginated into
// the frontend's already-loaded list yet.
// `start`/`end` are optional 1-based inclusive Dex numbers (used to scope
// the search to the currently selected generation); omit for the full range.
// Returns: { results, matchCount }
export async function searchPokemonByName({ query, start, end }) {
    const params = new URLSearchParams({ q: query });
    if (start != null) params.set("start", start);
    if (end != null) params.set("end", end);

    return apiFetch(`/pokemon/search?${params.toString()}`);
}

// Hydrates a specific list of Dex IDs in one call — used to load "Legendary
// only" matches directly by ID instead of paginating until we happen to
// reach them.
// Returns: { results }
export async function fetchPokemonBatch(ids) {
    return apiFetch(`/pokemon/batch?ids=${ids.join(",")}`);
}

// Fetches all detail data for the detail view in a SINGLE backend call.
// The backend handles the multi-step chain (species → evolution → types →
// weakness aggregation) and returns the final result.
//
// Returns: { weaknesses: string[], evolutionPokemons: [{ id, name, image, types }] }
export async function fetchPokemonDetail(nameOrId) {
    return apiFetch(`/pokemon/${nameOrId}/detail`);
}

// ─── Team ─────────────────────────────────────────────────────────────────────

// Shared shape: maps full Pokemon objects to the minimal payload both team
// endpoints need.
function toTeamPayload(teamPokemons) {
    return teamPokemons.map((pokemon) => ({
        id: pokemon.id,
        name: pokemon.name,
        typeNames: pokemon.types.map((entry) => entry.type.name),
    }));
}

// Sends the current team to the backend and receives the full weakness analysis.
// Moving this computation server-side means the frontend just passes a minimal
// payload and renders the response — no aggregation logic in React.
//
// teamPokemons — the full Pokemon objects the user has added to their team.
// Returns: { pokemonWeaknesses: [...], teamWeaknesses: [...] }
export async function fetchTeamWeaknesses(teamPokemons) {
    return apiFetch("/team/weaknesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: toTeamPayload(teamPokemons) }),
    });
}

// Asks the backend (which forwards to the Python/Gemini AI-Agent) for advice
// on the current team — whether it's good, and what to add if not.
// Returns: { recommendation: string }
export async function fetchTeamRecommendation(teamPokemons) {
    return apiFetch("/team/recommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team: toTeamPayload(teamPokemons) }),
    });
}
