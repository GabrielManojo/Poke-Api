import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    fetchPokemonList,
    searchPokemonByName as apiSearchPokemonByName,
    fetchPokemonBatch,
} from "../api/pokeApi";
import { PAGE_SIZE, LEGENDARY_IDS } from "./useSearch";

// Fetch the same number of Pokemon from the backend as we display per page.
// With POKEMON_LIMIT raised to 1025 on the backend, this keeps every network
// round trip small (10 hydrated Pokemon) instead of hydrating large batches
// up front, so the site stays fast even though the full Pokedex is reachable.
const SERVER_PAGE_SIZE = PAGE_SIZE;

// usePokemonList fetches a Dex range from our backend and keeps the raw
// list in state, exposing a stable sorted copy.
// All network logic lives in pokeApi.js — this hook only manages state.
//
// `range` scopes which Dex numbers are fetched:
//   - undefined/null → the full Pokedex (offset 0, backend's configured max).
//   - { start, end } → only that inclusive 1-based Dex range (used for the
//     generation filter) so picking e.g. Generation IX never has to load
//     generations I-VIII first.
// Changing `range` resets and reloads from the start of the new range.
export function usePokemonList(range) {
    const rangeStart = range?.start ?? 1;
    const rangeEnd = range?.end ?? null; // null = no upper bound besides the backend's own total.

    // Raw data from the backend (unsorted).
    const [pokemons, setPokemons] = useState([]);
    // True while the first network request for the current range is in-flight.
    const [isGridLoading, setIsGridLoading] = useState(true);
    // Non-empty string means we show the ErrorState component.
    const [errorMessage, setErrorMessage] = useState("");
    // Total available count within the current range.
    const [totalPokemons, setTotalPokemons] = useState(0);
    // Next server offset to request when loading more pages.
    const [nextOffset, setNextOffset] = useState(rangeStart - 1);
    // True while an additional server page is loading.
    const [isLoadingMorePokemons, setIsLoadingMorePokemons] = useState(false);
    // False once we reached the end of the current range (or the backend max).
    const [hasMorePokemons, setHasMorePokemons] = useState(false);
    // True while a name search request is in flight.
    const [isSearchingByName, setIsSearchingByName] = useState(false);
    // True while the "Legendary only" top-up fetch is in flight.
    const [isLoadingLegendaries, setIsLoadingLegendaries] = useState(false);

    // Guards against a stale in-flight request (from a range we've since left)
    // overwriting state after the user switches generations again.
    const requestTokenRef = useRef(0);

    // Merge existing + new page by id to avoid duplicates if requests overlap.
    const mergeUniquePokemons = (current, incoming) => {
        const byId = new Map(current.map((pokemon) => [pokemon.id, pokemon]));
        incoming.forEach((pokemon) => byId.set(pokemon.id, pokemon));
        return Array.from(byId.values());
    };

    // Shared page loader used by both initial load and "load more".
    // Clamps the requested limit so a page never overshoots rangeEnd.
    const loadPokemonPage = useCallback(
        async (offset, token) => {
            const remainingInRange =
                rangeEnd != null ? rangeEnd - offset : Infinity;
            const limit = Math.max(0, Math.min(SERVER_PAGE_SIZE, remainingInRange));

            if (limit <= 0) {
                setHasMorePokemons(false);
                return;
            }

            const page = await fetchPokemonList({ limit, offset });

            // A newer range has since been selected — ignore this stale result.
            if (token !== requestTokenRef.current) {
                return;
            }

            const backendTotal = page.total;
            const effectiveTotal =
                rangeEnd != null
                    ? Math.min(rangeEnd, backendTotal) - rangeStart + 1
                    : backendTotal;

            const rawNextOffset = page.nextOffset ?? page.total;
            const cappedNextOffset =
                rangeEnd != null ? Math.min(rawNextOffset, rangeEnd) : rawNextOffset;

            setPokemons((prev) => mergeUniquePokemons(prev, page.results));
            setTotalPokemons(effectiveTotal);
            setNextOffset(cappedNextOffset);
            setHasMorePokemons(page.hasMore && cappedNextOffset < (rangeEnd ?? Infinity));
        },
        [rangeEnd, rangeStart],
    );

    // (Re)load from the start of the range whenever the selected range changes.
    useEffect(() => {
        const token = ++requestTokenRef.current;

        setIsGridLoading(true);
        setErrorMessage("");
        setPokemons([]);
        setNextOffset(rangeStart - 1);

        async function loadPokemons() {
            try {
                // First page only so the UI renders quickly.
                await loadPokemonPage(rangeStart - 1, token);
            } catch {
                if (token === requestTokenRef.current) {
                    setErrorMessage("Could not load Pokemon data.");
                }
            } finally {
                if (token === requestTokenRef.current) {
                    setIsGridLoading(false);
                }
            }
        }

        loadPokemons();
    }, [rangeStart, rangeEnd, loadPokemonPage]);

    // Loads the next server page within the current range.
    const loadMorePokemons = useCallback(async () => {
        if (isLoadingMorePokemons || !hasMorePokemons) {
            return;
        }

        const token = requestTokenRef.current;
        setIsLoadingMorePokemons(true);

        try {
            await loadPokemonPage(nextOffset, token);
        } catch {
            if (token === requestTokenRef.current) {
                setErrorMessage("Could not load more Pokemon.");
            }
        } finally {
            if (token === requestTokenRef.current) {
                setIsLoadingMorePokemons(false);
            }
        }
    }, [hasMorePokemons, isLoadingMorePokemons, loadPokemonPage, nextOffset]);

    // Searches the backend for name matches within the current range and
    // merges any hits straight into `pokemons`, so a Pokemon shows up in the
    // grid the moment it's found — even if normal sequential "load more"
    // pagination hasn't reached it yet.
    const searchPokemonByName = useCallback(
        async (query) => {
            const trimmedQuery = query.trim();

            if (!trimmedQuery) {
                return;
            }

            const token = requestTokenRef.current;
            setIsSearchingByName(true);

            try {
                const { results } = await apiSearchPokemonByName({
                    query: trimmedQuery,
                    start: rangeStart,
                    end: rangeEnd ?? undefined,
                });

                // A range switch happened while this request was in flight —
                // discard results from the range we've since left.
                if (token !== requestTokenRef.current) {
                    return;
                }

                if (results?.length) {
                    setPokemons((prev) => mergeUniquePokemons(prev, results));
                }
            } catch {
                // Search failing shouldn't break the page — the grid still
                // shows whatever's already loaded, it just won't top up.
            } finally {
                if (token === requestTokenRef.current) {
                    setIsSearchingByName(false);
                }
            }
        },
        [rangeStart, rangeEnd],
    );

    // Fetches every legendary Dex ID within the current range directly (we
    // already know the IDs — no search needed) and merges them in. This is
    // what makes "Legendary only" show every legendary in the range instead
    // of just whichever ones happened to already be paginated into view.
    const ensureLegendariesLoaded = useCallback(async () => {
        const legendaryIdsInRange = [...LEGENDARY_IDS].filter(
            (id) => id >= rangeStart && (rangeEnd == null || id <= rangeEnd),
        );

        if (!legendaryIdsInRange.length) {
            return;
        }

        const token = requestTokenRef.current;
        setIsLoadingLegendaries(true);

        try {
            const { results } = await fetchPokemonBatch(legendaryIdsInRange);

            // A range switch happened while this request was in flight —
            // discard results from the range we've since left.
            if (token !== requestTokenRef.current) {
                return;
            }

            if (results?.length) {
                setPokemons((prev) => mergeUniquePokemons(prev, results));
            }
        } catch {
            // Failing to top up legendaries shouldn't break the page — the
            // grid still shows whatever's already loaded.
        } finally {
            if (token === requestTokenRef.current) {
                setIsLoadingLegendaries(false);
            }
        }
    }, [rangeStart, rangeEnd]);

    // Sort by Pokédex number so the order is stable across re-renders.
    const sortedPokemons = useMemo(
        () => [...pokemons].sort((a, b) => a.id - b.id),
        [pokemons],
    );

    return {
        sortedPokemons,
        isGridLoading,
        errorMessage,
        loadMorePokemons,
        hasMorePokemons,
        isLoadingMorePokemons,
        loadedPokemonCount: pokemons.length,
        totalPokemons,
        searchPokemonByName,
        isSearchingByName,
        ensureLegendariesLoaded,
        isLoadingLegendaries,
    };
}
