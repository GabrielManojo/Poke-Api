function DetailLoading({
  selectedPokemon,
  onBack,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  formatName,
}) {
  return (
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
          Loading detail for {formatName(selectedPokemon.name)}...
        </div>
      </div>
    </main>
  );
}

export default DetailLoading;
