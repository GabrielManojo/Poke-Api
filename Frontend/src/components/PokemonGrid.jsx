// Import the separate TeamSidebar component so this file only handles the grid.
import { useState } from "react";
import TeamSidebar from "./TeamSidebar";
import TeamWeaknessSidebar from "./TeamWeaknessSidebar";
import SearchBar from "./SearchBar";
import { useSearch, PAGE_SIZE } from "../hooks/useSearch";

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
  formatName, // Converts "mr-mime" ? "Mr Mime".
  formatNumber, // Converts 1 ? "#0001".
  onLoadMorePokemons, // Fetches the next server page of pokemon.
  hasMorePokemons, // True while there are more pokemon on the server.
  isLoadingMorePokemons, // True while the next server page is loading.
  loadedPokemonCount, // Number currently loaded into the frontend state.
  totalPokemons, // Max total configured by backend (typically 1025).
}) {
  // Build a Set of IDs so checking "is this Pokemon already in the team?"
  // is an O(1) operation instead of looping the array every render.
  const teamIds = new Set(teamPokemons.map((pokemon) => pokemon.id));

  // Used to disable every "Add to my team" button once 6 members are chosen.
  const isTeamFull = teamPokemons.length >= teamLimit;

  // Search/filter state and the derived filtered list.
  // Filtering happens client-side — all pokemon are already in sortedPokemons.
  const {
    nameQuery,
    setNameQuery,
    selectedTypes,
    toggleType,
    legendaryOnly,
    setLegendaryOnly,
    filteredPokemons,
    clearSearch,
    isFiltered,
  } = useSearch(sortedPokemons);

  // How many pokemon are currently visible in the grid.
  // Starts at PAGE_SIZE and grows by PAGE_SIZE each time the user clicks "Load more".
  // Resets to PAGE_SIZE when a filter action is triggered.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Reset pagination when the name query changes.
  const handleNameChange = (nextQuery) => {
    setNameQuery(nextQuery);
    setVisibleCount(PAGE_SIZE);
  };

  // Reset pagination when any type chip is toggled.
  const handleToggleType = (typeName) => {
    toggleType(typeName);
    setVisibleCount(PAGE_SIZE);
  };

  // Reset pagination when legendary-only filter is toggled.
  const handleToggleLegendary = () => {
    setLegendaryOnly((prev) => !prev);
    setVisibleCount(PAGE_SIZE);
  };

  // Reset pagination when all filters are cleared.
  const handleClearSearch = () => {
    clearSearch();
    setVisibleCount(PAGE_SIZE);
  };

  // The slice of the filtered list that is actually rendered right now.
  const visiblePokemons = filteredPokemons.slice(0, visibleCount);

  // True when there are more pokemon beyond the current visible window.
  const hasMore = visibleCount < filteredPokemons.length;

  // Appends one more page of results.
  // If we've already displayed all locally loaded pokemon, ask the backend
  // for the next server page first (151 more), then reveal the next UI page.
  const loadMore = async () => {
    const hasLocalMore = visibleCount < filteredPokemons.length;

    if (hasLocalMore) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      return;
    }

    if (hasMorePokemons && !isLoadingMorePokemons) {
      await onLoadMorePokemons();
    }

    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Keep the same button visible when we can either show more local cards
  // or fetch more pokemon from the server.
  const canLoadMore = hasMore || hasMorePokemons;

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
          {/* -- LEFT: Pokemon catalog grid ----------------------------- */}
          <section className="col-12 col-xl-8">
            {/* Page header centred above the card grid. */}
            <div className="row justify-content-center mb-4">
              <div className="col-12 text-center">
                <h1 className="display-5 fw-bold mb-3">Pokedex</h1>
                <p className="lead text-secondary mb-0 px-lg-5">
                  Click a Pokemon image to open the detailed layout.
                </p>
                <p className="small text-secondary mt-2 mb-0">
                  Loaded {loadedPokemonCount} / {totalPokemons || 1025}
                </p>
              </div>
            </div>

            {/* -- Search & filter bar ------------------------------------- */}
            {/* Only shown once data is loaded so we don't filter an empty list. */}
            {!isGridLoading && (
              <SearchBar
                nameQuery={nameQuery}
                onNameChange={handleNameChange}
                selectedTypes={selectedTypes}
                onToggleType={handleToggleType}
                legendaryOnly={legendaryOnly}
                onToggleLegendary={handleToggleLegendary}
                onClear={handleClearSearch}
                isFiltered={isFiltered}
                resultCount={filteredPokemons.length}
                totalCount={sortedPokemons.length}
              />
            )}

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
                {/* Render only the visible slice; "Load more" extends it. */}
                {visiblePokemons.map((pokemon) => {
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

            {/* -- Load more button ---------------------------------------- */}
            {/* Only shown when there are more results beyond the current page. */}
            {!isGridLoading && canLoadMore && (
              <div className="load-more-wrapper mt-4 text-center">
                <button
                  type="button"
                  className="btn btn-outline-primary load-more-btn"
                  onClick={loadMore}
                  disabled={isLoadingMorePokemons}
                >
                  {isLoadingMorePokemons
                    ? "Loading 151 more..."
                    : hasMore
                      ? "Load more"
                      : "Load 151 more"}
                  <span className="text-secondary ms-2 small">
                    ({visibleCount} / {filteredPokemons.length})
                  </span>
                </button>
              </div>
            )}
          </section>

          {/* -- MIDDLE-RIGHT: Sticky team sidebar -------------------------- */}
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
          {/* -- RIGHT: Weakness sidebar (other side of team) -------------- */}
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
