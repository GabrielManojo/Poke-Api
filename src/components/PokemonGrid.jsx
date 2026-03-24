function PokemonGrid({
  isGridLoading,
  sortedPokemons,
  onSelectPokemon,
  onAddToTeam,
  onRemoveFromTeam,
  teamPokemons,
  teamWeaknesses,
  teamLimit,
  formatName,
  formatNumber,
}) {
  // Set-based checks make "already added" lookups O(1) during rendering.
  const teamIds = new Set(teamPokemons.map((pokemon) => pokemon.id));
  const isTeamFull = teamPokemons.length >= teamLimit;
  const pokeBallImage =
    "https://www.clipartmax.com/png/small/129-1298390_pokeball-transparent-png-pokeball-png-pokemon-go.png";

  return (
    <main className="app-shell py-5">
      <div className="container">
        <div className="row g-4 align-items-start">
          {/* Main content area: Pokemon catalog cards. */}
          <section className="col-12 col-xl-9">
            <div className="row justify-content-center mb-5">
              <div className="col-12 text-center">
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
                {sortedPokemons.map((pokemon) => {
                  const isInTeam = teamIds.has(pokemon.id);

                  return (
                    <div
                      key={pokemon.name}
                      className="col-12 col-sm-6 col-lg-4 col-xxl-3"
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
                          <h2 className="h4 mb-2">
                            {formatName(pokemon.name)}
                          </h2>
                          <div className="type-row mt-auto mb-3">
                            {pokemon.types.map((type) => (
                              <span
                                key={type.type.name}
                                className={`type-chip type-${type.type.name}`}
                              >
                                {formatName(type.type.name)}
                              </span>
                            ))}
                          </div>

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => onAddToTeam(pokemon)}
                            disabled={isInTeam || isTeamFull}
                          >
                            {isInTeam ? "Added" : "Add to my team"}
                          </button>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Right sidebar: six team slots + aggregated weakness summary. */}
          <aside className="col-12 col-xl-3">
            <section className="card border-0 shadow-sm team-sidebar sticky-xl-top">
              <div className="card-body p-3 p-lg-4">
                <h2 className="h4 mb-1">Your Team</h2>
                <p className="text-secondary small mb-3">
                  {teamPokemons.length}/{teamLimit} slots filled
                </p>

                <div className="team-slots mb-4">
                  {Array.from({ length: teamLimit }).map((_, index) => {
                    // Team is displayed by slot index so empty positions still render as Pokeballs.
                    const teamPokemon = teamPokemons[index];

                    return (
                      <article
                        key={`team-slot-${index}`}
                        className="team-slot"
                        aria-label={`Team slot ${index + 1}`}
                      >
                        <img
                          src={
                            teamPokemon
                              ? teamPokemon.sprites.front_default
                              : pokeBallImage
                          }
                          alt={
                            teamPokemon
                              ? teamPokemon.name
                              : "Empty Pokeball slot"
                          }
                          className="team-slot-image"
                        />
                        <div className="team-slot-copy">
                          <p className="mb-0 small fw-semibold">
                            {teamPokemon
                              ? formatName(teamPokemon.name)
                              : `Empty Slot ${index + 1}`}
                          </p>
                          {teamPokemon ? (
                            <button
                              type="button"
                              className="btn btn-link btn-sm p-0 team-remove-btn"
                              onClick={() => onRemoveFromTeam(teamPokemon.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div>
                  <p className="detail-label mb-2">Team Weaknesses</p>
                  {teamWeaknesses.length ? (
                    <div className="type-row">
                      {teamWeaknesses.map((weakness) => (
                        <span
                          key={weakness.name}
                          className={`weakness-chip type-${weakness.name}`}
                        >
                          {formatName(weakness.name)} x{weakness.count}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="small text-secondary mb-0">
                      Add Pokemon to see shared weaknesses.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default PokemonGrid;
