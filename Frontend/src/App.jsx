// App.jsx is intentionally thin — all state and data-fetching logic lives in
// dedicated custom hooks. This file only wires hooks together and decides which
// top-level view to render.
import "./App.css";
import DetailLoading from "./components/DetailLoading";
import ErrorState from "./components/ErrorState";
import PokemonDetail from "./components/PokemonDetail";
import PokemonGrid from "./components/PokemonGrid";
import { usePokemonList } from "./hooks/usePokemonList";
import { usePokemonDetail } from "./hooks/usePokemonDetail";
import { useTeamManager } from "./hooks/useTeamManager";
import { formatName, formatNumber } from "./utils/pokemonUtils";

function App() {
  // Fetches and sorts the full Pokédex from our backend.
  const {
    sortedPokemons,
    isGridLoading,
    errorMessage: listError,
    loadMorePokemons,
    hasMorePokemons,
    isLoadingMorePokemons,
    loadedPokemonCount,
    totalPokemons,
  } = usePokemonList();

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
    />
  );
}

export default App;
