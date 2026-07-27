import { GENERATIONS, getGenerationById } from "../utils/generations";
import { formatNumber } from "../utils/pokemonUtils";

// GenerationSelector renders an "All" chip plus one chip per main-series
// generation. Picking one re-scopes which Dex range usePokemonList fetches
// (see App.jsx), so this is rendered outside the isGridLoading gate in
// PokemonGrid — it needs to stay visible (and clickable) while a new
// generation's first page is loading.
function GenerationSelector({ selectedGenerationId, onSelect }) {
  const activeGeneration = getGenerationById(selectedGenerationId);

  return (
    <div className="generation-selector mb-4">
      <p className="small fw-semibold mb-2">Filter by generation</p>

      <div className="generation-chip-row d-flex flex-wrap gap-2">
        {/* "All" resets to the full Pokedex (range = null in usePokemonList). */}
        <button
          type="button"
          className={`btn btn-sm ${selectedGenerationId == null ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => onSelect(null)}
          aria-pressed={selectedGenerationId == null}
        >
          All
        </button>

        {GENERATIONS.map((gen) => {
          const isActive = selectedGenerationId === gen.id;
          return (
            <button
              key={gen.id}
              type="button"
              className={`btn btn-sm ${isActive ? "btn-primary" : "btn-outline-primary"}`}
              onClick={() => onSelect(gen.id)}
              aria-pressed={isActive}
              title={`${gen.region} · ${gen.games} · ${gen.years} · ${formatNumber(gen.start)}–${formatNumber(gen.end)}`}
            >
              Gen {gen.id}
            </button>
          );
        })}
      </div>

      {/* Small detail line for whichever generation is currently active. */}
      {activeGeneration && (
        <p className="small text-secondary mt-2 mb-0">
          {activeGeneration.label} ({activeGeneration.years}) — Region:{" "}
          {activeGeneration.region} · Core games: {activeGeneration.games} ·{" "}
          {formatNumber(activeGeneration.start)}–
          {formatNumber(activeGeneration.end)}
        </p>
      )}
    </div>
  );
}

export default GenerationSelector;
