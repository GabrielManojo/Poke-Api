function PokemonGrid({
  isGridLoading,
  sortedPokemons,
  onSelectPokemon,
  formatName,
  formatNumber,
}) {
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
                        onClick={() => onSelectPokemon(pokemon)}
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
                        <span
                          key={type.type.name}
                          className={`type-chip type-${type.type.name}`}
                        >
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

export default PokemonGrid;
