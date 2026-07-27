// App.jsx is intentionally thin — all state and data-fetching logic lives in
// dedicated custom hooks. This file only wires hooks together and decides which
// top-level view to render.
import { useState } from "react";
import "./App.css";
import DetailLoading from "./components/DetailLoading";
import ErrorState from "./components/ErrorState";
import PokemonDetail from "./components/PokemonDetail";
import PokemonGrid from "./components/PokemonGrid";
import { usePokemonList } from "./hooks/usePokemonList";
import { usePokemonDetail } from "./hooks/usePokemonDetail";
import { useTeamManager } from "./hooks/useTeamManager";
import { formatName, formatNumber } from "./utils/pokemonUtils";
import { getGenerationById } from "./utils/generations";

function App() {
  // Which generation is selected in the grid ("All" = null). Owned here
  // (rather than inside useSearch) because it changes what usePokemonList
  // fetches from the backend, not just what's filtered from what's loaded.
  const [selectedGenerationId, setSelectedGenerationId] = useState(null);
  const selectedGeneration = getGenerationById(selectedGenerationId);

  // Fetches and sorts the selected Dex range from our backend.
  const {
    sortedPokemons,
    isGridLoading,
    errorMessage: listError,
    loadMorePokemons,
    hasMorePokemons,
    isLoadingMorePokemons,
    loadedPokemonCount,
    totalPokemons,
    searchPokemonByName,
    isSearchingByName,
    ensureLegendariesLoaded,
    isLoadingLegendaries,
  } = usePokemonList(selectedGeneration);

  // Manages team composition and computes weakness summaries.
  const {
    teamPokemons,
    teamPokemonWeaknesses,
    teamWeaknesses,
    teamLimit,
    addPokemonToTeam,
    removePokemonFromTeam,
  } = useTeamManager();

  // Manages which Pokemon is open in the detail view and loads its extra data.
  const {
    selectedPokemon,
    detailData,
    isDetailLoading,
    errorMessage: detailError,
    previousPokemon,
    nextPokemon,
    openPokemonDetail,
    openPokemonDetailByName,
    closePokemonDetail,
    openPreviousPokemon,
    openNextPokemon,
  } = usePokemonDetail(sortedPokemons);

  // Surface whichever error is active (list load error takes priority).
  const errorMessage = listError || detailError;

  // ── Render the correct top-level view ─────────────────────────────────────

  if (isDetailLoading && selectedPokemon) {
    return (
      <DetailLoading
        selectedPokemon={selectedPokemon}
        onBack={closePokemonDetail}
        onPrevious={openPreviousPokemon}
        onNext={openNextPokemon}
        hasPrevious={Boolean(previousPokemon)}
        hasNext={Boolean(nextPokemon)}
        formatName={formatName}
      />
    );
  }

  if (selectedPokemon && detailData) {
    return (
      <PokemonDetail
        selectedPokemon={selectedPokemon}
        detailData={detailData}
        onBack={closePokemonDetail}
        onPrevious={openPreviousPokemon}
        onNext={openNextPokemon}
        hasPrevious={Boolean(previousPokemon)}
        hasNext={Boolean(nextPokemon)}
        onSelectEvolution={openPokemonDetailByName}
        formatName={formatName}
        formatNumber={formatNumber}
      />
    );
  }

  if (errorMessage && !selectedPokemon) {
    return <ErrorState message={errorMessage} />;
  }

  return (
    <PokemonGrid
      isGridLoading={isGridLoading}
      sortedPokemons={sortedPokemons}
      onSelectPokemon={openPokemonDetail}
      onAddToTeam={addPokemonToTeam}
      onRemoveFromTeam={removePokemonFromTeam}
      teamPokemons={teamPokemons}
      teamPokemonWeaknesses={teamPokemonWeaknesses}
      teamWeaknesses={teamWeaknesses}
      teamLimit={teamLimit}
      formatName={formatName}
      formatNumber={formatNumber}
      onLoadMorePokemons={loadMorePokemons}
      hasMorePokemons={hasMorePokemons}
      isLoadingMorePokemons={isLoadingMorePokemons}
      loadedPokemonCount={loadedPokemonCount}
      totalPokemons={totalPokemons}
      selectedGenerationId={selectedGenerationId}
      onGenerationChange={setSelectedGenerationId}
      onSearchPokemon={searchPokemonByName}
      isSearchingByName={isSearchingByName}
      onEnsureLegendariesLoaded={ensureLegendariesLoaded}
      isLoadingLegendaries={isLoadingLegendaries}
    />
  );
}

export default App;
