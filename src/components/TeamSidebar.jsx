// TeamSidebar renders only the team composition card.
// Recent change: weakness rendering was removed from this file
// so this component has one clear responsibility (team slots).
function TeamSidebar({
  // The array of Pokemon objects the user has added to their team.
  teamPokemons = [],
  // Upper limit for the team (always 6); used to render empty Pokeball slots.
  teamLimit = 6,
  // Callback that removes a Pokemon from the team when the user clicks "Remove".
  onRemoveFromTeam = () => {},
  // Converts API names like "mr-mime" into "Mr Mime" for display.
  formatName = (name) => name,
}) {
  // The Pokeball image is shown in empty slots before the user adds a Pokemon.
  const pokeBallImage =
    "https://www.clipartmax.com/png/small/129-1298390_pokeball-transparent-png-pokeball-png-pokemon-go.png";

  return (
    // Recent change: single card output (no nested weakness card here).
    <section className="card border-0 shadow-sm sidebar-card">
      <div className="card-body p-3 p-lg-4">
        {/* Team title and occupancy. */}
        <h2 className="h4 mb-1">Your Team</h2>
        <p className="text-secondary small mb-3">
          {teamPokemons.length}/{teamLimit} slots filled
        </p>

        {/* Exactly six visible rows to match the classic party size. */}
        <div className="team-slots mb-0">
          {Array.from({ length: teamLimit }).map((_, index) => {
            const teamPokemon = teamPokemons[index];

            return (
              <article
                key={`team-slot-${index}`}
                className="team-slot"
                aria-label={`Team slot ${index + 1}`}
              >
                <img
                  src={
                    teamPokemon
                      ? teamPokemon.sprites.front_default
                      : pokeBallImage
                  }
                  alt={teamPokemon ? teamPokemon.name : "Empty Pokeball slot"}
                  className="team-slot-image"
                />

                <div className="team-slot-copy">
                  <p className="mb-0 small fw-semibold">
                    {teamPokemon
                      ? formatName(teamPokemon.name)
                      : `Empty Slot ${index + 1}`}
                  </p>

                  {teamPokemon ? (
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 team-remove-btn"
                      onClick={() => onRemoveFromTeam(teamPokemon.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Export so PokemonGrid.jsx can import and render it.
export default TeamSidebar;
