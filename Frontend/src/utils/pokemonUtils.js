// ─── Pokemon utility helpers ────────────────────────────────────────────────
// Kept here so they can be imported by any hook or component without circular
// dependencies or duplicating logic.

// Converts API slug names like "mr-mime" into readable "Mr Mime".
export const formatName = (name) =>
    name
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

// Pads a numeric Pokédex ID to a four-digit string, e.g. 1 → "#0001".
export const formatNumber = (id) => `#${String(id).padStart(4, "0")}`;

// Recursively walks an evolution chain node and returns every species name.
// The PokeAPI chain is a linked list tree, so we DFS each branch.
export const extractEvolutionNames = (node) => {
    const names = [node.species.name];

    if (!node.evolves_to.length) {
        return names;
    }

    return [
        ...names,
        ...node.evolves_to.flatMap((nextNode) => extractEvolutionNames(nextNode)),
    ];
};
