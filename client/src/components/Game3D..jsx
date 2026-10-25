
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Survivor from "./Survivor";

// ---------------- TREE COMPONENT ----------------
function WorldTree() {
    return (
        <group>
            {/* Tree trunk */}
            <mesh position={[0, 0.65, 0]} castShadow>
                <cylinderGeometry args={[0.13, 0.2, 1.3, 8]} />
                <meshStandardMaterial color="#755039" />
            </mesh>

            {/* Lower leaves */}
            <mesh position={[0, 1.6, 0]} castShadow>
                <coneGeometry args={[0.85, 1.8, 8]} />
                <meshStandardMaterial color="#4e8050" />
            </mesh>

            {/* Upper leaves */}
            <mesh position={[0, 2.15, 0]} castShadow>
                <coneGeometry args={[0.58, 1.3, 8]} />
                <meshStandardMaterial color="#6a9c5b" />
            </mesh>
        </group>
    );
}

// ---------------- ROCK COMPONENT ----------------
function Rock({ position, scale = 1 }) {
    return (
        <mesh position={position} scale={scale} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.6, 0]} />
            <meshStandardMaterial color="#777b73" roughness={1} />
        </mesh>
    );
}

// ---------------- PLAYER COMPONENT ----------------
function Player({ onPositionChange }) {
    const player = useRef();
    const keys = useRef({});
    const direction = useRef(new THREE.Vector3());
    const cameraTarget = useRef(new THREE.Vector3());
   

    const { camera } = useThree();

    const [moving, setMoving] = useState(false);
    const movingRef = useRef(false);

    // Keyboard movement
  useEffect(() => {
    const handleKeyDown = (event) => {
        const key = event.key.toLowerCase();

        if (
            ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)
        ) {
            keys.current[key] = true;
        }
    };

    const handleKeyUp = (event) => {
        const key = event.key.toLowerCase();
        keys.current[key] = false;
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

    // 1. Read keyboard input
    const input = keys.current;

    // 2. Calculate movement direction
    const x =
        Number(Boolean(input.d || input.arrowright)) -
        Number(Boolean(input.a || input.arrowleft));

    const z =
        Number(Boolean(input.s || input.arrowdown)) -
        Number(Boolean(input.w || input.arrowup));

    direction.current.set(x, 0, z);

    const isMoving = direction.current.lengthSq() > 0;

    // 3. Move the player
    if (isMoving) {
        direction.current.normalize();

        player.current.position.addScaledVector(
            direction.current,
            5 * Math.min(delta, 0.05)
        );

        // Turn the player toward the movement direction
        player.current.rotation.y = Math.atan2(
            -direction.current.x,
            -direction.current.z
        );
    }

    // 4. Keep the player inside the world
    player.current.position.x = THREE.MathUtils.clamp(
        player.current.position.x,
        -24,
        24
    );

    player.current.position.z = THREE.MathUtils.clamp(
        player.current.position.z,
        -24,
        24
    );

    // 5. Update movement animation state
    if (movingRef.current !== isMoving) {
        movingRef.current = isMoving;
        setMoving(isMoving);
    }

    // 6. Report player position
    onPositionChange?.(player.current.position);

    // 7. Make the camera follow the player
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
            <group
                position={[
                    0,
                    moving ? Math.abs(Math.sin(performance.now() * 0.01)) * 0.06 : 0,
                    0,
                ]}
            >
                <Survivor />
            </group>

            {/* Player ground marker */}
            <mesh
                position={[0, 0.025, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
            >
                <ringGeometry args={[0.4, 0.46, 24]} />
                <meshBasicMaterial color="#d0ed9c" />
            </mesh>
        </group>
    );
}

// ---------------- ENVIRONMENT COMPONENT ----------------
function Environment({ onPositionChange, onWoodCollected, onMessage }) {
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

    // Refs keep the latest tree data available to keyboard events
    const treesRef = useRef(trees);
    const nearbyTreeIdRef = useRef(null);

    useEffect(() => {
        treesRef.current = trees;
    }, [trees]);

    // Find the nearest tree
    const updatePlayerPosition = useCallback(
        (position) => {
            let closestTreeId = null;
            let closestDistance = 2.5;

            for (const tree of treesRef.current) {
                const [treeX, , treeZ] = tree.position;

                const distance = Math.hypot(
                    position.x - treeX,
                    position.z - treeZ
                );

                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTreeId = tree.id;
                }
            }

            nearbyTreeIdRef.current = closestTreeId;

            setNearbyTreeId((previousId) =>
                previousId === closestTreeId
                    ? previousId
                    : closestTreeId
            );

            onPositionChange?.({
                x: Math.round(position.x * 10) / 10,
                z: Math.round(position.z * 10) / 10,
            });
        },
        [onPositionChange]
    );

    // Collect wood by pressing E
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.code !== "KeyE" || event.repeat) return;

            const targetTreeId = nearbyTreeIdRef.current;

            if (targetTreeId === null) {
                onMessage?.("No tree nearby! Move closer to a tree.");
                return;
            }

            const targetTree = treesRef.current.find(
                (tree) => tree.id === targetTreeId
            );

            if (!targetTree) return;

            // Remove the collected tree
            const updatedTrees = treesRef.current.filter(
                (tree) => tree.id !== targetTreeId
            );

            treesRef.current = updatedTrees;
            setTrees(updatedTrees);

            nearbyTreeIdRef.current = null;
            setNearbyTreeId(null);

            // Give player 10 wood
            onWoodCollected?.(10);
            onMessage?.("🌲 Tree collected! +10 Wood");
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onWoodCollected, onMessage]);

    return (
        <>
            {/* Ground */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.05, 0]}
                receiveShadow
            >
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="#527d42" />
            </mesh>

            {/* Ground grid */}
            <gridHelper args={[100, 100, "#76985a", "#64874d"]} />

            {/* Trees and nearby tree highlight */}
            {trees.map((tree) => (
                <group key={tree.id} position={tree.position}>
                    <WorldTree />

                    {nearbyTreeId === tree.id && (
                        <mesh
                            position={[0, 0.03, 0]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <ringGeometry args={[1.1, 1.35, 32]} />
                            <meshBasicMaterial
                                color="#facc15"
                                side={THREE.DoubleSide}
                            />
                        </mesh>
                    )}
                </group>
            ))}

            {/* Rocks */}
            <Rock position={[-4, 0, 2]} />
            <Rock position={[5, 0, 5]} />
            <Rock position={[8, 0, -8]} />
            <Rock position={[-8, 0, 0]} />

            {/* Player */}
            <Player onPositionChange={updatePlayerPosition} />
        </>
    );
}

// ---------------- MAIN GAME COMPONENT ----------------
export default function Game3D() {
    const [position, setPosition] = useState({ x: 0, z: 0 });
    const [wood, setWood] = useState(0);
    const [message, setMessage] = useState("");

    const messageTimeout = useRef(null);

    const showMessage = useCallback((text) => {
        setMessage(text);

        if (messageTimeout.current) {
            clearTimeout(messageTimeout.current);
        }

        messageTimeout.current = setTimeout(() => {
            setMessage("");
        }, 2500);
    }, []);

    useEffect(() => {
        return () => {
            if (messageTimeout.current) {
                clearTimeout(messageTimeout.current);
            }
        };
    }, []);

    const collectWood = useCallback((amount) => {
        setWood((previousWood) => previousWood + amount);
    }, []);

    return (
        <div className="game3d">
            {/* Top HUD */}
            <div className="game3d-hud">
                <div>
                    <strong>AFTER DEATH</strong>
                    <span>WASTELAND · SECTOR 07</span>
                </div>

                <div className="player-coordinates">
                    X: {position.x} · Z: {position.z}
                </div>

                <div className="player-inventory">
                    🪵 Wood: {wood}
                </div>
            </div>

            {/* 3D World */}
            <div className="game3d-canvas">
                <Canvas
                    shadows
                    camera={{ position: [0, 5, 7], fov: 55 }}
                    dpr={[1, 1.5]}
                >
                    <color attach="background" args={["#c6d5bd"]} />
                    <fog attach="fog" args={["#c6d5bd", 25, 55]} />

                    <ambientLight intensity={1.5} />

                    <directionalLight
                        position={[10, 15, 5]}
                        intensity={2}
                        castShadow
                    />

                    <Environment
                        onPositionChange={setPosition}
                        onWoodCollected={collectWood}
                        onMessage={showMessage}
                    />
                </Canvas>
            </div>

            {/* Status message */}
            {message && (
                <div className="game3d-message">
                    {message}
                </div>
            )}

            {/* Controls */}
            <div className="game3d-controls">
                <span><b>W A S D</b> Move character</span>
                <span><b>E</b> Collect wood</span>
                <span><b>Follow Camera</b> Camera follows player</span>
            </div>
        </div>
    );
}
