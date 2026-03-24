function PokemonDetail({
  selectedPokemon,
  detailData,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  formatName,
  formatNumber,
}) {
  return (
    <main className="app-shell py-5">
      <div className="container detail-view">
        {/* Shared toolbar: go back to grid or move to neighboring Pokemon. */}
        <div className="detail-toolbar mb-4">
          <button className="btn btn-outline-secondary" onClick={onBack}>
            Back to grid
          </button>

          <div className="detail-nav-buttons">
            <button
              className="btn btn-outline-primary"
              onClick={onPrevious}
              disabled={!hasPrevious}
            >
              Previous Pokemon
            </button>
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={!hasNext}
            >
              Next Pokemon
            </button>
          </div>
        </div>

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
                        .front_default || selectedPokemon.sprites.front_default
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
                      <span
                        key={type.type.name}
                        className={`type-chip type-${type.type.name}`}
                      >
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
                      <span key={name} className={`weakness-chip type-${name}`}>
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
                  // Stats are normalized against 200 so bars remain visually comparable.
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
                    <img src={evo.image} alt={evo.name} className="img-fluid" />
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

export default PokemonDetail;
