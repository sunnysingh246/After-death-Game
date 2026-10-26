import { BrowserRouter, Routes, Route } from "react-router-dom";
import Game3D from "./components/Game3D";

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
                <Route path="/world" element={<Game3D />} />
            </Routes>
        </BrowserRouter>
    );
}