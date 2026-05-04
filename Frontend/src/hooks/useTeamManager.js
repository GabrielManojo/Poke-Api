import { useEffect, useState } from "react";
import { fetchTeamWeaknesses } from "../api/pokeApi";

// Maximum Pokemon allowed in a single team.
const TEAM_LIMIT = 6;

// useTeamManager owns all team-building state:
//   • the list of chosen Pokemon
//   • per-Pokemon weakness breakdowns  (computed by the backend)
//   • the aggregated team-wide weakness summary (computed by the backend)
//
// Whenever the team changes, a single POST to /api/team/weaknesses is made.
// All aggregation logic lives on the server — this hook only manages state.
export function useTeamManager() {
    // Array of full Pokemon objects the user has added.
    const [teamPokemons, setTeamPokemons] = useState([]);
    // Per-member weakness breakdown: [{ id, name, weaknesses[] }]
    const [teamPokemonWeaknesses, setTeamPokemonWeaknesses] = useState([]);
    // Aggregated summary: [{ name, count }] sorted by count desc.
    const [teamWeaknesses, setTeamWeaknesses] = useState([]);

    // Re-fetch weakness analysis from the backend whenever the team changes.
    useEffect(() => {
        async function loadTeamWeaknesses() {
            try {
                // The backend accepts the team and returns both weakness views.
                const { pokemonWeaknesses, teamWeaknesses: aggregated } =
                    await fetchTeamWeaknesses(teamPokemons);

                setTeamPokemonWeaknesses(pokemonWeaknesses);
                setTeamWeaknesses(aggregated);
            } catch {
                // Reset to empty if the request fails so the UI stays consistent.
                setTeamPokemonWeaknesses([]);
                setTeamWeaknesses([]);
            }
        }

        loadTeamWeaknesses();
    }, [teamPokemons]);

    // Adds a Pokemon if the team is not full and the Pokemon is not already in it.
    const addPokemonToTeam = (pokemon) => {
        setTeamPokemons((prev) => {
            if (prev.length >= TEAM_LIMIT || prev.some((p) => p.id === pokemon.id)) {
                return prev;
            }
            return [...prev, pokemon];
        });
    };

    // Removes a single Pokemon from the team by its numeric ID.
    const removePokemonFromTeam = (pokemonId) => {
        setTeamPokemons((prev) => prev.filter((p) => p.id !== pokemonId));
    };

    return {
        teamPokemons,
        teamPokemonWeaknesses,
        teamWeaknesses,
        teamLimit: TEAM_LIMIT,
        addPokemonToTeam,
        removePokemonFromTeam,
    };
}
