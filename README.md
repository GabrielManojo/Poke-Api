# 🐾 Pokédex

A full-stack Pokémon browser built with React and Express, with a Gemini-powered Python AI agent for team advice. Load, search, filter, and build a team from all 1025 National Dex entries — backed by a caching Express server that proxies the PokéAPI.

---

## 🚀 Features

- ⚡ **Full Pokédex, loaded lazily** — all 1025 Pokémon are reachable, fetched only 10 at a time so the site stays fast
- 🧬 **Generation filter** — jump straight to any generation (Gen 1–9) without loading earlier ones first
- 🔍 **Search by name** — finds a match anywhere in the Pokédex (or the current generation), even if it hasn't been paginated into view yet
- 🏷️ **Multi-type filter** — toggle type chips; results must match *all* selected types (AND logic)
- ⭐ **Legendary filter** — shows every legendary in the current range, fetching any not already loaded
- 📄 **Paginated grid** — 10 cards per page with a "Load more" button
- 🖼️ **Detail view** — click any card to see sprite, types, weaknesses, and full evolution chain
- 🛡️ **Team builder** — add up to 6 Pokémon; sidebar shows per-member and combined team weaknesses
- 🤖 **AI Team Advisor** — a Gemini-powered agent reviews your team automatically and tells you whether it's solid or what to add to cover its weaknesses
- 🗄️ **Server-side caching** — backend caches every PokéAPI response for 10 minutes so repeat visits are instant
- 📱 **Responsive layout** — Bootstrap 5 grid, works on mobile and desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Bootstrap 5 |
| Backend | Node.js, Express 5 (ESM) |
| AI Agent | Python, Flask, [Gemini API](https://ai.google.dev/gemini-api/docs) (`google-genai`) |
| Data source | [PokéAPI](https://pokeapi.co/) |
| Dev tools | nodemon, ESLint, dotenv |

---

## 📁 Project Structure

```
PokeApi/
├── Backend/
│   ├── server.js          # Express entry point, middleware, route mounts
│   ├── cache.js           # In-memory cache with 10-minute TTL
│   └── routes/
│       ├── pokemon.js     # Paginated list, search, batch, single pokemon, detail aggregation
│       └── team.js        # Team weakness analysis + AI recommendation proxy
│
├── AI-Agent/               # Standalone Python service — Gemini-powered team advisor
│   ├── app.py              # Flask server exposing POST /recommend
│   ├── requirements.txt
│   └── .env.example        # Copy to .env and add your GEMINI_API_KEY
│
└── Frontend/
    └── src/
        ├── App.jsx                     # Top-level view router
        ├── api/
        │   └── pokeApi.js              # All fetch calls (single source of truth)
        ├── hooks/
        │   ├── usePokemonList.js       # Range-scoped progressive loading, search/legendary top-up
        │   ├── usePokemonDetail.js     # Detail view state and data
        │   ├── useTeamManager.js       # Team composition, weaknesses, AI recommendation
        │   └── useSearch.js            # Name, type, and legendary filters
        ├── components/
        │   ├── PokemonGrid.jsx         # Main catalog grid with search and pagination
        │   ├── SearchBar.jsx           # Name input, type chips, legendary button
        │   ├── GenerationSelector.jsx  # Gen 1-9 / All filter chips
        │   ├── PokemonDetail.jsx       # Full detail view
        │   ├── TeamSidebar.jsx         # Team member list
        │   ├── TeamWeaknessSidebar.jsx # Per-member and combined weakness breakdown
        │   ├── AiRecommendationCard.jsx# Displays the Gemini team advice
        │   ├── DetailLoading.jsx       # Loading state for detail view
        │   └── ErrorState.jsx          # Error display
        └── utils/
            ├── pokemonUtils.js         # formatName, formatNumber helpers
            └── generations.js          # Generation Dex-range reference data
```

---

## 📦 Installation

### Prerequisites

- Node.js 18 or later
- Python 3.9 or later
- A free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 1. Install backend dependencies

```bash
cd Backend
npm install
```

### 2. Install frontend dependencies

```bash
cd Frontend
npm install
```

### 3. Set up the AI Agent

```bash
cd AI-Agent
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Windows: copy .env.example .env
```

Open `AI-Agent/.env` and set your key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Never commit `.env` — only `.env.example` (the placeholder template) is tracked in git.

### 4. (Optional) Configure backend environment variables

Create `Backend/.env` to override defaults:

```env
PORT=5000
POKEMON_LIMIT=1025
AI_AGENT_URL=http://localhost:5002
```

### 5. Start all three services (separate terminals)

```bash
# Terminal 1
cd Backend && npm run dev

# Terminal 2
cd AI-Agent && python app.py

# Terminal 3
cd Frontend && npm run dev
```

Open `http://localhost:5173` in your browser. The Backend runs on `http://localhost:5000`, the AI Agent on `http://localhost:5002`.

---

## 📡 API Endpoints

### Backend (Node/Express — `http://localhost:5000`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/pokemon?limit=10&offset=0` | Paginated, hydrated Pokémon list |
| GET | `/api/pokemon/search?q=&start=&end=` | Name search across a Dex range |
| GET | `/api/pokemon/batch?ids=1,2,3` | Hydrates specific Dex IDs (used by the legendary filter) |
| GET | `/api/pokemon/:nameOrId` | Single Pokémon object |
| GET | `/api/pokemon/:nameOrId/detail` | Weaknesses + evolution chain in one call |
| POST | `/api/team/weaknesses` | Team weakness analysis |
| POST | `/api/team/recommendation` | AI team advice (proxies to the AI Agent) |

### AI Agent (Python/Flask — `http://localhost:5002`, called only by the Backend)

| Method | Path | Description |
|---|---|---|
| POST | `/recommend` | Takes the team + computed weaknesses, returns Gemini's advice text |
| GET | `/` | Health check |

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙌 Author

Gabriel Urtado
