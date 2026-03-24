import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  // Stores all Pokemon returned from the API.
  const [pokemons, setPokemons] = useState([]);
  // Stores the currently selected Pokemon for the detail page.
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  // Stores extra detail-only data (weaknesses + evolution cards).
  const [detailData, setDetailData] = useState(null);
  // Controls loading state for the grid layout.
  const [isGridLoading, setIsGridLoading] = useState(true);
  // Controls loading state for the detail layout.
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  // Shows API error messages in the UI.
  const [errorMessage, setErrorMessage] = useState("");

  // Runs once on first render to fetch the Pokemon list + base details.
  useEffect(() => {
    // Fetches Pokemon list, then fetches each Pokemon full data.
    async function fetchPokemons() {
      try {
        // Request all Pokemon references (name + URL).
        const res = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0",
        );

        // If HTTP status is not OK, stop and go to catch block.
        if (!res.ok) {
          throw new Error("Could not load Pokemon list.");
        }

        // Convert list response to JSON.
        const data = await res.json();
        // Fetch all Pokemon detail endpoints in parallel.
        const fullPokemonData = await Promise.all(
          data.results.map(async (p) => {
            // Request one Pokemon detail object.
            const pokemonRes = await fetch(p.url);

            // If one Pokemon fails, fail the full operation.
            if (!pokemonRes.ok) {
              throw new Error("Could not load Pokemon details.");
            }

            // Convert detail response to JSON.
            const pokemonData = await pokemonRes.json();
            // Return this Pokemon object into the Promise.all result array.
            return pokemonData;
          }),
        );

        // Save all Pokemon into component state.
        setPokemons(fullPokemonData);
      } catch {
        // If any fetch fails, show a user-friendly message.
        setErrorMessage("Could not load Pokemon data.");
      } finally {
        // Stop grid loading spinner whether success or failure.
        setIsGridLoading(false);
      }
    }

    // Start the initial fetch operation.
    fetchPokemons();
  }, []);

  // Keep Pokemon list sorted by ID for stable display order.
  const sortedPokemons = useMemo(
    () => [...pokemons].sort((a, b) => a.id - b.id),
    [pokemons],
  );

  // Converts names like "mr-mime" into "Mr Mime".
  const formatName = (name) =>
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  // Converts numeric ID into #0001 format.
  const formatNumber = (id) => `#${String(id).padStart(4, "0")}`;

  // Recursively walks evolution chain and returns all species names.
  const extractEvolutionNames = (node) => {
    // Start with the current species.
    const names = [node.species.name];
    // If this species has no further evolutions, return now.
    if (!node.evolves_to.length) {
      return names;
    }

    // Return current species + all names from next evolution nodes.
    return [
      ...names,
      ...node.evolves_to.flatMap((nextNode) => extractEvolutionNames(nextNode)),
    ];
  };

  // Opens detail layout and loads extra detail data for one Pokemon.
  const openPokemonDetail = async (pokemon) => {
    // Save the clicked Pokemon immediately.
    setSelectedPokemon(pokemon);
    // Reset old detail data while new detail data loads.
    setDetailData(null);
    // Enable detail loading state.
    setIsDetailLoading(true);
    // Clear any previous errors.
    setErrorMessage("");

    try {
      // Fetch species to get evolution chain URL.
      const speciesRes = await fetch(pokemon.species.url);
      // Fail fast if species fetch fails.
      if (!speciesRes.ok) {
        throw new Error("Could not load species data.");
      }

      // Parse species JSON.
      const speciesData = await speciesRes.json();
      // Fetch evolution chain using species-provided URL.
      const evolutionRes = await fetch(speciesData.evolution_chain.url);
      // Fail fast if evolution fetch fails.
      if (!evolutionRes.ok) {
        throw new Error("Could not load evolution chain.");
      }

      // Parse evolution chain JSON.
      const evolutionData = await evolutionRes.json();
      // Fetch each Pokemon type endpoint to compute weaknesses.
      const typeResponses = await Promise.all(
        pokemon.types.map((entry) => fetch(entry.type.url)),
      );

      // Parse all type responses.
      const typeData = await Promise.all(
        typeResponses.map((response) => response.json()),
      );

      // Collect unique type names that deal double damage to this Pokemon.
      const weaknessNames = [
        ...new Set(
          typeData.flatMap((entry) =>
            entry.damage_relations.double_damage_from.map((type) => type.name),
          ),
        ),
      ];

      // Build a unique list of Pokemon names in the evolution chain.
      const evolutionNames = [
        ...new Set(extractEvolutionNames(evolutionData.chain)),
      ];
      // Fetch each evolution Pokemon to display image + number.
      const evolutionPokemons = await Promise.all(
        evolutionNames.map(async (name) => {
          // Request one evolution Pokemon by name.
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${name}`,
          );
          // Parse the evolution Pokemon JSON.
          const evoPokemon = await response.json();
          // Return the small subset used by your evolution UI.
          return {
            id: evoPokemon.id,
            name: evoPokemon.name,
            image: evoPokemon.sprites.front_default,
            types: evoPokemon.types.map((t) => t.type.name),
          };
        }),
      );

      // Save all detail-only information for the selected Pokemon.
      setDetailData({
        weaknesses: weaknessNames,
        evolutionPokemons,
      });
    } catch {
      // Show a friendly message if any detail request fails.
      setErrorMessage("Could not load Pokemon detail view.");
    } finally {
      // End detail loading state.
      setIsDetailLoading(false);
    }
  };

  // Returns from detail layout back to grid layout.
  const closePokemonDetail = () => {
    // Clear selected Pokemon.
    setSelectedPokemon(null);
    // Clear detail data.
    setDetailData(null);
    // Clear error message.
    setErrorMessage("");
  };

  // Layout 1: detail loading screen while detail data is being fetched.
  if (isDetailLoading && selectedPokemon) {
    return (
      <main className="app-shell py-5">
        <div className="container detail-view">
          {/* Button to go back to the card grid. */}
          <button
            className="btn btn-outline-secondary mb-4"
            onClick={closePokemonDetail}
          >
            Back to grid
          </button>
          {/* Loading indicator specific to selected Pokemon detail view. */}
          <div
            className="alert alert-light border text-center mb-0"
            role="status"
          >
            Loading detail for {formatName(selectedPokemon.name)}...
          </div>
        </div>
      </main>
    );
  }

  // Layout 2: full Pokemon detail page when selectedPokemon + detailData exist.
  if (selectedPokemon && detailData) {
    return (
      <main className="app-shell py-5">
        <div className="container detail-view">
          {/* Button to return to grid layout. */}
          <button
            className="btn btn-outline-secondary mb-4"
            onClick={closePokemonDetail}
          >
            Back to grid
          </button>

          {/* Card that wraps all detail content. */}
          <section className="card border-0 shadow-sm detail-card">
            <div className="card-body p-4 p-lg-5">
              {/* Pokemon title with formatted name and number. */}
              <h1 className="h2 mb-4">
                {formatName(selectedPokemon.name)}{" "}
                {formatNumber(selectedPokemon.id)}
              </h1>

              {/* Top detail row: image (left) and meta info (right). */}
              <div className="row g-4 align-items-start">
                <div className="col-12 col-lg-5">
                  {/* Official artwork with fallback to default sprite. */}
                  <div className="detail-image-wrap">
                    <img
                      src={
                        selectedPokemon.sprites.other["official-artwork"]
                          .front_default ||
                        selectedPokemon.sprites.front_default
                      }
                      alt={selectedPokemon.name}
                      className="img-fluid"
                    />
                  </div>
                </div>

                <div className="col-12 col-lg-7">
                  {/* Blue panel with height, weight, and abilities. */}
                  <div className="detail-meta-grid mb-4">
                    <div>
                      <p className="detail-label mb-1">Height</p>
                      {/* API height is decimeters, so divide by 10 for meters. */}
                      <p className="mb-0">
                        {(selectedPokemon.height / 10).toFixed(1)} m
                      </p>
                    </div>
                    <div>
                      <p className="detail-label mb-1">Weight</p>
                      {/* API weight is hectograms, so divide by 10 for kilograms. */}
                      <p className="mb-0">
                        {(selectedPokemon.weight / 10).toFixed(1)} kg
                      </p>
                    </div>
                    <div className="meta-span-2">
                      <p className="detail-label mb-1">Abilities</p>
                      {/* Join ability names into a readable string. */}
                      <p className="mb-0">
                        {selectedPokemon.abilities
                          .map((ability) => formatName(ability.ability.name))
                          .join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Pokemon type chips. */}
                  <div className="mb-4">
                    <p className="detail-label mb-2">Type</p>
                    <div className="type-row">
                      {selectedPokemon.types.map((type) => (
                        <span key={type.type.name} className="type-chip">
                          {formatName(type.type.name)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Weakness chips computed from double_damage_from. */}
                  <div className="mb-0">
                    <p className="detail-label mb-2">
                      Weaknesses (double damage from)
                    </p>
                    <div className="type-row">
                      {detailData.weaknesses.map((name) => (
                        <span key={name} className="weakness-chip">
                          {formatName(name)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Base stats section with progress bars. */}
              <section className="mt-4">
                <p className="detail-label mb-3">Stats</p>
                <div className="stat-list">
                  {selectedPokemon.stats.map((stat) => (
                    // Render one row per stat.
                    <div key={stat.stat.name} className="stat-row">
                      <span className="stat-name">
                        {formatName(stat.stat.name)}
                      </span>
                      {/* Width scales stat value to a 0-200 range. */}
                      <div
                        className="progress stat-progress"
                        role="progressbar"
                        aria-valuenow={stat.base_stat}
                        aria-valuemin="0"
                        aria-valuemax="200"
                      >
                        <div
                          className="progress-bar"
                          style={{
                            width: `${Math.min((stat.base_stat / 200) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="stat-value">{stat.base_stat}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Evolution path section with image cards for each stage. */}
              <section className="mt-4">
                <p className="detail-label mb-3">Evolution Path</p>
                <div className="evolution-strip">
                  {detailData.evolutionPokemons.map((evo) => (
                    // Render one evolution stage card.
                    <article key={evo.id} className="evolution-card">
                      <img
                        src={evo.image}
                        alt={evo.name}
                        className="img-fluid"
                      />
                      <p className="mb-0 small fw-semibold">
                        {formatName(evo.name)}
                      </p>
                      <p className="mb-0 x-small text-secondary">
                        {formatNumber(evo.id)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // Layout 3: grid-level error screen when initial fetch fails.
  if (errorMessage && !selectedPokemon) {
    return (
      <main className="app-shell py-5">
        <div className="container">
          {/* Shows the last API-related error message. */}
          <div className="alert alert-danger mb-0" role="alert">
            {errorMessage}
          </div>
        </div>
      </main>
    );
  }

  // Layout 4: default Pokemon grid view.
  return (
    <main className="app-shell py-5">
      <div className="container">
        {/* Header section for the grid view. */}
        <div className="row justify-content-center mb-5">
          <div className="col-12 col-xl-8 text-center">
            <p className="text-uppercase fw-semibold text-secondary mb-2 app-eyebrow">
              Pokedex Layout
            </p>
            <h1 className="display-5 fw-bold mb-3">Pokemon Grid</h1>
            <p className="lead text-secondary mb-0 px-lg-5">
              Click a Pokemon image to open the detailed layout.
            </p>
          </div>
        </div>

        {/* While list is loading, show loading alert. */}
        {isGridLoading ? (
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
          // Once loading finishes, show the responsive Pokemon card grid.
          <div className="row g-4">
            {sortedPokemons.map((pokemon) => (
              <div
                key={pokemon.name}
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
              >
                {/* One card per Pokemon. */}
                <article className="card h-100 shadow-sm border-0 pokemon-card">
                  <div className="card-body d-flex flex-column p-3">
                    <div className="pokemon-image-wrap mb-3">
                      {/* Click image to open this Pokemon detail layout. */}
                      <button
                        type="button"
                        className="pokemon-image-button"
                        onClick={() => openPokemonDetail(pokemon)}
                      >
                        <img
                          src={pokemon.sprites.front_default}
                          alt={pokemon.name}
                          className="img-fluid"
                        />
                      </button>
                    </div>

                    {/* Number and name shown in card body. */}
                    <p className="small text-secondary mb-1 pokemon-number">
                      {formatNumber(pokemon.id)}
                    </p>
                    <h2 className="h4 mb-2">{formatName(pokemon.name)}</h2>
                    {/* Type badges. */}
                    <div className="type-row mt-auto">
                      {pokemon.types.map((type) => (
                        <span key={type.type.name} className="type-chip">
                          {formatName(type.type.name)}
                        </span>
                      ))}
                    </div>
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

// Export component so it can be rendered by main.jsx.
export default App;
