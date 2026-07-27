// ─── Pokemon generation reference data ─────────────────────────────────────
// National Dex ID ranges for each main-series generation. `start`/`end` are
// inclusive 1-based Dex numbers and line up exactly with POKEMON_LIMIT=1025
// on the backend (151 + 100 + 135 + 107 + 156 + 72 + 88 + 96 + 120 = 1025).
//
// Selecting a generation scopes which Dex range usePokemonList fetches from
// the backend, rather than just filtering pokemon already loaded in memory —
// that way picking Generation IX doesn't require first loading generations
// I through VIII.
export const GENERATIONS = [
    {
        id: 1,
        label: "Generation I",
        years: "1996–1999",
        region: "Kanto",
        games: "Red, Blue, Yellow",
        start: 1,
        end: 151,
    },
    {
        id: 2,
        label: "Generation II",
        years: "1999–2002",
        region: "Johto",
        games: "Gold, Silver, Crystal",
        start: 152,
        end: 251,
    },
    {
        id: 3,
        label: "Generation III",
        years: "2002–2006",
        region: "Hoenn",
        games: "Ruby, Sapphire, Emerald",
        start: 252,
        end: 386,
    },
    {
        id: 4,
        label: "Generation IV",
        years: "2006–2010",
        region: "Sinnoh",
        games: "Diamond, Pearl, Platinum",
        start: 387,
        end: 493,
    },
    {
        id: 5,
        label: "Generation V",
        years: "2010–2013",
        region: "Unova",
        games: "Black, White",
        start: 494,
        end: 649,
    },
    {
        id: 6,
        label: "Generation VI",
        years: "2013–2016",
        region: "Kalos",
        games: "X, Y",
        start: 650,
        end: 721,
    },
    {
        id: 7,
        label: "Generation VII",
        years: "2016–2019",
        region: "Alola",
        games: "Sun, Moon",
        start: 722,
        end: 809,
    },
    {
        id: 8,
        label: "Generation VIII",
        years: "2019–2022",
        region: "Galar",
        games: "Sword, Shield",
        start: 810,
        end: 905,
    },
    {
        id: 9,
        label: "Generation IX",
        years: "2022–present",
        region: "Paldea",
        games: "Scarlet, Violet",
        start: 906,
        end: 1025,
    },
];

// Look up a generation's metadata by id. Returns undefined for null/"all".
export function getGenerationById(id) {
    return GENERATIONS.find((gen) => gen.id === id);
}
