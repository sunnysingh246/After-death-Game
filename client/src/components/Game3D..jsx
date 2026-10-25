import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Survivor from "./Survivor";
import WoodChips from "./WoodChips";

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

function WorldTree({ fallProgress = 0, hitCount = 0 }) {
    const treeRef = useRef();
    const shakeRef = useRef();
    const previousHit = useRef(hitCount);
    const shakeTime = useRef(0);

    useEffect(() => {
        if (hitCount !== previousHit.current) {
            previousHit.current = hitCount;
            shakeTime.current = 0.22;
        }
    }, [hitCount]);

    useFrame((_, delta) => {
        if (!treeRef.current || !shakeRef.current) return;

        if (shakeTime.current > 0) {
            shakeTime.current -= delta;
            const strength = THREE.MathUtils.clamp(shakeTime.current / 0.22, 0, 1);
            const oscillation = Math.sin((1 - strength) * Math.PI * 8);
            shakeRef.current.rotation.x = oscillation * strength * 0.08;
            shakeRef.current.rotation.z = oscillation * strength * 0.12;
        } else {
            shakeRef.current.rotation.x = 0;
            shakeRef.current.rotation.z = 0;
        }

        // The tree tips over during the final part of the chopping sequence.
        const fall = THREE.MathUtils.clamp(fallProgress, 0, 1);
        const easedFall = THREE.MathUtils.smoothstep(fall, 0, 1);
        const targetFallAngle = -easedFall * (Math.PI * 0.49);
        treeRef.current.rotation.z = THREE.MathUtils.lerp(
            treeRef.current.rotation.z,
            targetFallAngle,
            1 - Math.exp(-9 * delta)
        );
    });

    return (
        <group ref={treeRef} position={[0, 0, 0]}>
            <group ref={shakeRef}>
                {/* Trunk */}
                <mesh position={[0, 0.65, 0]} castShadow>
                    <cylinderGeometry args={[0.13, 0.2, 1.3, 8]} />
                    <meshStandardMaterial color="#755039" roughness={1} />
                </mesh>

                {/* Lower leaves */}
                <mesh position={[0, 1.6, 0]} castShadow>
                    <coneGeometry args={[0.85, 1.8, 8]} />
                    <meshStandardMaterial color="#4e8050" roughness={1} />
                </mesh>

                {/* Upper leaves */}
                <mesh position={[0, 2.15, 0]} castShadow>
                    <coneGeometry args={[0.58, 1.3, 8]} />
                    <meshStandardMaterial color="#6a9c5b" roughness={1} />
                </mesh>
            </group>
        </group>
    );
}

function Rock({ position, scale = 1 }) {
    return (
        <mesh position={position} scale={scale} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.6, 0]} />
            <meshStandardMaterial color="#777b73" roughness={1} />
        </mesh>
    );
}

function Player({ onPositionChange, isChopping, onAxeSwing, onAxeHit }) {
    const player = useRef();
    const keys = useRef({});
    const direction = useRef(new THREE.Vector3());
    const cameraTarget = useRef(new THREE.Vector3());
    const visual = useRef();
    const walkTime = useRef(0);
    const { camera } = useThree();

    useEffect(() => {
        const allowedKeys = [
            "w", "a", "s", "d",
            "arrowup", "arrowdown", "arrowleft", "arrowright",
        ];

        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();
            if (allowedKeys.includes(key)) {
                event.preventDefault();
                keys.current[key] = true;
            }
        };

        const handleKeyUp = (event) => {
            keys.current[event.key.toLowerCase()] = false;
        };

        const handleBlur = () => {
            keys.current = {};
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleBlur);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    useFrame((_, delta) => {
        if (!player.current) return;

        const input = keys.current;
        const x =
            Number(Boolean(input.d || input.arrowright)) -
            Number(Boolean(input.a || input.arrowleft));
        const z =
            Number(Boolean(input.s || input.arrowdown)) -
            Number(Boolean(input.w || input.arrowup));

        direction.current.set(x, 0, z);
        const isMoving = direction.current.lengthSq() > 0 && !isChopping;

        if (isMoving) {
            direction.current.normalize();
            player.current.position.addScaledVector(
                direction.current,
                5 * Math.min(delta, 0.05)
            );
            player.current.rotation.y = Math.atan2(
                -direction.current.x,
                -direction.current.z
            );
        }

        player.current.position.x = THREE.MathUtils.clamp(player.current.position.x, -24, 24);
        player.current.position.z = THREE.MathUtils.clamp(player.current.position.z, -24, 24);

        walkTime.current += delta * (isMoving ? 10 : 0);
        if (visual.current) {
            visual.current.userData.moving = isMoving;
            visual.current.position.y = isMoving
                ? Math.abs(Math.sin(walkTime.current * 2)) * 0.07
                : THREE.MathUtils.damp(visual.current.position.y, 0, 12, delta);
        }

        onPositionChange?.(player.current.position);

        cameraTarget.current.set(
            player.current.position.x,
            player.current.position.y + 1.5,
            player.current.position.z
        );

        const desiredCamera = new THREE.Vector3(
            player.current.position.x,
            player.current.position.y + 5,
            player.current.position.z + 7
        );

        camera.position.lerp(
            desiredCamera,
            1 - Math.exp(-5 * Math.min(delta, 0.05))
        );
        camera.lookAt(cameraTarget.current);
    });

    return (
        <group ref={player}>
            <group ref={visual}>
                <Survivor
                    isChopping={isChopping}
                    onAxeSwing={onAxeSwing}
                    onAxeHit={onAxeHit}
                />
            </group>

            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.46, 24]} />
                <meshBasicMaterial color="#d0ed9c" />
            </mesh>
        </group>
    );
}

function Environment({
    onPositionChange,
    onWoodCollected,
    onMessage,
    hasAxe,
    isChopping,
    setIsChopping,
    onAxeSwing,
    onAxeHit,
    onTreeFall,
}) {
    const [trees, setTrees] = useState([
        { id: 1, position: [-5, 0, -4] },
        { id: 2, position: [4, 0, -6] },
        { id: 3, position: [7, 0, 2] },
        { id: 4, position: [-7, 0, 4] },
        { id: 5, position: [1, 0, 7] },
        { id: 6, position: [-3, 0, 8] },
        { id: 7, position: [9, 0, -3] },
        { id: 8, position: [-9, 0, -7] },
    ]);
    const [nearbyTreeId, setNearbyTreeId] = useState(null);
    const [choppingTreeId, setChoppingTreeId] = useState(null);
    const [chopProgress, setChopProgress] = useState(0);
    const [hitCounts, setHitCounts] = useState({});
    const treesRef = useRef(trees);
    const nearbyTreeIdRef = useRef(null);
    const choppingTreeIdRef = useRef(null);
    const chopStartRef = useRef(0);
    const finishingRef = useRef(false);
    const [woodChipEffects, setWoodChipEffects] = useState([]);
    const effectId = useRef(0);

    useEffect(() => {
        treesRef.current = trees;
    }, [trees]);

    useEffect(() => {
        choppingTreeIdRef.current = choppingTreeId;
    }, [choppingTreeId]);

    const updatePlayerPosition = useCallback((position) => {
        let closestTreeId = null;
        let closestDistance = 2.5;

        for (const tree of treesRef.current) {
            const [treeX, , treeZ] = tree.position;
            const distance = Math.hypot(position.x - treeX, position.z - treeZ);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestTreeId = tree.id;
            }
        }

        nearbyTreeIdRef.current = closestTreeId;
        setNearbyTreeId((previousId) =>
            previousId === closestTreeId ? previousId : closestTreeId
        );

        onPositionChange?.({
            x: Math.round(position.x * 10) / 10,
            z: Math.round(position.z * 10) / 10,
        });
    }, [onPositionChange]);

    const handleAxeHit = useCallback(() => {
        onAxeHit?.();

        const targetId = choppingTreeIdRef.current;

        if (targetId === null) return;

        const targetTree = treesRef.current.find(
            (tree) => tree.id === targetId
        );

        if (!targetTree) return;

        setHitCounts((previous) => ({
            ...previous,
            [targetId]: (previous[targetId] || 0) + 1,
        }));

        const [treeX, , treeZ] = targetTree.position;

        const id = ++effectId.current;

        setWoodChipEffects((previous) => [
            ...previous,
            {
                id,
                position: [treeX, 0.9, treeZ],
            },
        ]);
    }, [onAxeHit]);

    // When chopping starts, update progress smoothly and finish after the tree falls.
    useEffect(() => {
        if (choppingTreeId === null) return undefined;

        chopStartRef.current = performance.now();
        finishingRef.current = false;

        const interval = window.setInterval(() => {
            const elapsed = performance.now() - chopStartRef.current;
            const progress = Math.min(elapsed / 3400, 1);
            setChopProgress(progress);

            if (progress >= 1 && !finishingRef.current) {
                finishingRef.current = true;
                const targetId = choppingTreeId;

                window.setTimeout(() => {
                    setTrees((previousTrees) =>
                        previousTrees.filter((tree) => tree.id !== targetId)
                    );
                    treesRef.current = treesRef.current.filter((tree) => tree.id !== targetId);
                    nearbyTreeIdRef.current = null;
                    setNearbyTreeId(null);
                    setChoppingTreeId(null);
                    choppingTreeIdRef.current = null;
                    setChopProgress(0);
                    setHitCounts((previous) => {
                        const next = { ...previous };
                        delete next[targetId];
                        return next;
                    });
                    setIsChopping(false);
                    onWoodCollected?.(15);
                    onTreeFall?.();
                    onMessage?.("🌳 Tree felled! +15 Wood");
                }, 80);
            }
        }, 50);

        return () => window.clearInterval(interval);
    }, [choppingTreeId, onWoodCollected, onMessage, onTreeFall, setIsChopping]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.code !== "KeyE" || event.repeat) return;

            // If already chopping, E cancels the action.
            if (choppingTreeIdRef.current !== null) {
                setChoppingTreeId(null);
                choppingTreeIdRef.current = null;
                setChopProgress(0);
                setIsChopping(false);
                onMessage?.("Chopping cancelled.");
                return;
            }

            const targetTreeId = nearbyTreeIdRef.current;
            if (targetTreeId === null) {
                onMessage?.("No tree nearby! Move closer to a tree.");
                return;
            }

            if (!hasAxe) {
                // Let the player gather starter wood before crafting an axe.
                const updatedTrees = treesRef.current.filter((tree) => tree.id !== targetTreeId);
                treesRef.current = updatedTrees;
                setTrees(updatedTrees);
                nearbyTreeIdRef.current = null;
                setNearbyTreeId(null);
                onWoodCollected?.(15);
                onMessage?.("🪵 Gathered 15 starter wood. Craft an axe to chop trees!");
                return;
            }

            choppingTreeIdRef.current = targetTreeId;
            setChoppingTreeId(targetTreeId);
            setChopProgress(0);
            setIsChopping(true);
            onMessage?.("🪓 Chopping tree... Press E again to cancel.");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [hasAxe, onWoodCollected, onMessage, setIsChopping]);

    const fallProgress = chopProgress < 0.82
        ? 0
        : (chopProgress - 0.82) / 0.18;

    return (
        <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#527d42" />
            </mesh>

            <gridHelper args={[100, 100, "#76985a", "#64874d"]} />

            {trees.map((tree) => {
                const isTarget = tree.id === choppingTreeId;
                return (
                    <group key={tree.id} position={tree.position}>
                        <WorldTree
                            fallProgress={isTarget ? fallProgress : 0}
                            hitCount={hitCounts[tree.id] || 0}
                        />

                        {nearbyTreeId === tree.id && !isTarget && (
                            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <ringGeometry args={[1.1, 1.35, 32]} />
                                <meshBasicMaterial color="#facc15" side={THREE.DoubleSide} />
                            </mesh>
                        )}

                        {isTarget && (
                            <mesh position={[0, 3.2, 0]}>
                                <planeGeometry args={[1.8, 0.12]} />
                                <meshBasicMaterial color="#252d24" side={THREE.DoubleSide} />
                            </mesh>
                        )}
                    </group>
                );
            })}

            {woodChipEffects.map((effect) => (
                <WoodChips
                    key={effect.id}
                    position={effect.position}
                    onComplete={() => setWoodChipEffects((previous) =>
                        previous.filter((item) => item.id !== effect.id)
                    )}
                />
            ))}

            <Rock position={[-4, 0, 2]} />
            <Rock position={[5, 0, 5]} />
            <Rock position={[8, 0, -8]} />
            <Rock position={[-8, 0, 0]} />

            <Player
                onPositionChange={updatePlayerPosition}
                isChopping={isChopping}
                onAxeSwing={onAxeSwing}
                onAxeHit={handleAxeHit}
            />
        </>
    );
}

export default function Game3D() {
    const [position, setPosition] = useState({ x: 0, z: 0 });
    const [wood, setWood] = useState(0);
    const [hasAxe, setHasAxe] = useState(false);
    const [isChopping, setIsChopping] = useState(false);
    const [message, setMessage] = useState("");
    const [chopSoundEnabled, setChopSoundEnabled] = useState(true);
    const messageTimeout = useRef(null);
    const ambienceRef = useRef(null);
    const ambienceStartedRef = useRef(false);

    const showMessage = useCallback((text) => {
        setMessage(text);
        if (messageTimeout.current) clearTimeout(messageTimeout.current);
        messageTimeout.current = setTimeout(() => setMessage(""), 2500);
    }, []);

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
                    <span>{hasAxe ? "🪓 Axe: Equipped" : "🪓 Axe: Not Crafted"}</span>
                    <button type="button" onClick={toggleSound} className="sound-toggle">
                        {chopSoundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
                    </button>
                </div>
            </div>

            <div className="game3d-canvas">
                <Canvas
                    shadows
                    camera={{ position: [0, 5, 7], fov: 55 }}
                    dpr={[1, 1.5]}
                >
                    <color attach="background" args={["#c6d5bd"]} />
                    <fog attach="fog" args={["#c6d5bd", 25, 55]} />
                    <ambientLight intensity={1.5} />
                    <directionalLight position={[10, 15, 5]} intensity={2} castShadow />

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
                <span><b>E</b> Gather wood / Chop tree</span>
                <span><b>Follow Camera</b> Camera follows player</span>
            </div>
        </div>
    );
}
