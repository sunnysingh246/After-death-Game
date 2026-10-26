import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NIGHT_SPAWNS = [
    [-10, 0, -8],
    [11, 0, -7],
    [-12, 0, 8],
    [10, 0, 11],
];

function ZombieModel({ zombie, registerRef }) {
    const groupRef = useRef();

    useEffect(() => {
        registerRef(zombie.id, groupRef.current);
        return () => registerRef(zombie.id, null);
    }, [zombie.id, registerRef]);

    return (
        <group ref={groupRef} position={zombie.position} scale={1}>
            {/* Head */}
            <mesh position={[0, 1.65, 0]} castShadow>
                <boxGeometry args={[0.48, 0.48, 0.42]} />
                <meshStandardMaterial color="#78916a" roughness={1} />
            </mesh>
            {/* Glowing eyes */}
            <mesh position={[-0.12, 1.7, -0.215]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#ff3030" />
            </mesh>
            <mesh position={[0.12, 1.7, -0.215]}>
                <sphereGeometry args={[0.045, 8, 8]} />
                <meshBasicMaterial color="#ff3030" />
            </mesh>
            {/* Torso */}
            <mesh position={[0, 1.05, 0]} castShadow>
                <boxGeometry args={[0.62, 0.78, 0.36]} />
                <meshStandardMaterial color="#526b4c" roughness={1} />
            </mesh>
            {/* Arms */}
            <mesh position={[-0.43, 1.05, -0.02]} rotation={[0, 0, -0.35]} castShadow>
                <boxGeometry args={[0.2, 0.68, 0.22]} />
                <meshStandardMaterial color="#78916a" roughness={1} />
            </mesh>
            <mesh position={[0.43, 1.05, -0.02]} rotation={[0, 0, 0.35]} castShadow>
                <boxGeometry args={[0.2, 0.68, 0.22]} />
                <meshStandardMaterial color="#78916a" roughness={1} />
            </mesh>
            {/* Legs */}
            <mesh position={[-0.17, 0.38, 0]} castShadow>
                <boxGeometry args={[0.23, 0.55, 0.27]} />
                <meshStandardMaterial color="#39483b" roughness={1} />
            </mesh>
            <mesh position={[0.17, 0.38, 0]} castShadow>
                <boxGeometry args={[0.23, 0.55, 0.27]} />
                <meshStandardMaterial color="#39483b" roughness={1} />
            </mesh>
        </group>
    );
}

export default function ZombieSystem({
    playerPosition,
    isNight,
    hasAxe,
    disabled,
    onPlayerDamage,
    onMessage,
}) {
    const [zombies, setZombies] = useState([]);
    const zombieRefs = useRef({});
    const attackCooldowns = useRef({});
    const lastNightState = useRef(false);
    const playerRef = useRef(new THREE.Vector3());

    useEffect(() => {
        if (isNight && !lastNightState.current) {
            setZombies(
                NIGHT_SPAWNS.map((position, index) => ({
                    id: `night-zombie-${Date.now()}-${index}`,
                    position: [...position],
                    health: 100,
                }))
            );
            onMessage?.("🌙 Night has fallen! Zombies are approaching...");
        } else if (!isNight && lastNightState.current) {
            setZombies([]);
            zombieRefs.current = {};
            attackCooldowns.current = {};
            onMessage?.("🌅 Sunrise! The zombies have disappeared.");
        }
        lastNightState.current = isNight;
    }, [isNight, onMessage]);

    const registerRef = useCallback((id, object) => {
        if (object) zombieRefs.current[id] = object;
        else delete zombieRefs.current[id];
    }, []);

    useFrame((_, delta) => {
        if (!isNight || disabled) return;

        playerRef.current.set(playerPosition?.x ?? 0, 0, playerPosition?.z ?? 0);

        for (const zombie of zombies) {
            const object = zombieRefs.current[zombie.id];
            if (!object) continue;

            const dx = playerRef.current.x - object.position.x;
            const dz = playerRef.current.z - object.position.z;
            const distance = Math.hypot(dx, dz);

            // Slow chase once the player comes within detection range.
            if (distance < 13 && distance > 1.15) {
                const step = Math.min(1.05 * delta, distance);
                object.position.x += (dx / distance) * step;
                object.position.z += (dz / distance) * step;
                object.rotation.y = Math.atan2(-dx, -dz);
            }

            // Damage the player while a zombie is close, with a cooldown.
            const now = performance.now();
            if (distance <= 1.45 && now - (attackCooldowns.current[zombie.id] || 0) > 1400) {
                attackCooldowns.current[zombie.id] = now;
                onPlayerDamage?.(8);
            }
        }
    });

    useEffect(() => {
        const handleCombat = (event) => {
            if (event.code !== "KeyF" || event.repeat || disabled || !isNight) return;

            if (!hasAxe) {
                onMessage?.("🪓 Craft an axe first! Press F to attack zombies.");
                return;
            }

            const playerX = playerPosition?.x ?? 0;
            const playerZ = playerPosition?.z ?? 0;
            let nearest = null;
            let nearestDistance = 2.6;

            for (const zombie of zombies) {
                const object = zombieRefs.current[zombie.id];
                if (!object) continue;
                const distance = Math.hypot(object.position.x - playerX, object.position.z - playerZ);
                if (distance < nearestDistance) {
                    nearest = zombie;
                    nearestDistance = distance;
                }
            }

            if (!nearest) {
                onMessage?.("No zombie in range. Move closer!");
                return;
            }

            setZombies((current) => current.filter((zombie) => zombie.id !== nearest.id));
            delete zombieRefs.current[nearest.id];
            delete attackCooldowns.current[nearest.id];
            onMessage?.("🪓 Zombie defeated!");
        };

        window.addEventListener("keydown", handleCombat);
        return () => window.removeEventListener("keydown", handleCombat);
    }, [disabled, hasAxe, isNight, onMessage, playerPosition, zombies]);

    if (!isNight || disabled) return null;

    return (
        <>
            {zombies.map((zombie) => (
                <ZombieModel key={zombie.id} zombie={zombie} registerRef={registerRef} />
            ))}
        </>
    );
}
