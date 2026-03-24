import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  const [pokemons, setPokemons] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [isGridLoading, setIsGridLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function fetchPokemons() {
      try {
        const res = await fetch(
          "https://pokeapi.co/api/v2/pokemon?limit=151&offset=0",
        );

        if (!res.ok) {
          throw new Error("Could not load Pokemon list.");
        }

        const data = await res.json();
        const fullPokemonData = await Promise.all(
          data.results.map(async (p) => {
            const pokemonRes = await fetch(p.url);

            if (!pokemonRes.ok) {
              throw new Error("Could not load Pokemon details.");
            }

            const pokemonData = await pokemonRes.json();
            return pokemonData;
          }),
        );

        setPokemons(fullPokemonData);
      } catch {
        setErrorMessage("Could not load Pokemon data.");
      } finally {
        setIsGridLoading(false);
      }
    }

    fetchPokemons();
  }, []);

  const sortedPokemons = useMemo(
    () => [...pokemons].sort((a, b) => a.id - b.id),
    [pokemons],
  );

  const formatName = (name) =>
    name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const formatNumber = (id) => `#${String(id).padStart(4, "0")}`;

  const extractEvolutionNames = (node) => {
    const names = [node.species.name];
    if (!node.evolves_to.length) {
      return names;
    }

    return [
      ...names,
      ...node.evolves_to.flatMap((nextNode) => extractEvolutionNames(nextNode)),
    ];
  };

  const openPokemonDetail = async (pokemon) => {
    setSelectedPokemon(pokemon);
    setDetailData(null);
    setIsDetailLoading(true);
    setErrorMessage("");

    try {
      const speciesRes = await fetch(pokemon.species.url);
      if (!speciesRes.ok) {
        throw new Error("Could not load species data.");
      }

      const speciesData = await speciesRes.json();
      const evolutionRes = await fetch(speciesData.evolution_chain.url);
      if (!evolutionRes.ok) {
        throw new Error("Could not load evolution chain.");
      }

      const evolutionData = await evolutionRes.json();
      const typeResponses = await Promise.all(
        pokemon.types.map((entry) => fetch(entry.type.url)),
      );

      const typeData = await Promise.all(
        typeResponses.map((response) => response.json()),
      );

      const weaknessNames = [
        ...new Set(
          typeData.flatMap((entry) =>
            entry.damage_relations.double_damage_from.map((type) => type.name),
          ),
        ),
      ];

      const evolutionNames = [
        ...new Set(extractEvolutionNames(evolutionData.chain)),
      ];
      const evolutionPokemons = await Promise.all(
        evolutionNames.map(async (name) => {
          const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${name}`,
          );
          const evoPokemon = await response.json();
          return {
            id: evoPokemon.id,
            name: evoPokemon.name,
            image: evoPokemon.sprites.front_default,
            types: evoPokemon.types.map((t) => t.type.name),
          };
        }),
      );

      setDetailData({
        weaknesses: weaknessNames,
        evolutionPokemons,
      });
    } catch {
      setErrorMessage("Could not load Pokemon detail view.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closePokemonDetail = () => {
    setSelectedPokemon(null);
    setDetailData(null);
    setErrorMessage("");
  };

  if (isDetailLoading && selectedPokemon) {
    return (
      <main className="app-shell py-5">
        <div className="container detail-view">
          <button
            className="btn btn-outline-secondary mb-4"
            onClick={closePokemonDetail}
          >
            Back to grid
          </button>
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

  if (selectedPokemon && detailData) {
    return (
      <main className="app-shell py-5">
        <div className="container detail-view">
          <button
            className="btn btn-outline-secondary mb-4"
            onClick={closePokemonDetail}
          >
            Back to grid
          </button>

          <section className="card border-0 shadow-sm detail-card">
            <div className="card-body p-4 p-lg-5">
              <h1 className="h2 mb-4">
                {formatName(selectedPokemon.name)}{" "}
                {formatNumber(selectedPokemon.id)}
              </h1>

              <div className="row g-4 align-items-start">
                <div className="col-12 col-lg-5">
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
                  <div className="detail-meta-grid mb-4">
                    <div>
                      <p className="detail-label mb-1">Height</p>
                      <p className="mb-0">
                        {(selectedPokemon.height / 10).toFixed(1)} m
                      </p>
                    </div>
                    <div>
                      <p className="detail-label mb-1">Weight</p>
                      <p className="mb-0">
                        {(selectedPokemon.weight / 10).toFixed(1)} kg
                      </p>
                    </div>
                    <div className="meta-span-2">
                      <p className="detail-label mb-1">Abilities</p>
                      <p className="mb-0">
                        {selectedPokemon.abilities
                          .map((ability) => formatName(ability.ability.name))
                          .join(", ")}
                      </p>
                    </div>
                  </div>

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

              <section className="mt-4">
                <p className="detail-label mb-3">Stats</p>
                <div className="stat-list">
                  {selectedPokemon.stats.map((stat) => (
                    <div key={stat.stat.name} className="stat-row">
                      <span className="stat-name">
                        {formatName(stat.stat.name)}
                      </span>
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

              <section className="mt-4">
                <p className="detail-label mb-3">Evolution Path</p>
                <div className="evolution-strip">
                  {detailData.evolutionPokemons.map((evo) => (
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

  if (errorMessage && !selectedPokemon) {
    return (
      <main className="app-shell py-5">
        <div className="container">
          <div className="alert alert-danger mb-0" role="alert">
            {errorMessage}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell py-5">
      <div className="container">
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
          <div className="row g-4">
            {sortedPokemons.map((pokemon) => (
              <div
                key={pokemon.name}
                className="col-12 col-sm-6 col-lg-4 col-xl-3"
              >
                <article className="card h-100 shadow-sm border-0 pokemon-card">
                  <div className="card-body d-flex flex-column p-3">
                    <div className="pokemon-image-wrap mb-3">
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

                    <p className="small text-secondary mb-1 pokemon-number">
                      {formatNumber(pokemon.id)}
                    </p>
                    <h2 className="h4 mb-2">{formatName(pokemon.name)}</h2>
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

export default App;
