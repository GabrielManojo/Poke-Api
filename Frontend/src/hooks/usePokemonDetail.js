import { useMemo, useState } from "react";
import { fetchPokemon, fetchPokemonDetail } from "../api/pokeApi";

// usePokemonDetail manages everything related to the single-Pokemon view:
//   • which Pokemon is currently open
//   • the extra detail data (weaknesses, evolution chain) — fetched in one call
//   • loading / error state for the detail panel
//   • previous / next navigation between adjacent Pokédex entries
//
// It receives sortedPokemons so it can derive prev/next without duplicating
// that sorted list in App.jsx.
// All data-fetching logic lives in pokeApi.js — this hook only manages state.
export function usePokemonDetail(sortedPokemons) {
    const [selectedPokemon, setSelectedPokemon] = useState(null);
    // detailData holds weaknesses[] and evolutionPokemons[] once loaded.
    const [detailData, setDetailData] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Find the position of the selected Pokemon in the sorted list.
    const selectedPokemonIndex = useMemo(() => {
        if (!selectedPokemon) return -1;
        return sortedPokemons.findIndex((p) => p.id === selectedPokemon.id);
    }, [selectedPokemon, sortedPokemons]);

    // Derived adjacent entries; null if the boundary is reached.
    const previousPokemon =
        selectedPokemonIndex > 0 ? sortedPokemons[selectedPokemonIndex - 1] : null;

    const nextPokemon =
        selectedPokemonIndex >= 0 &&
            selectedPokemonIndex < sortedPokemons.length - 1
            ? sortedPokemons[selectedPokemonIndex + 1]
            : null;

    // Opens the detail view and fetches extra data for the given Pokemon.
    // A single backend call replaces the previous multi-step fetch chain
    // (species → evolution → types → weakness aggregation).
    const openPokemonDetail = async (pokemon) => {
        setSelectedPokemon(pokemon);
        setDetailData(null);
        setIsDetailLoading(true);
        setErrorMessage("");

        try {
            // One request to get weaknesses + evolution chain from the backend.
            const detail = await fetchPokemonDetail(pokemon.name);
            setDetailData(detail);
        } catch {
            setErrorMessage("Could not load Pokemon detail view.");
        } finally {
            setIsDetailLoading(false);
        }
    };

    // Resets the detail view and returns the user to the grid.
    const closePokemonDetail = () => {
        setSelectedPokemon(null);
        setDetailData(null);
        setErrorMessage("");
    };

    // Fetches the full Pokemon object by name/id then opens the detail view.
    // Used when navigating from an evolution card (which only has a name/id).
    const openPokemonDetailByName = async (nameOrId) => {
        try {
            const pokemon = await fetchPokemon(nameOrId);
            await openPokemonDetail(pokemon);
        } catch {
            setErrorMessage("Could not load Pokemon detail view.");
        }
    };

    // Navigation helpers delegate to openPokemonDetail with the adjacent entry.
    const openPreviousPokemon = () => {
        if (previousPokemon) openPokemonDetail(previousPokemon);
    };

    const openNextPokemon = () => {
        if (nextPokemon) openPokemonDetail(nextPokemon);
    };

    return {
        selectedPokemon,
        detailData,
        isDetailLoading,
        errorMessage,
        previousPokemon,
        nextPokemon,
        openPokemonDetail,
        openPokemonDetailByName,
        closePokemonDetail,
        openPreviousPokemon,
        openNextPokemon,
    };
}
