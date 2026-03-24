import { useState } from "react";
import { useEffect } from "react";

import "./App.css";

function App() {
  // State to store all Pokémon data (array of objects)
  const [pokemons, setPokemons] = useState([]);

  // Boolean to check if data is still loading
  // If array is empty → still loading
  const isLoading = pokemons.length === 0;

  useEffect(() => {
    // Fetch list of Pokémon (basic info: name + URL)
    fetch(`https://pokeapi.co/api/v2/pokemon?limit=51&offset=0`)
      .then((res) => res.json()) // Convert response to JSON
      .then((data) => {
        // Create an array of fetch requests for each Pokémon's detailed data
        const promises = data.results.map((p) =>
          fetch(p.url).then((res) => res.json()),
        );

        // Wait until ALL Pokémon details are fetched
        Promise.all(promises).then((fullData) => {
          // Save full Pokémon data into state
          setPokemons(fullData);
        });
      });
  }, []); // Empty dependency array → runs once when component mounts

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

        {/* Conditional rendering:
            - If loading → show loading message
            - Else → show Pokémon grid */}
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
          // Grid layout for Pokémon cards
          <div className="row g-4">
            {pokemons.map((pokemon) => (
              <div
                key={pokemon.name} // Unique key for React rendering
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
              >
                <article className="card h-100 shadow-sm border-0 pokemon-card">
                  <div className="card-body d-flex flex-column p-4">
                    {/* Pokémon Image */}
                    <div className="pokemon-image-wrap mb-3">
                      <img
                        src={pokemon.sprites.front_default}
                        alt={pokemon.name}
                        className="img-fluid"
                      />
                    </div>

                    {/* Name + ID */}
                    <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
                      <h2 className="h4 text-capitalize mb-0">
                        {pokemon.name}
                      </h2>
                      <span className="badge text-bg-primary">
                        #{pokemon.id}
                      </span>
                    </div>

                    {/* Pokémon Types */}
                    <p className="mb-2 small text-secondary">
                      <strong className="text-dark">Type:</strong>{" "}
                      {pokemon.types
                        .map((type) => type.type.name) // Extract type names
                        .join(", ")}{" "}
                      {/* Convert array to string */}
                    </p>

                    {/* Pokémon Abilities */}
                    <p className="mb-2 small text-secondary">
                      <strong className="text-dark">Abilities:</strong>{" "}
                      {pokemon.abilities
                        .map((ability) => ability.ability.name)
                        .join(", ")}
                    </p>

                    {/* Pokémon Moves (only first 5 for readability) */}
                    <p className="mb-0 small text-secondary">
                      <strong className="text-dark">Moves:</strong>{" "}
                      {pokemon.moves
                        .slice(0, 5) // Limit to first 5 moves
                        .map((move) => move.move.name)
                        .join(", ")}
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
