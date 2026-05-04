import { ALL_TYPES } from "../hooks/useSearch";

// SearchBar renders a name input, clickable type-chip toggles, and a clear button.
// Multiple type chips can be active at once — a pokemon must have ALL active types.
// All state lives in the useSearch hook; this component is purely presentational.
function SearchBar({
  nameQuery, // Current text in the name input.
  onNameChange, // Called with the new string on every keystroke.
  selectedTypes, // Set of currently active type name strings.
  onToggleType, // Called with a type name to toggle it on/off.
  legendaryOnly, // True when only legendary pokemon should be displayed.
  onToggleLegendary, // Toggles legendary-only mode.
  onClear, // Resets all filters.
  isFiltered, // True when at least one filter is active.
  resultCount, // Number of pokemon currently visible.
  totalCount, // Total pokemon in the full list.
}) {
  return (
    <div className="search-bar-wrapper mb-4">
      {/* -- Row 1: name input + status controls ----------------------- */}
      <div className="row g-2 align-items-end mb-3">
        <div className="col-12 col-md-7">
          <label
            htmlFor="pokemon-name-search"
            className="form-label small fw-semibold mb-1"
          >
            Search by name
          </label>
          <div className="input-group">
            {/* Magnifier icon merged into the left side of the input. */}
            <span className="input-group-text bg-white border-end-0 search-icon-addon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                fill="currentColor"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </span>
            <input
              id="pokemon-name-search"
              type="search"
              className="form-control border-start-0 search-input"
              placeholder="e.g. Bulbasaur"
              value={nameQuery}
              onChange={(e) => onNameChange(e.target.value)}
              aria-label="Search Pokemon by name"
            />
          </div>
        </div>

        {/* Clear + result count, right-aligned on desktop. */}
        <div className="col-12 col-md-5 d-flex align-items-end justify-content-md-end gap-2 flex-wrap">
          <button
            type="button"
            className={`btn btn-sm ${legendaryOnly ? "btn-warning" : "btn-outline-warning"} search-legendary-btn`}
            onClick={onToggleLegendary}
            aria-pressed={legendaryOnly}
          >
            {legendaryOnly ? "Legendary: On" : "Show Legendaries"}
          </button>

          {isFiltered && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm search-clear-btn"
              onClick={onClear}
            >
              Clear all
            </button>
          )}
          {isFiltered && (
            <span className="text-secondary small search-result-count align-self-center">
              {resultCount} / {totalCount} shown
            </span>
          )}
        </div>
      </div>

      {/* -- Row 2: type chip toggles ----------------------------------- */}
      <div>
        <p className="small fw-semibold mb-2 search-type-label">
          Filter by type
          {selectedTypes.size > 0 && (
            // Subtitle hint so users understand AND behaviour.
            <span className="text-secondary fw-normal ms-2">
              (must have all selected types)
            </span>
          )}
        </p>
        {/* One chip per type — active chips are visually highlighted. */}
        <div className="type-filter-chips">
          {ALL_TYPES.map((type) => {
            const isActive = selectedTypes.has(type);
            return (
              <button
                key={type}
                type="button"
                // Apply the same colour class used on pokemon cards so
                // each chip gets its proper type colour when active.
                className={`type-filter-chip type-chip type-${type} ${isActive ? "type-filter-chip--active" : "type-filter-chip--inactive"}`}
                onClick={() => onToggleType(type)}
                aria-pressed={isActive}
                aria-label={`Filter by ${type} type`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* No-results message when filters eliminate everything. */}
      {isFiltered && resultCount === 0 && (
        <p className="text-secondary small mt-3 mb-0 search-no-results">
          No Pokemon match your search. Try a different name or type
          combination.
        </p>
      )}
    </div>
  );
}

export default SearchBar;
