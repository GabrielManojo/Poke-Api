import { useEffect, useRef, useState } from "react";
import { fetchTeamWeaknesses, fetchTeamRecommendation } from "../api/pokeApi";

// Maximum Pokemon allowed in a single team.
const TEAM_LIMIT = 6;

// Wait this long after the team stops changing before asking the AI agent
// for advice. Keeps rapid add/remove clicks from firing a Gemini request per
// click — still fully automatic, just coalesced into one call.
const AI_RECOMMENDATION_DEBOUNCE_MS = 800;

// useTeamManager owns all team-building state:
//   • the list of chosen Pokemon
//   • per-Pokemon weakness breakdowns  (computed by the backend)
//   • the aggregated team-wide weakness summary (computed by the backend)
//   • an AI-generated recommendation (Gemini, via the Python AI-Agent)
//
// Whenever the team changes, a POST to /api/team/weaknesses is made, and
// (after a short debounce) a POST to /api/team/recommendation. All
// aggregation/AI logic lives on the server — this hook only manages state.
export function useTeamManager() {
    // Array of full Pokemon objects the user has added.
    const [teamPokemons, setTeamPokemons] = useState([]);
    // Per-member weakness breakdown: [{ id, name, weaknesses[] }]
    const [teamPokemonWeaknesses, setTeamPokemonWeaknesses] = useState([]);
    // Aggregated summary: [{ name, count }] sorted by count desc.
    const [teamWeaknesses, setTeamWeaknesses] = useState([]);
    // Latest AI advice text, or "" before anything has loaded.
    const [aiRecommendation, setAiRecommendation] = useState("");
    // True while a recommendation request is in flight.
    const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
    // Non-empty string if the last recommendation request failed.
    const [recommendationError, setRecommendationError] = useState("");

    // Guards against a stale response (from a team composition we've since
    // changed away from) overwriting newer state.
    const recommendationTokenRef = useRef(0);

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

    // Ask the AI agent for advice whenever the team changes, debounced so a
    // burst of add/remove clicks only triggers one Gemini call.
    useEffect(() => {
        if (!teamPokemons.length) {
            // Nothing to advise on yet — skip the network call entirely.
            recommendationTokenRef.current += 1;
            setAiRecommendation("");
            setRecommendationError("");
            setIsLoadingRecommendation(false);
            return;
        }

        const token = ++recommendationTokenRef.current;

        const timeoutId = setTimeout(async () => {
            setIsLoadingRecommendation(true);
            setRecommendationError("");

            try {
                const { recommendation } = await fetchTeamRecommendation(teamPokemons);

                if (token !== recommendationTokenRef.current) {
                    return; // Team changed again before this resolved.
                }

                setAiRecommendation(recommendation);
            } catch {
                if (token === recommendationTokenRef.current) {
                    setRecommendationError(
                        "Could not reach the AI agent. Make sure the Python AI-Agent server is running.",
                    );
                }
            } finally {
                if (token === recommendationTokenRef.current) {
                    setIsLoadingRecommendation(false);
                }
            }
        }, AI_RECOMMENDATION_DEBOUNCE_MS);

        return () => clearTimeout(timeoutId);
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
        aiRecommendation,
        isLoadingRecommendation,
        recommendationError,
    };
}
