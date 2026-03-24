// TeamWeaknessSidebar shows team analysis data (per Pokemon + shared summary).
// Recent change: per-Pokemon weaknesses are rendered as compact text rows
// instead of tall chip blocks to keep more info visible at once.
function TeamWeaknessSidebar({
  // Array like: [{ id, name, weaknesses: [] }]
  teamPokemonWeaknesses = [],
  // Array like: [{ name, count }], sorted by highest overlap.
  teamWeaknesses = [],
  // Shared name-format helper from App.jsx.
  formatName = (name) => name,
}) {
  return (
    // Single card dedicated to weakness information.
    <section className="card border-0 shadow-sm sidebar-card">
      <div className="card-body p-3 p-lg-4 sidebar-analysis-body">
        {/* Per-member weakness breakdown section. */}
        <p className="detail-label mb-2">Pokemon Weaknesses</p>

        {teamPokemonWeaknesses.length ? (
          // Compact list to keep all team insights visible with less vertical space.
          <div className="team-weakness-compact-list mb-3">
            {teamPokemonWeaknesses.map((pokemon) => (
              <div key={pokemon.id} className="team-weakness-compact-row">
                <p className="mb-0 fw-semibold small team-weakness-name">
                  {formatName(pokemon.name)}
                </p>
                <p className="mb-0 small text-secondary team-weakness-values">
                  {pokemon.weaknesses.length
                    ? pokemon.weaknesses
                        .map((name) => formatName(name))
                        .join(", ")
                    : "None"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          // Empty-state hint until user adds Pokemon to the team.
          <p className="small text-secondary mb-3">
            Add Pokemon to see each member's weaknesses.
          </p>
        )}

        {/* Team-wide overlap summary section. */}
        <p className="detail-label mb-2">Shared Weakness Summary</p>
        {teamWeaknesses.length ? (
          <div className="type-row">
            {teamWeaknesses.map((weakness) => (
              <span
                key={weakness.name}
                className={`weakness-chip type-${weakness.name} shared-weakness-chip`}
              >
                {formatName(weakness.name)} x{weakness.count}
              </span>
            ))}
          </div>
        ) : (
          // Empty-state hint when summary data is not available yet.
          <p className="small text-secondary mb-0">
            Team summary will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

// Export so PokemonGrid.jsx can place this analysis card in the sidebar area.
export default TeamWeaknessSidebar;
