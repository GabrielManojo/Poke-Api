import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pokemonRouter from "./routes/pokemon.js";
import teamRouter from "./routes/team.js";

// Load .env variables (PORT, POKEMON_LIMIT, etc.) before anything else.
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({ message: "PokeAPI backend is running" });
});

// ─── Route modules ────────────────────────────────────────────────────────────
// All pokemon-related endpoints (list, detail, species, evolution, type).
app.use("/api/pokemon", pokemonRouter);
// Team-builder endpoints (weakness analysis).
app.use("/api/team", teamRouter);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
// Any request that didn't match a route above gets a clean JSON error instead
// of Express's default HTML "Cannot GET ..." page.
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found." });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// Catches errors thrown by middleware or route handlers that weren't already
// caught locally, keeping the server alive and returning structured JSON.
app.use((err, _req, res, _next) => {
    console.error("[Unhandled error]", err.message);
    res.status(500).json({ error: "Internal server error." });
});

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
