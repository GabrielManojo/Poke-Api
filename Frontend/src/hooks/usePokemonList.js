import { useEffect, useMemo, useState } from "react";
import { fetchPokemonList } from "../api/pokeApi";

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

    useEffect(() => {
        async function loadPokemons() {
            try {
                // One API call — the backend hydrates every entry.
                const data = await fetchPokemonList();
                setPokemons(data);
            } catch {
                setErrorMessage("Could not load Pokemon data.");
            } finally {
                // Always turn off the spinner, even on failure.
                setIsGridLoading(false);
            }
        }

        loadPokemons();
    }, []); // Empty deps → runs exactly once after first render.

    // Sort by Pokédex number so the order is stable across re-renders.
    const sortedPokemons = useMemo(
        () => [...pokemons].sort((a, b) => a.id - b.id),
        [pokemons],
    );

    return { sortedPokemons, isGridLoading, errorMessage };
}
