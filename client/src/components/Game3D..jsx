import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import DayNightCycle from "./DayNightCycle";
import Environment from "./WorldEnvironment";

const soundEffects = {
    swing: "/sounds/axe-swing.mp3",
    hit: "/sounds/tree-hit.mp3",
    fall: "/sounds/tree-fall.mp3",
};

function playSound(name) {
    const src = soundEffects[name];
    if (!src) return;

    // Create a fresh audio element so rapid hits don't cut off one another.
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = name === "fall" ? 0.8 : 0.65;
    audio.play().catch(() => {
        // Browsers may block audio until the user has interacted with the page.
    });
}


export default function Game3D() {
    const [position, setPosition] = useState({ x: 0, z: 0 });
    const [wood, setWood] = useState(0);
    const [hasAxe, setHasAxe] = useState(false);
    const [isChopping, setIsChopping] = useState(false);
    const [message, setMessage] = useState("");
    const [chopSoundEnabled, setChopSoundEnabled] = useState(true);
    const [health, setHealth] = useState(100);
    const [hunger, setHunger] = useState(100);
    const [thirst, setThirst] = useState(100);
    const [gameOver, setGameOver] = useState(false);
    const [apples, setApples] = useState(0);
    const [waterBottles, setWaterBottles] = useState(0);
    const [worldKey, setWorldKey] = useState(0);
    const messageTimeout = useRef(null);
    const ambienceRef = useRef(null);
    const ambienceStartedRef = useRef(false);
    const survivalRef = useRef({ health, hunger, thirst });

    useEffect(() => {
        survivalRef.current = { health, hunger, thirst };
    }, [health, hunger, thirst]);

    const showMessage = useCallback((text) => {
        setMessage(text);
        if (messageTimeout.current) clearTimeout(messageTimeout.current);
        messageTimeout.current = setTimeout(() => setMessage(""), 2500);
    }, []);

    // Survival meters decrease over time. When hunger or thirst is empty, health drains.
    useEffect(() => {
        if (gameOver) return undefined;

        const survivalTimer = window.setInterval(() => {
            const nextHunger = Math.max(0, survivalRef.current.hunger - 1);
            const nextThirst = Math.max(0, survivalRef.current.thirst - 1.5);
            survivalRef.current.hunger = nextHunger;
            survivalRef.current.thirst = nextThirst;
            setHunger(nextHunger);
            setThirst(nextThirst);

            if (nextHunger === 0 || nextThirst === 0) {
                const nextHealth = Math.max(0, survivalRef.current.health - 5);
                survivalRef.current.health = nextHealth;
                setHealth(nextHealth);
                if (nextHealth === 0) setGameOver(true);
            }
        }, 5000);

        return () => window.clearInterval(survivalTimer);
    }, [gameOver]);

    useEffect(() => () => {
        if (messageTimeout.current) clearTimeout(messageTimeout.current);
        if (ambienceRef.current) {
            ambienceRef.current.pause();
            ambienceRef.current = null;
        }
    }, []);

    // Browsers require a user gesture before audio playback. Start ambience on the first click/key.
    useEffect(() => {
        const startAmbience = () => {
            if (!chopSoundEnabled || ambienceStartedRef.current) return;
            ambienceStartedRef.current = true;
            const audio = new Audio("/sounds/forest-ambience.mp3");
            audio.loop = true;
            audio.volume = 0.22;
            ambienceRef.current = audio;
            audio.play().catch(() => {
                ambienceStartedRef.current = false;
            });
        };

        window.addEventListener("pointerdown", startAmbience);
        window.addEventListener("keydown", startAmbience);
        return () => {
            window.removeEventListener("pointerdown", startAmbience);
            window.removeEventListener("keydown", startAmbience);
        };
    }, [chopSoundEnabled]);

    const collectWood = useCallback((amount) => {
        setWood((previousWood) => previousWood + amount);
    }, []);

    // Option A: picking up an apple immediately restores hunger.
    const collectFood = useCallback((amount) => {
        setHunger((value) => {
            const nextValue = Math.min(100, value + 30 * amount);
            survivalRef.current.hunger = nextValue;
            return nextValue;
        });
        showMessage("🍎 Apple collected! Hunger +30.");
    }, [showMessage]);

    // Option A: picking up water immediately restores thirst.
    const collectWater = useCallback((amount) => {
        setThirst((value) => {
            const nextValue = Math.min(100, value + 35 * amount);
            survivalRef.current.thirst = nextValue;
            return nextValue;
        });
        showMessage("💧 Water collected! Thirst +35.");
    }, [showMessage]);

    const eatApple = () => {
        if (apples <= 0) { showMessage("No apples! Find a red apple in the forest."); return; }
        setApples((value) => Math.max(0, value - 1));
        setHunger((value) => Math.min(100, value + 30));
        showMessage("🍎 You ate an apple. Hunger restored!");
    };

    const drinkWater = () => {
        if (waterBottles <= 0) { showMessage("No water! Find a blue water bottle in the forest."); return; }
        setWaterBottles((value) => Math.max(0, value - 1));
        setThirst((value) => Math.min(100, value + 35));
        showMessage("💧 You drank water. Thirst restored!");
    };

    const craftAxe = () => {
        if (hasAxe) {
            showMessage("You already have an axe!");
            return;
        }
        if (wood < 10) {
            showMessage("You need 10 wood to craft an axe!");
            return;
        }
        setWood((previousWood) => previousWood - 10);
        setHasAxe(true);
        showMessage("🪓 Wooden axe crafted and equipped!");
    };

    const handleAxeSwing = useCallback(() => {
        if (chopSoundEnabled) playSound("swing");
    }, [chopSoundEnabled]);

    const handleAxeHit = useCallback(() => {
        if (chopSoundEnabled) playSound("hit");
    }, [chopSoundEnabled]);

    const handleTreeFall = useCallback(() => {
        if (chopSoundEnabled) playSound("fall");
    }, [chopSoundEnabled]);

    const restartGame = () => {
        setHealth(100);
        setHunger(100);
        setThirst(100);
        setWood(0);
        setApples(0);
        setWaterBottles(0);
        setHasAxe(false);
        setIsChopping(false);
        setPosition({ x: 0, z: 0 });
        setMessage("");
        setGameOver(false);
        setWorldKey((key) => key + 1);
    };

    const toggleSound = () => {
        setChopSoundEnabled((enabled) => {
            const next = !enabled;
            if (!next && ambienceRef.current) {
                ambienceRef.current.pause();
                ambienceStartedRef.current = false;
            }
            return next;
        });
        showMessage(chopSoundEnabled ? "Sound muted." : "Sound enabled.");
    };

    return (
        <div className="game3d">
            <div className="game3d-hud">
                <div>
                    <strong>AFTER DEATH</strong>
                    <span>WASTELAND · SECTOR 07</span>
                </div>

                <div className="player-coordinates">
                    X: {position.x} · Z: {position.z}
                </div>

                <div className="player-inventory">
                    <span>🪵 Wood: {wood}</span>
                    <span>🍎 Apples: {apples}</span>
                    <span>💧 Water: {waterBottles}</span>
                    <span>{hasAxe ? "🪓 Axe: Equipped" : "🪓 Axe: Not Crafted"}</span>
                    <button type="button" onClick={toggleSound} className="sound-toggle">
                        {chopSoundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
                    </button>
                </div>
            </div>

            <div style={{
                position: "absolute", top: 86, left: 18, zIndex: 5,
                width: 230, padding: "12px 14px", borderRadius: 12,
                color: "#f8fafc", background: "rgba(15, 23, 42, 0.88)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                fontFamily: "inherit", pointerEvents: "none"
            }}>
                <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.75, marginBottom: 10 }}>
                    SURVIVAL STATUS
                </div>
                {[
                    { label: "❤️ Health", value: health, color: "#ef4444" },
                    { label: "🍖 Hunger", value: hunger, color: "#f59e0b" },
                    { label: "💧 Thirst", value: thirst, color: "#38bdf8" },
                ].map((meter) => (
                    <div key={meter.label} style={{ marginBottom: 9 }}>
                        <div style={{
                            display: "flex", justifyContent: "space-between",
                            fontSize: 12, marginBottom: 4
                        }}>
                            <span>{meter.label}</span>
                            <span>{Math.round(meter.value)}%</span>
                        </div>
                        <div style={{
                            height: 8, borderRadius: 99, overflow: "hidden",
                            background: "rgba(255,255,255,0.16)"
                        }}>
                            <div style={{
                                width: `${meter.value}%`, height: "100%",
                                background: meter.color, borderRadius: 99,
                                transition: "width 250ms linear"
                            }} />
                        </div>
                    </div>
                ))}
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                    Hunger & thirst decrease over time
                </div>
            </div>

            <div className="game3d-canvas">
                <Canvas
                    key={worldKey}
                    shadows
                    camera={{ position: [0, 5, 7], fov: 55 }}
                    dpr={[1, 1.5]}
                >
                    <color attach="background" args={["#c6d5bd"]} />
                    <fog attach="fog" args={["#c6d5bd", 25, 55]} />

                    <DayNightCycle />

                    <Environment
                        onPositionChange={setPosition}
                        onWoodCollected={collectWood}
                        onMessage={showMessage}
                        hasAxe={hasAxe}
                        isChopping={isChopping}
                        setIsChopping={setIsChopping}
                        onAxeSwing={handleAxeSwing}
                        onAxeHit={handleAxeHit}
                        onTreeFall={handleTreeFall}
                        onFoodCollected={collectFood}
                        onWaterCollected={collectWater}
                        disabled={gameOver}
                    />
                </Canvas>
            </div>

            {message && <div className="game3d-message">{message}</div>}

            {isChopping && (
                <div className="chop-progress-panel">
                    <div className="chop-progress-label">
                        <span>🪓 CHOPPING TREE</span>
                        <span>Working...</span>
                    </div>
                    <div className="chop-progress-track">
                        <div className="chop-progress-fill" />
                    </div>
                </div>
            )}

            <div className="game3d-controls">
                <div className="crafting-panel">
                    <h3>🎒 Survival Inventory</h3>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                        <button type="button" onClick={eatApple} disabled={apples <= 0} style={{ padding: "9px 12px", borderRadius: 8, border: 0, cursor: apples > 0 ? "pointer" : "not-allowed" }}>
                            🍎 Eat Apple ({apples}) +30 Hunger
                        </button>
                        <button type="button" onClick={drinkWater} disabled={waterBottles <= 0} style={{ padding: "9px 12px", borderRadius: 8, border: 0, cursor: waterBottles > 0 ? "pointer" : "not-allowed" }}>
                            💧 Drink Water ({waterBottles}) +35 Thirst
                        </button>
                    </div>
                    <h3>🛠️ Crafting</h3>
                    <div className="crafting-item">
                        <div>
                            <strong>🪓 Wooden Axe</strong>
                            <p>Required: 10 Wood</p>
                        </div>
                        <button
                            type="button"
                            onClick={craftAxe}
                            disabled={hasAxe || wood < 10}
                        >
                            {hasAxe ? "AXE CRAFTED" : wood < 10 ? "NEED 10 WOOD" : "CRAFT AXE"}
                        </button>
                    </div>
                </div>
                <span><b>W A S D</b> Move character</span>
                <span><b>E</b> Collect apples, water, or gather/chop wood</span>
                <span><b>Inventory buttons</b> Eat apple / drink water</span>
                <span><b>Follow Camera</b> Camera follows player</span>
            </div>

            {gameOver && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(3, 7, 18, 0.82)", padding: 20
                }}>
                    <div style={{
                        width: "min(420px, 100%)", textAlign: "center",
                        padding: "32px 26px", borderRadius: 18,
                        color: "#f8fafc", background: "#111827",
                        border: "1px solid rgba(255,255,255,0.16)",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
                    }}>
                        <div style={{ fontSize: 48, marginBottom: 8 }}>💀</div>
                        <h2 style={{ margin: "0 0 10px", fontSize: 30 }}>YOU DIED</h2>
                        <p style={{ margin: "0 0 22px", color: "#cbd5e1", lineHeight: 1.5 }}>
                            Your survival journey has ended. Try again and stay alive.
                        </p>
                        <button
                            type="button"
                            onClick={restartGame}
                            style={{
                                border: 0, borderRadius: 10, padding: "12px 22px",
                                fontWeight: 800, cursor: "pointer",
                                color: "#111827", background: "#a3e635"
                            }}
                        >
                            ↻ TRY AGAIN
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
