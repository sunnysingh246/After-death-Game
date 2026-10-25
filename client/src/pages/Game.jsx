import {
    Pickaxe,
    FlaskConical,
    RotateCcw,
} from "lucide-react";
import { useEffect } from "react";

import Navbar from "../components/Navbar";
import ResourceBar from "../components/ResourceBar";
import GameMap from "../components/GameMap";
import BuildingCard from "../components/BuildingCard";

import { useGameStore } from "../store/gameStore";

export default function Game() {
    const buildings = useGameStore((state) => state.buildings);
    const resetGame = useGameStore((state) => state.resetGame);

    const structures = [
        {
            type: "shelter",
            title: "Survivor Shelter",
            description: "Provide a safe place for survivors.",
            cost: { wood: 30, metal: 10 },
        },
        {
            type: "farm",
            title: "Hydroponic Farm",
            description: "Prepare a sustainable food supply.",
            cost: { wood: 20, metal: 15, energy: 5 },
        },
        {
            type: "powerPlant",
            title: "Power Plant",
            description: "Generate energy for your settlement.",
            cost: { wood: 25, metal: 30 },
        },
    ];

    const produceResources = useGameStore(
        (state) => state.produceResources
    );

    useEffect(() => {
        const interval = setInterval(() => {
            produceResources();
        }, 10_000);

        return () => clearInterval(interval);
    }, [produceResources]);
    
    return (
        <div className="game-page">
            <Navbar />

            <div className="game-container">
                <section className="welcome-row">
                    <div>
                        <p className="eyebrow">COMMAND CENTER</p>
                        <h1>Rebuild Civilization.</h1>
                        <p>
                            Every resource matters. Every decision shapes your future.
                        </p>
                    </div>

                    <button className="reset-button" onClick={resetGame}>
                        <RotateCcw size={16} />
                        Reset Game
                    </button>
                </section>

                <ResourceBar />

                <GameMap />

                <section className="construction-section">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">DEVELOP YOUR SETTLEMENT</p>
                            <h2>Construction Yard</h2>
                        </div>

                        <span>{buildings.length} BUILDINGS CONSTRUCTED</span>
                    </div>

                    <div className="building-grid">
                        {structures.map((structure) => (
                            <BuildingCard
                                key={structure.type}
                                {...structure}
                            />
                        ))}
                    </div>
                </section>

                <section className="research-panel">
                    <div className="research-icon">
                        <FlaskConical size={28} />
                    </div>

                    <div>
                        <p className="eyebrow">COMING NEXT</p>
                        <h3>Technology Research</h3>
                        <p>
                            Unlock advanced structures and rebuild a better world.
                        </p>
                    </div>

                    <Pickaxe size={25} />
                </section>

                <footer className="game-footer">
                    AFTER DEATH · THE FUTURE IS YOURS TO REBUILD
                </footer>
            </div>
        </div>
    );
}