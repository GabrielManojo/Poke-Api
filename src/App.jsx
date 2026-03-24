import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // Stores the full Pokémon data for all fetched Pokémon
  const [pokemons, setPokemons] = useState([]);

  // If the array is still empty, we assume data is loading
  const isLoading = pokemons.length === 0;

  useEffect(() => {
    // Function to fetch Pokémon data from the API
    async function fetchPokemons() {
      try {
        // 1. Fetch the first 151 Pokémon from the main Pokémon endpoint
        const res = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=151&offset=0",
        );
        const data = await res.json();

        // 2. For each Pokémon in the list, fetch detailed data
        const fullPokemonData = await Promise.all(
          data.results.map(async (p) => {
            // Fetch detailed Pokémon data using its URL
            const pokemonRes = await fetch(p.url);
            const pokemonData = await pokemonRes.json();

            // 3. Fetch species data
            // This gives access to extra info like evolution chain URL
            const speciesRes = await fetch(pokemonData.species.url);
            const speciesData = await speciesRes.json();

            // 4. Fetch evolution chain data using the species endpoint
            const evolutionRes = await fetch(speciesData.evolution_chain.url);
            const evolutionData = await evolutionRes.json();

            // 5. Combine Pokémon details with evolution chain data
            return {
              ...pokemonData,
              evolutionChain: evolutionData,
            };
          }),
        );

        // Save all combined Pokémon data into state
        setPokemons(fullPokemonData);
      } catch (error) {
        // Log any errors to the console
        console.error("Error fetching Pokémon data:", error);
      }
    }

    // Call the function once when the component mounts
    fetchPokemons();
  }, []);

  // Helper function to collect all evolution names from the chain
  function getAllEvolutionNames(chain) {
    const names = [];

    function traverse(node) {
      // Add current Pokémon name to the list
      names.push(node.species.name);

      // Recursively go through every evolution branch
      node.evolves_to.forEach((evolution) => {
        traverse(evolution);
      });
    }

    // Start from the beginning of the chain
    traverse(chain);

    // Remove duplicate names, capitalize each one, and join with arrows
    return [...new Set(names)]
      .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
      .join(" → ");
  }

  return (
    <main className="app-shell py-5">
      <div className="container">
        {/* Header section */}
        <div className="row justify-content-center mb-5">
          <div className="col-12 col-xl-8 text-center">
            <p className="text-uppercase fw-semibold text-secondary mb-2 app-eyebrow">
              Fetching Data
            </p>
            <h1 className="display-5 fw-bold mb-3">Pokemon Grid</h1>
            <p className="lead text-secondary mb-0 px-lg-5">
              A responsive Bootstrap card grid built from the PokeAPI.
            </p>
          </div>
        </div>

        {/* Show loading message until Pokémon data is ready */}
        {isLoading ? (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div
                className="alert alert-light border text-center shadow-sm mb-0"
                role="status"
              >
                Loading Pokemon cards...
              </div>
            </div>
          </div>
        ) : (
          // Once data is loaded, display the Pokémon cards in a grid
          <div className="row g-4">
            {pokemons.map((pokemon) => (
              <div
                key={pokemon.name} // Unique key for React list rendering
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
              >
                <article className="card h-100 shadow-sm border-0 pokemon-card">
                  <div className="card-body d-flex flex-column p-4">
                    {/* Pokémon image */}
                    <div className="pokemon-image-wrap mb-3">
                      <img
                        src={pokemon.sprites.front_default}
                        alt={pokemon.name}
                        className="img-fluid"
                      />
                    </div>

                    {/* Pokémon name and Pokédex number */}
                    <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                      <h2 className="h4 text-capitalize mb-0">
                        {pokemon.name}
                      </h2>
                      <span className="badge text-bg-primary">
                        #{pokemon.id}
                      </span>
                    </div>

                    {/* Pokémon type(s) */}
                    <p className="mb-2 small text-secondary">
                      <strong className="text-dark">Type:</strong>{" "}
                      {pokemon.types.map((type) => type.type.name).join(", ")}
                    </p>

                    {/* Pokémon abilities */}
                    <p className="mb-2 small text-secondary">
                      <strong className="text-dark">Abilities:</strong>{" "}
                      {pokemon.abilities
                        .map((ability) => ability.ability.name)
                        .join(", ")}
                    </p>

                    {/* First 5 Pokémon moves */}
                    <p className="mb-2 small text-secondary">
                      <strong className="text-dark">Moves:</strong>{" "}
                      {pokemon.moves
                        .slice(0, 5)
                        .map((move) => move.move.name)
                        .join(", ")}
                    </p>

                    {/* Full evolution chain */}
                    <p className="mb-0 small text-secondary">
                      <strong className="text-dark">Evolution:</strong>{" "}
                      {getAllEvolutionNames(pokemon.evolutionChain.chain)}
                    </p>
                  </div>
                </article>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
