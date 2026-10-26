import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Survivor from "./Survivor";
import WoodChips from "./WoodChips";

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

function Player({ onPositionChange, isChopping, onAxeSwing, onAxeHit, disabled }) {
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
        const isMoving = direction.current.lengthSq() > 0 && !isChopping && !disabled;

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
    onFoodCollected,
    onWaterCollected,
    disabled,
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
    const [supplies, setSupplies] = useState([
        { id: "apple-1", type: "food", position: [-5, 0, -4] },
        { id: "apple-2", type: "food", position: [4, 0, -6] },
        { id: "apple-3", type: "food", position: [-7, 0, 4] },
        { id: "water-1", type: "water", position: [2, 0, 4] },
        { id: "water-2", type: "water", position: [8, 0, 7] },
        { id: "water-3", type: "water", position: [-6, 0, -8] },
    ]);
    const [nearbySupplyId, setNearbySupplyId] = useState(null);
    const nearbySupplyIdRef = useRef(null);
    const suppliesRef = useRef(supplies);
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
        suppliesRef.current = supplies;
    }, [supplies]);

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

        let closestSupplyId = null;
        let supplyDistance = 2.4;
        for (const supply of suppliesRef.current) {
            const [sx, , sz] = supply.position;
            const distance = Math.hypot(position.x - sx, position.z - sz);
            if (distance < supplyDistance) {
                supplyDistance = distance;
                closestSupplyId = supply.id;
            }
        }
        nearbySupplyIdRef.current = closestSupplyId;
        setNearbySupplyId((previousId) => previousId === closestSupplyId ? previousId : closestSupplyId);

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
        if (choppingTreeId === null || disabled) return undefined;

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
    }, [choppingTreeId, disabled, onWoodCollected, onMessage, onTreeFall, setIsChopping]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (disabled || event.code !== "KeyE" || event.repeat) return;

            // If already chopping, E cancels the action.
            if (choppingTreeIdRef.current !== null) {
                setChoppingTreeId(null);
                choppingTreeIdRef.current = null;
                setChopProgress(0);
                setIsChopping(false);
                onMessage?.("Chopping cancelled.");
                return;
            }

            const supplyId = nearbySupplyIdRef.current;
            if (supplyId !== null) {
                const supply = suppliesRef.current.find((item) => item.id === supplyId);
                if (supply) {
                    suppliesRef.current = suppliesRef.current.filter((item) => item.id !== supplyId);
                    setSupplies(suppliesRef.current);
                    setNearbySupplyId(null);
                    nearbySupplyIdRef.current = null;
                    if (supply.type === "food") {
                        onFoodCollected?.(1);
                        onMessage?.("🍎 Apple collected! Hunger restored.");
                    } else {
                        onWaterCollected?.(1);
                        onMessage?.("💧 Water bottle collected! Thirst restored.");
                    }
                    return;
                }
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
    }, [disabled, hasAxe, onWoodCollected, onMessage, setIsChopping, onFoodCollected, onWaterCollected]);

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

            {supplies.map((supply) => {
                const isNearby = nearbySupplyId === supply.id;
                const isFood = supply.type === "food";
                return (
                    <group key={supply.id} position={supply.position}>
                        {isFood ? (
                            <group position={[0.38, 2.0, 0.22]}>
                                {/* Apple hanging from the tree canopy */}
                                <mesh castShadow>
                                    <sphereGeometry args={[0.19, 16, 14]} />
                                    <meshStandardMaterial color="#d71920" roughness={0.38} metalness={0.02} />
                                </mesh>
                                <mesh position={[0, 0.18, 0]} rotation={[0, 0, -0.22]}>
                                    <cylinderGeometry args={[0.018, 0.025, 0.12, 6]} />
                                    <meshStandardMaterial color="#5b3924" roughness={1} />
                                </mesh>
                                <mesh position={[0.08, 0.15, 0.015]} rotation={[0, 0, -0.55]}>
                                    <sphereGeometry args={[0.07, 8, 6]} />
                                    <meshStandardMaterial color="#4f8f3a" roughness={0.8} />
                                </mesh>
                            </group>
                        ) : (
                            <group position={[0, 0.45, 0]}>
                                <mesh castShadow>
                                    <cylinderGeometry args={[0.16, 0.16, 0.55, 12]} />
                                    <meshStandardMaterial color="#60a5fa" transparent opacity={0.8} roughness={0.2} />
                                </mesh>
                                <mesh position={[0, 0.3, 0]}>
                                    <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
                                    <meshStandardMaterial color="#e2e8f0" />
                                </mesh>
                            </group>
                        )}
                        {isNearby && (
                            <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <ringGeometry args={[0.55, 0.72, 24]} />
                                <meshBasicMaterial color={isFood ? "#f87171" : "#38bdf8"} side={THREE.DoubleSide} />
                            </mesh>
                        )}
                    </group>
                );
            })}

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
                disabled={disabled}
            />
        </>
    );
}

export default Environment;
