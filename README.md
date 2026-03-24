# 🐾 Pokemon Pokedex React

A responsive React application that fetches data from the PokéAPI and displays Pokémon in a dynamic grid layout. Each Pokémon card includes images, types, abilities, and moves, providing a clean and interactive user experience.

---

## 🚀 Features

- 🔄 Fetches real-time data from the PokéAPI
- 🧠 Uses `useEffect` and `useState` for state management
- ⚡ Efficient data fetching with `Promise.all`
- 🖼️ Displays Pokémon images, types, abilities, and moves
- 📱 Fully responsive grid layout using Bootstrap
- ⏳ Loading state while fetching data

---

## 🛠️ Technologies Used

- React
- JavaScript (ES6+)
- Fetch API
- Bootstrap
- PokéAPI

---

## 📦 Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/pokemon-pokedex-react.git
```

2. Navigate into the project:

```bash
cd pokemon-pokedex-react
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

---

## 📡 API Used

This project uses the PokéAPI to fetch Pokémon data:

https://pokeapi.co/

---

## 🧠 How It Works

1. Fetch a list of Pokémon (name + URL)
2. Use each Pokémon’s URL to fetch detailed data
3. Combine all responses using `Promise.all`
4. Store the data in state
5. Render Pokémon cards dynamically using `.map()`

---

## 📸 Screenshots

_(Add screenshots here if you want to make your repo stand out)_

---

## 🔧 Possible Improvements

- 🔍 Search Pokémon by name
- 📄 Add pagination (Next / Previous)
- 🎨 Style cards based on Pokémon type
- ⭐ Add favorites feature
- ⚡ Improve performance with caching

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙌 Author

Gabriel Urtado
