import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Game from "./pages/Game";

import { useGameStore } from "./store/gameStore";

function GameRouter() {
  const gameStarted = useGameStore((state) => state.gameStarted);

  return gameStarted ? <Game /> : <Home />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameRouter />} />
      </Routes>
    </BrowserRouter>
  );
}