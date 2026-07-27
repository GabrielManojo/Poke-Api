import { useEffect, useMemo, useState } from "react";

// How long to wait after the user stops typing before asking the backend
// to search for name matches outside what's already loaded.
const NAME_SEARCH_DEBOUNCE_MS = 350;

// All 18 standard Pokemon types — used to render the type chip toggles.
export const ALL_TYPES = [
    "normal", "fire", "water", "electric", "grass", "ice",
    "fighting", "poison", "ground", "flying", "psychic", "bug",
    "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

// Known legendary Pokemon IDs (National Dex) up to current generations.
// This powers the "Legendary only" filter button in the search UI.
// Exported so usePokemonList can fetch these directly by ID when the filter
// is toggled on, instead of relying on them already being paginated in.
export const LEGENDARY_IDS = new Set([
    144, 145, 146, 150,
    243, 244, 245, 249, 250,
    377, 378, 379, 380, 381, 382, 383, 384,
    480, 481, 482, 483, 484, 485, 486, 487, 488, 491,
    638, 639, 640, 641, 642, 643, 644, 645, 646,
    716, 717, 718,
    772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800,
    888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898,
    1001, 1002, 1003, 1004, 1007, 1008,
    1014, 1015, 1016, 1017, 1020, 1021, 1022, 1023, 1024, 1025,
]);

// How many pokemon to show per page in the grid.
// Also reused as the backend fetch chunk size (see usePokemonList) so each
// "Load more" click only ever hydrates 10 new Pokemon instead of a big batch.
export const PAGE_SIZE = 10;

// useSearch manages the search/filter state and derives the visible pokemon list.
// It is kept separate from usePokemonList so the list hook stays focused on
// fetching and the filter logic is easy to find and test on its own.
//
// Accepts sortedPokemons (the full sorted list from usePokemonList) plus an
// optional options object:
//   - onNameSearch(query)      usePokemonList's searchPokemonByName. When
//     provided, typing a name debounces a backend search so a match shows
//     up even if it hasn't been paginated into sortedPokemons yet.
//   - onEnsureLegendaries()    usePokemonList's ensureLegendariesLoaded.
//     When provided, turning "Legendary only" on fetches every legendary in
//     the current range directly by ID, instead of only showing whichever
//     legendaries happened to already be paginated in.
// Returns the filtered list plus the state values and setters the SearchBar needs.
export function useSearch(sortedPokemons, { onNameSearch, onEnsureLegendaries } = {}) {
    // Free-text name query typed by the user.
    const [nameQuery, setNameQuery] = useState("");

    // Debounce the backend top-up search: wait until typing pauses so we
    // don't fire a request on every keystroke.
    useEffect(() => {
        const trimmedQuery = nameQuery.trim();

        if (!trimmedQuery || !onNameSearch) {
            return;
        }

        const timeoutId = setTimeout(() => {
            onNameSearch(trimmedQuery);
        }, NAME_SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
    }, [nameQuery, onNameSearch]);

    // Set of type name strings the user has toggled on.
    // Empty Set means "no type filter — show all".
    // Multiple selected types act as AND: the pokemon must have ALL of them.
    const [selectedTypes, setSelectedTypes] = useState(new Set());
    // Toggle for showing only legendary pokemon.
    const [legendaryOnly, setLegendaryOnly] = useState(false);

    // Whenever legendary-only is (or becomes) active, make sure every
    // legendary in the current range is actually loaded. onEnsureLegendaries
    // is recreated by usePokemonList whenever the selected generation
    // changes, so this also re-fires and tops up the new range.
    useEffect(() => {
        if (!legendaryOnly || !onEnsureLegendaries) {
            return;
        }

        onEnsureLegendaries();
    }, [legendaryOnly, onEnsureLegendaries]);

    // Toggle a single type name in or out of the active filter set.
    const toggleType = (typeName) => {
        setSelectedTypes((prev) => {
            const next = new Set(prev);
            if (next.has(typeName)) {
                next.delete(typeName); // deselect
            } else {
                next.add(typeName);    // select
            }
            return next;
        });
    };

    // Derive the visible list by applying both filters together.
    // useMemo means this only reruns when the source list or filter values change.
    const filteredPokemons = useMemo(() => {
        // Normalise the name query: trim whitespace, lowercase for case-insensitive match.
        const query = nameQuery.trim().toLowerCase();

        return sortedPokemons.filter((pokemon) => {
            // Name filter: match anywhere in the name so "saur" finds "bulbasaur".
            const nameMatches = query === "" || pokemon.name.includes(query);

            // Type filter: the pokemon must have EVERY type in the selected set.
            // This lets the user pick e.g. Poison + Grass to find dual-type pokemon.
            const pokemonTypeNames = pokemon.types.map((e) => e.type.name);
            const typeMatches =
                selectedTypes.size === 0 ||
                [...selectedTypes].every((t) => pokemonTypeNames.includes(t));

            // Legendary filter: keep only pokemon whose dex id is in LEGENDARY_IDS.
            const legendaryMatches = !legendaryOnly || LEGENDARY_IDS.has(pokemon.id);

            return nameMatches && typeMatches && legendaryMatches;
        });
    }, [sortedPokemons, nameQuery, selectedTypes, legendaryOnly]);

    // Clear both filters at once (used by the "Clear" button).
    const clearSearch = () => {
        setNameQuery("");
        setSelectedTypes(new Set());
        setLegendaryOnly(false);
    };

    return {
        nameQuery,
        setNameQuery,
        selectedTypes,
        toggleType,
        legendaryOnly,
        setLegendaryOnly,
        filteredPokemons,
        clearSearch,
        // True when at least one filter is active — used to show result count / clear button.
        isFiltered: nameQuery.trim() !== "" || selectedTypes.size > 0 || legendaryOnly,
    };
}
