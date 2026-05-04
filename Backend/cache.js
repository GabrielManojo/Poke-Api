// ─── In-memory response cache ─────────────────────────────────────────────────
// Every successful upstream fetch is stored here as { data, expiresAt }.
// Subsequent requests for the same URL are served instantly from memory until
// the entry expires, preventing redundant hits to the public PokeAPI.
//
// This is a process-level cache so it resets on server restart, which is
// perfectly acceptable for a development/hobby project.

// How long each cached entry stays valid (10 minutes).
const CACHE_TTL_MS = 10 * 60 * 1000;

// The store: Maps a full URL string → { data, expiresAt }.
const cache = new Map();

// Fetch a URL with cache-first behaviour.
// - If a fresh entry exists in the cache, return it immediately.
// - Otherwise fetch from the network, store the result, then return it.
// - Throws on non-2xx responses so callers can catch and respond with errors.
export async function cachedFetch(url) {
    const cached = cache.get(url);

    // Return the cached copy if it has not expired yet.
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Upstream request failed: ${url} (${response.status})`);
    }

    const data = await response.json();

    // Store with a future expiry timestamp.
    cache.set(url, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return data;
}
