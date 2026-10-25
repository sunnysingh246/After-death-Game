import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import Survivor from "./Survivor";

// Tree component
function WorldTree({ position, scale = 1 }) {
    return (<group position={position} scale={scale}>
        <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.2, 1.3, 8]} /> <meshStandardMaterial color="#755039" /> </mesh>


        <mesh position={[0, 1.6, 0]} castShadow>
            <coneGeometry args={[0.85, 1.8, 8]} />
            <meshStandardMaterial color="#4e8050" />
        </mesh>

        <mesh position={[0, 2.15, 0]} castShadow>
            <coneGeometry args={[0.58, 1.3, 8]} />
            <meshStandardMaterial color="#6a9c5b" />
        </mesh>
    </group>


    );
}

// Rock component
function Rock({ position, scale = 1 }) {
    return (<mesh position={position} scale={scale} castShadow>
        <dodecahedronGeometry args={[0.6, 0]} /> <meshStandardMaterial color="#777b73" roughness={1} /> </mesh>
    );
}

// Controllable player
function Player({ onPositionChange }) {
    const player = useRef();
    const keys = useRef({});
    const direction = useRef(new THREE.Vector3());
    const cameraTarget = useRef(new THREE.Vector3());
    const { camera } = useThree();

    const [moving, setMoving] = useState(false);
    const movingRef = useRef(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            const key = event.key.toLowerCase();


            if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
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
            Number(input.d || input.arrowright) -
            Number(input.a || input.arrowleft);

        const z =
            Number(input.s || input.arrowdown) -
            Number(input.w || input.arrowup);

        direction.current.set(x, 0, z);

        const isMoving = direction.current.lengthSq() > 0;

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

        // Keep player inside the world
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

        if (movingRef.current !== isMoving) {
            movingRef.current = isMoving;
            setMoving(isMoving);
        }

        // Follow camera
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

        onPositionChange({
            x: Math.round(player.current.position.x * 10) / 10,
            z: Math.round(player.current.position.z * 10) / 10,
        });


    });

    return (<group ref={player}>
        <group
            position={[0, moving ? Math.abs(Math.sin(performance.now() * 0.01)) * 0.06 : 0, 0]}
        > <Survivor /> </group>


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

// Environment
function Environment({ onPositionChange }) {
    const [trees, setTrees] = useState([
        { id: 1, position: [-7, 0, -5] },
        { id: 2, position: [-10, 0, 2] },
        { id: 3, position: [8, 0, -7] },
        { id: 4, position: [12, 0, 1] },
        { id: 5, position: [-15, 0, -12] },
        { id: 6, position: [17, 0, -13] },
        { id: 7, position: [4, 0, 14] },
        { id: 8, position: [-12, 0, 15] },
    ]);

    const rocks = [
        [-4, 0.35, -3],
        [5, 0.3, -8],
        [11, 0.25, 6],
        [-16, 0.3, 0],
        [15, 0.3, -2],
    ];

    useEffect(() => {
        const handleCollect = (event) => {
            if (event.key.toLowerCase() !== "e") return;

            const playerElement = document.querySelector(
                "[data-player-position]"
            );

            if (!playerElement) return;
        };

        window.addEventListener("keydown", handleCollect);

        return () => {
            window.removeEventListener("keydown", handleCollect);
        };
    }, []);

    return (
        <> <ambientLight intensity={1.4} />

            <directionalLight
                position={[8, 14, 6]}
                intensity={2}
                castShadow
            />

            {/* Ground */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.05, 0]}
                receiveShadow
            >
                <planeGeometry args={[60, 60]} />
                <meshStandardMaterial color="#89966a" roughness={1} />
            </mesh>

            {/* Ground decoration */}
            <gridHelper
                args={[60, 30, "#71815b", "#7d8b65"]}
                position={[0, 0, 0]}
            />

            {trees.map((position, index) => (
                <WorldTree
                    key={index}
                    position={position}
                    scale={0.8 + (index % 3) * 0.2}
                />
            ))}

            {rocks.map((position, index) => (
                <Rock key={index} position={position} />
            ))}

            <Player onPositionChange={onPositionChange} />
        </>


    );
}

// Main 3D game component
export default function Game3D() {
    const [position, setPosition] = useState({ x: 0, z: 0 });
    const [wood, setWood] = useState(0);
    const [message, setMessage] = useState("");

    return (<div className="game3d"> <div className="game3d-hud"> <div> <strong>AFTER DEATH</strong> <span>WASTELAND · SECTOR 07</span> </div>


        <div className="player-coordinates">
            X: {position.x} · Z: {position.z}
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

                <Environment onPositionChange={setPosition} />

                <OrbitControls
                    enablePan={false}
                    enableZoom
                    minPolarAngle={0.3}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={5}
                    maxDistance={15}
                    target={[0, 1, 0]}
                />
            </Canvas>
        </div>

        <div className="game3d-controls">
            <span><b>W A S D</b> Move character</span>
            <span><b>Mouse</b> Camera controls</span>
            <span><b>Scroll</b> Zoom</span>
        </div>
    </div>


    );
}
