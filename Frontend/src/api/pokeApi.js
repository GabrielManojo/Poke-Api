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
export async function fetchPokemonList({ limit = 151, offset = 0 } = {}) {
    return apiFetch(`/pokemon?limit=${limit}&offset=${offset}`);
}

// Fetches a single Pokemon by name or numeric ID.
export async function fetchPokemon(nameOrId) {
    return apiFetch(`/pokemon/${nameOrId}`);
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

// Sends the current team to the backend and receives the full weakness analysis.
// Moving this computation server-side means the frontend just passes a minimal
// payload and renders the response — no aggregation logic in React.
//
// teamPokemons — the full Pokemon objects the user has added to their team.
// Returns: { pokemonWeaknesses: [...], teamWeaknesses: [...] }
export async function fetchTeamWeaknesses(teamPokemons) {
    // Map each Pokemon to the minimal payload the backend needs.
    const team = teamPokemons.map((pokemon) => ({
        id: pokemon.id,
        name: pokemon.name,
        typeNames: pokemon.types.map((entry) => entry.type.name),
    }));

    return apiFetch("/team/weaknesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
    });
}
