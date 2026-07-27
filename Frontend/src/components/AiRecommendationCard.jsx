// AiRecommendationCard shows Gemini's take on the current team (via the
// Python AI-Agent, proxied through Backend/routes/team.js). Purely
// presentational — all fetching/debouncing logic lives in useTeamManager.
function AiRecommendationCard({
  recommendation, // Latest advice text from Gemini, or "" before anything has loaded.
  isLoadingRecommendation, // True while a request is in flight.
  recommendationError, // Non-empty string if the last request failed.
  hasTeam, // True once at least one Pokemon has been added.
}) {
  return (
    <section className="card border-0 shadow-sm sidebar-card">
      <div className="card-body p-3 p-lg-4">
        <p className="detail-label mb-2">AI Team Advisor</p>

        {!hasTeam ? (
          <p className="small text-secondary mb-0">
            Add Pokemon to your team to get AI advice.
          </p>
        ) : recommendationError ? (
          <p className="small text-danger mb-0">{recommendationError}</p>
        ) : isLoadingRecommendation && !recommendation ? (
          <p className="small text-secondary mb-0" role="status">
            Thinking about your team...
          </p>
        ) : (
          <>
            <p className="small mb-0 ai-recommendation-text">{recommendation}</p>
            {isLoadingRecommendation && (
              <p className="small text-secondary mt-2 mb-0" role="status">
                Updating advice...
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default AiRecommendationCard;
