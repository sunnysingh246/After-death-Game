# 🌍 AFTER DEATH

### Rebuild Civilization. Reclaim the Future.

**AFTER DEATH** is a post-apocalyptic civilization-building strategy game where players begin with limited resources and work toward rebuilding a civilization after Earth's collapse.

Collect resources, construct buildings, manage your settlement, and prepare to explore a world filled with abandoned territories and undiscovered possibilities.

The project is being developed as a full-stack browser game using modern JavaScript technologies.

---

## 🎮 About the Game

The year is 2089. Civilization has collapsed, cities have been abandoned, and resources are scarce.

As the commander of a new settlement, your mission is to rebuild civilization from the ground up.

Start with basic resources, construct essential buildings, and develop your settlement into a thriving civilization.

**Your decisions will shape the future.**

## ✨ Features

### Currently Implemented

* 🎨 Dark, post-apocalyptic user interface
* 🏠 Civilization management dashboard
* 🌲 Resource tracking for Wood, Metal, Food, and Energy
* 🏗️ Building construction system
* 💰 Resource costs for constructing buildings
* 🗺️ Settlement map with building markers
* 🌾 Automatic food production from farms
* ⚡ Automatic energy production from power plants
* 💾 Local browser save system using localStorage
* 🔄 Reset game functionality
* 📱 Responsive layout for different screen sizes

### Planned Features

* 🧭 Exploration of abandoned territories
* 📦 Random loot and resource discovery
* 👥 Population and survivor management
* 🔬 Technology research and upgrades
* 🏭 Advanced buildings and resource production
* 🔐 User authentication
* ☁️ Cloud-based game saves using MongoDB
* 🌐 Real-time multiplayer using Socket.IO
* 🤝 Player trading and alliances
* 🏆 Leaderboards and achievements

*Planned features are under development and are not yet available in the current prototype.*

---

## 🛠️ Tech Stack

### Frontend

* React
* Vite
* Tailwind CSS
* Zustand
* React Router
* Lucide React
* Framer Motion

### Backend

* Node.js
* Express.js
* Socket.IO

### Database

* MongoDB
* Mongoose

---

## 📁 Project Structure

```text
AFTER-DEATH/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ResourceBar.jsx
│   │   │   ├── BuildingCard.jsx
│   │   │   └── GameMap.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Game.jsx
│   │   │
│   │   ├── store/
│   │   │   └── gameStore.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── sockets/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── .env
│   └── package.json
│
├── .gitignore
└── README.md
```

*The structure above describes the intended project layout. Some directories may remain empty until their corresponding features are implemented.*

---

## ⚙️ Installation and Setup

### Prerequisites

Install the following:

* Node.js and npm
* Git
* VS Code or another code editor

MongoDB Atlas credentials will be needed when database integration is enabled.

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd AFTER-DEATH
```

Replace `YOUR_REPOSITORY_URL` with your repository's Git URL.

### 2. Set Up the Frontend

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

### 3. Set Up the Backend

Open a second terminal:

```bash
cd AFTER-DEATH/server
npm install
npm run dev
```

The backend is configured to run on port `5000` by default.

**Note:** The current frontend prototype can run independently. The backend and MongoDB are not yet required for the local resource-management gameplay.

### 4. Configure Environment Variables

Create a `.env` file inside the `server` directory:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

Replace the placeholder with your MongoDB connection string when database integration is implemented.

Never commit your `.env` file or expose database credentials publicly.

---

## 🎯 Gameplay

### Starting Resources

| Resource | Initial Amount |
| -------- | -------------: |
| Wood     |            100 |
| Metal    |             80 |
| Food     |            150 |
| Energy   |             50 |

### Available Buildings

| Building         | Wood | Metal | Energy | Effect           |
| ---------------- | ---: | ----: | -----: | ---------------- |
| Survivor Shelter |   30 |    10 |      0 | Provides shelter |
| Hydroponic Farm  |   20 |    15 |      5 | Produces food    |
| Power Plant      |   25 |    30 |      0 | Produces energy  |

### Resource Production

Once implemented and active:

* Each Hydroponic Farm produces 10 Food every 10 seconds.
* Each Power Plant produces 5 Energy every 10 seconds.

Resource production currently operates while the game screen is open.

---

## 🗺️ Development Roadmap

* [x] Initial React and Vite setup
* [x] Game dashboard and UI
* [x] Resource management
* [x] Building construction
* [x] Basic resource production
* [x] Local game persistence
* [ ] Territory exploration
* [ ] Random events and loot
* [ ] Population management
* [ ] Technology research
* [ ] Backend game APIs
* [ ] MongoDB game persistence
* [ ] Authentication and player profiles
* [ ] Multiplayer gameplay
* [ ] Trading and alliances
* [ ] Deployment and public release

---

## 🔮 Future Vision

AFTER DEATH aims to evolve into a persistent multiplayer strategy game where players can:

* Build and expand civilizations.
* Explore dangerous territories.
* Discover rare resources and technologies.
* Trade with other players.
* Form alliances and compete for global rankings.
* Customize their settlements and civilizations.

Future monetization may include cosmetic items, optional premium customization, and expansion content.

The goal is to keep core gameplay fair and enjoyable without requiring players to pay for competitive advantages.

---

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Test your implementation.
5. Open a pull request describing your changes.

---

## 📌 Project Status

**Status:** Early Development / MVP

AFTER DEATH is currently a work in progress. The existing prototype focuses on the frontend, basic resource management, and building construction.

Database persistence, multiplayer, exploration, and other advanced features will be introduced incrementally.

---

## 👨‍💻 Author

Developed as a full-stack game development project.

---

### 🌍 AFTER DEATH

**The world has fallen. Your civilization begins now.**
