// DetailLoading renders while the app is fetching extra detail data
// (weaknesses + evolution chain) for the selected Pokemon.
function DetailLoading({
  // Pokemon currently being opened in detail mode.
  selectedPokemon,
  // Returns user to the grid view.
  onBack,
  // Opens previous Pokemon detail.
  onPrevious,
  // Opens next Pokemon detail.
  onNext,
  // Enables/disables previous navigation.
  hasPrevious,
  // Enables/disables next navigation.
  hasNext,
  // Formats API names into readable display text.
  formatName,
}) {
  return (
    // Reuse same page shell used in grid/detail views for visual consistency.
    <main className="app-shell py-5">
      <div className="container detail-view">
        {/* Keep the same controls visible while detail data is loading. */}
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
        <div
          className="alert alert-light border text-center mb-0"
          role="status"
        >
          {/* Shows user what Pokemon is currently loading. */}
          Loading detail for {formatName(selectedPokemon.name)}...
        </div>
      </div>
    </main>
  );
}

// Export so App.jsx can render this temporary loading layout.
export default DetailLoading;
