// Import the separate TeamSidebar component so this file only handles the grid.
import TeamSidebar from "./TeamSidebar";
import TeamWeaknessSidebar from "./TeamWeaknessSidebar";

// PokemonGrid is the main catalog screen.
// It receives all data and callback functions from App.jsx via props.
function PokemonGrid({
  isGridLoading, // true while the initial 1025-Pokemon fetch is in progress.
  sortedPokemons, // Full Pokemon array sorted by Pokédex ID.
  onSelectPokemon, // Opens the detail view for a single Pokemon.
  onAddToTeam, // Adds a Pokemon to the team sidebar.
  onRemoveFromTeam, // Removes a Pokemon from the team sidebar.
  teamPokemons, // Array of Pokemon objects the user has added.
  teamPokemonWeaknesses, // Per-member weakness data computed in App.jsx.
  teamWeaknesses, // Aggregated team-wide weakness counts.
  teamLimit, // Maximum allowed team size (6).
  formatName, // Converts "mr-mime" → "Mr Mime".
  formatNumber, // Converts 1 → "#0001".
}) {
  // Build a Set of IDs so checking "is this Pokemon already in the team?"
  // is an O(1) operation instead of looping the array every render.
  const teamIds = new Set(teamPokemons.map((pokemon) => pokemon.id));

  // Used to disable every "Add to my team" button once 6 members are chosen.
  const isTeamFull = teamPokemons.length >= teamLimit;

  return (
    // app-shell applies the full-height gradient background.
    <main className="app-shell py-5">
      {/* container centres the layout and adds horizontal padding. */}
      <div className="container">
        {/*
          Recent change:
          Layout is now split into 3 desktop columns:
          1) Main Pokemon grid
          2) Team card
          3) Weakness analysis card
          This keeps both sidebars visible without stacking into one long panel.
        */}
        <div className="row g-4 align-items-start">
          {/* ── LEFT: Pokemon catalog grid ───────────────────────────── */}
          <section className="col-12 col-xl-8">
            {/* Page header centred above the card grid. */}
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

            {/*
              Show a loading alert while the API calls are in flight,
              then switch to the card grid once data is ready.
            */}
            {isGridLoading ? (
              <div className="row justify-content-center">
                <div className="col-12 col-md-8 col-lg-6">
                  {/* role="status" announces the message to screen readers. */}
                  <div
                    className="alert alert-light border text-center shadow-sm mb-0"
                    role="status"
                  >
                    Loading Pokemon cards...
                  </div>
                </div>
              </div>
            ) : (
              // Responsive grid: 1 col on xs, 2 on sm, 3 on lg, 4 on xxl.
              <div className="row g-4">
                {sortedPokemons.map((pokemon) => {
                  // Check the Set so the button reacts instantly without re-fetching.
                  const isInTeam = teamIds.has(pokemon.id);

                  return (
                    // Each Pokemon gets its own Bootstrap column.
                    <div
                      key={pokemon.name} // Unique key lets React track list items efficiently.
                      className="col-12 col-sm-6 col-lg-4 col-xxl-3"
                    >
                      {/* pokemon-card adds hover lift animation via CSS. */}
                      <article className="card h-100 shadow-sm border-0 pokemon-card">
                        {/* d-flex flex-column makes the card body stretch to equal height. */}
                        <div className="card-body d-flex flex-column p-3">
                          {/* Clicking the image opens the full detail view. */}
                          <div className="pokemon-image-wrap mb-3">
                            <button
                              type="button"
                              className="pokemon-image-button" // Resets browser button styles.
                              onClick={() => onSelectPokemon(pokemon)} // Triggers detail load in App.
                            >
                              <img
                                src={pokemon.sprites.front_default} // Front sprite from PokeAPI.
                                alt={pokemon.name} // Accessible alt text.
                                className="img-fluid"
                              />
                            </button>
                          </div>

                          {/* Pokédex number formatted as "#0001". */}
                          <p className="small text-secondary mb-1 pokemon-number">
                            {formatNumber(pokemon.id)}
                          </p>

                          {/* Pokemon name formatted for readability. */}
                          <h2 className="h4 mb-2">
                            {formatName(pokemon.name)}
                          </h2>

                          {/* mt-auto pushes type chips to the bottom of equal-height cards. */}
                          <div className="type-row mt-auto mb-3">
                            {/* Render one colour-coded chip per type (e.g. Fire, Water). */}
                            {pokemon.types.map((type) => (
                              <span
                                key={type.type.name} // Unique key per type.
                                className={`type-chip type-${type.type.name}`} // CSS colours the chip.
                              >
                                {formatName(type.type.name)}
                              </span>
                            ))}
                          </div>

                          {/*
                            Add to my team button.
                            Disabled when the Pokemon is already on the team (isInTeam)
                            or when all 6 slots are filled (isTeamFull).
                            The label switches to "Added" once the Pokemon is on the team.
                          */}
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

          {/* ── MIDDLE-RIGHT: Sticky team sidebar ────────────────────────── */}
          {/*
            The aside lives outside the main grid section so it can be
            positioned sticky independently. All sidebar logic lives in
            TeamSidebar.jsx — we just forward the props it needs.
          */}
          <aside className="col-12 col-md-6 col-xl-2 grid-sidebar">
            <TeamSidebar
              teamPokemons={teamPokemons} // Current team members.
              teamLimit={teamLimit} // Maximum 6 slots.
              onRemoveFromTeam={onRemoveFromTeam} // Remove callback from App.
              formatName={formatName} // Name formatter helper.
            />
          </aside>

          {/*
            Recent change:
            Weaknesses live in their own sidebar component on the far right,
            separated from the Team card for better readability.
          */}
          {/* ── RIGHT: Weakness sidebar (other side of team) ────────────── */}
          <aside className="col-12 col-md-6 col-xl-2 grid-sidebar">
            <TeamWeaknessSidebar
              teamPokemonWeaknesses={teamPokemonWeaknesses}
              teamWeaknesses={teamWeaknesses}
              formatName={formatName}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

export default PokemonGrid;
