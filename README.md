# 🐾 Pokédex

A full-stack Pokémon browser built with React and Express. Load, search, filter, and build a team from all 1025 National Dex entries — backed by a caching Express server that proxies the PokéAPI.

---

## 🚀 Features

- ⚡ **Progressive loading** — first 151 Pokémon appear immediately; press "Load 151 more" to keep going up to 1025
- 🔍 **Search by name** — filters the grid as you type
- 🏷️ **Multi-type filter** — toggle type chips; results must match *all* selected types (AND logic)
- ⭐ **Legendary filter** — one-click button to show only legendary Pokémon across all generations
- 📄 **Paginated grid** — 9 cards per page with a "Load more" button
- 🖼️ **Detail view** — click any card to see sprite, types, weaknesses, and full evolution chain
- 🛡️ **Team builder** — add up to 6 Pokémon; sidebar shows per-member and combined team weaknesses
- 🗄️ **Server-side caching** — backend caches every PokéAPI response for 10 minutes so repeat visits are instant
- 📱 **Responsive layout** — Bootstrap 5 grid, works on mobile and desktop

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Bootstrap 5 |
| Backend | Node.js, Express 5 (ESM) |
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
│       ├── pokemon.js     # Paginated list, single pokemon, detail aggregation
│       └── team.js        # Team weakness analysis endpoint
│
└── Frontend/
    └── src/
        ├── App.jsx                     # Top-level view router
        ├── api/
        │   └── pokeApi.js              # All fetch calls (single source of truth)
        ├── hooks/
        │   ├── usePokemonList.js       # Progressive server-page loading
        │   ├── usePokemonDetail.js     # Detail view state and data
        │   ├── useTeamManager.js       # Team composition and weaknesses
        │   └── useSearch.js            # Name, type, and legendary filters
        ├── components/
        │   ├── PokemonGrid.jsx         # Main catalog grid with search and pagination
        │   ├── SearchBar.jsx           # Name input, type chips, legendary button
        │   ├── PokemonDetail.jsx       # Full detail view
        │   ├── TeamSidebar.jsx         # Team member list
        │   ├── TeamWeaknessSidebar.jsx # Per-member and combined weakness breakdown
        │   ├── DetailLoading.jsx       # Loading state for detail view
        │   └── ErrorState.jsx          # Error display
        └── utils/
            └── pokemonUtils.js         # formatName, formatNumber helpers
```

---

## 📦 Installation

### Prerequisites

- Node.js 18 or later
- npm

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

### 3. (Optional) Configure environment variables

Create `Backend/.env` to override defaults:

```env
PORT=5000
POKEMON_LIMIT=1025
```

### 4. Start the backend

```bash
cd Backend
npm run dev
```

The API runs on `http://localhost:5000`.

### 5. Start the frontend

```bash
cd Frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📡 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/pokemon?limit=151&offset=0` | Paginated, hydrated Pokémon list |
| GET | `/api/pokemon/:nameOrId` | Single Pokémon object |
| GET | `/api/pokemon/:nameOrId/detail` | Weaknesses + evolution chain in one call |
| POST | `/api/team/weaknesses` | Team weakness analysis |

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙌 Author

Gabriel Urtado
