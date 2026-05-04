import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchPokemonList } from "../api/pokeApi";

const SERVER_PAGE_SIZE = 151;

// usePokemonList fetches the full Pokédex from our backend on mount,
// keeps the raw list in state, and exposes a stable sorted copy.
// All network logic lives in pokeApi.js — this hook only manages state.
export function usePokemonList() {
    // Raw data from the backend (unsorted).
    const [pokemons, setPokemons] = useState([]);
    // True while the first network request is in-flight.
    const [isGridLoading, setIsGridLoading] = useState(true);
    // Non-empty string means we show the ErrorState component.
    const [errorMessage, setErrorMessage] = useState("");
    // Total available count exposed by backend (capped by backend config).
    const [totalPokemons, setTotalPokemons] = useState(0);
    // Next server offset to request when loading more pages.
    const [nextOffset, setNextOffset] = useState(0);
    // True while an additional server page is loading.
    const [isLoadingMorePokemons, setIsLoadingMorePokemons] = useState(false);
    // False once we reached the configured backend maximum (e.g. 1025).
    const [hasMorePokemons, setHasMorePokemons] = useState(false);

    // Merge existing + new page by id to avoid duplicates if requests overlap.
    const mergeUniquePokemons = (current, incoming) => {
        const byId = new Map(current.map((pokemon) => [pokemon.id, pokemon]));
        incoming.forEach((pokemon) => byId.set(pokemon.id, pokemon));
        return Array.from(byId.values());
    };

    // Shared page loader used by both initial load and "load more".
    const loadPokemonPage = useCallback(async (offset) => {
        const page = await fetchPokemonList({
            limit: SERVER_PAGE_SIZE,
            offset,
        });

        setPokemons((prev) => mergeUniquePokemons(prev, page.results));
        setTotalPokemons(page.total);
        setNextOffset(page.nextOffset ?? page.total);
        setHasMorePokemons(page.hasMore);
    }, []);

    useEffect(() => {
        async function loadPokemons() {
            try {
                // First page only so the UI renders quickly.
                await loadPokemonPage(0);
            } catch {
                setErrorMessage("Could not load Pokemon data.");
            } finally {
                // Always turn off the spinner, even on failure.
                setIsGridLoading(false);
            }
        }

        loadPokemons();
    }, [loadPokemonPage]); // Empty deps effect with stable callback.

    // Loads the next server page (151 more) until the configured max is reached.
    const loadMorePokemons = useCallback(async () => {
        if (isLoadingMorePokemons || !hasMorePokemons) {
            return;
        }

        setIsLoadingMorePokemons(true);

        try {
            await loadPokemonPage(nextOffset);
        } catch {
            setErrorMessage("Could not load more Pokemon.");
        } finally {
            setIsLoadingMorePokemons(false);
        }
    }, [hasMorePokemons, isLoadingMorePokemons, loadPokemonPage, nextOffset]);

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
    };
}
