import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Survivor from "./Survivor";
import WoodChips from "./WoodChips";

function createGroundTexture() {
    const size = 128;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const index = (y * size + x) * 4;
            const broadShade = Math.sin(x * 0.11 + Math.cos(y * 0.08)) * 10;
            const grain = Math.random() * 35;
            const damp = Math.random() > 0.91 ? 28 : 0;
            data[index] = 86 + broadShade + grain + damp;
            data[index + 1] = 91 + broadShade + grain;
            data[index + 2] = 70 + broadShade + grain * 0.7;
            data[index + 3] = 255;
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    texture.needsUpdate = true;
    return texture;
}

function createBarkTexture() {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const index = (y * size + x) * 4;
            const grain = Math.random() * 52;
            const groove = Math.sin(x * 0.8 + Math.sin(y * 0.14) * 2) * 18;
            const shade = Math.max(0, Math.min(255, 105 + grain + groove));
            data[index] = shade;
            data[index + 1] = shade * 0.78;
            data[index + 2] = shade * 0.59;
            data[index + 3] = 255;
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 3);
    texture.needsUpdate = true;
    return texture;
}

function createTrailShape() {
    const shape = new THREE.Shape();
    shape.moveTo(-2.1, -50);
    shape.quadraticCurveTo(-0.7, -20, -1.1, -5);
    shape.quadraticCurveTo(-2.2, 12, 0.6, 26);
    shape.quadraticCurveTo(1.2, 38, 0.2, 50);
    shape.lineTo(2.4, 50);
    shape.quadraticCurveTo(3.1, 34, 2.1, 24);
    shape.quadraticCurveTo(-0.1, 10, 1.2, -5);
    shape.quadraticCurveTo(1.6, -25, 2.1, -50);
    shape.closePath();
    return shape;
}

const groundTexture = createGroundTexture();
const barkTexture = createBarkTexture();
const trailShape = createTrailShape();

const BACKGROUND_TREES = Array.from({ length: 84 }, (_, index) => {
    const angle = index * 2.399963;
    const radius = 17 + (index % 6) * 3.8;
    return {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
        height: 8.5 + (index % 5) * 1.3,
        width: 1.35 + (index % 4) * 0.18,
        color: ["#1d3428", "#263d2c", "#304431", "#26372a"][index % 4],
    };
});

function setInstanceTransform(mesh, index, position, scale, rotation) {
    const transform = new THREE.Object3D();
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
}

export function Forest() {
    const trunkRef = useRef();
    const lowerCanopyRef = useRef();
    const middleCanopyRef = useRef();
    const upperCanopyRef = useRef();
    const rootsRef = useRef();
    const branchesRef = useRef();

    useLayoutEffect(() => {
        const { current: trunks } = trunkRef;
        const { current: lowerCanopies } = lowerCanopyRef;
        const { current: middleCanopies } = middleCanopyRef;
        const { current: upperCanopies } = upperCanopyRef;
        const { current: roots } = rootsRef;
        const { current: branches } = branchesRef;
        if (!trunks || !lowerCanopies || !middleCanopies || !upperCanopies || !roots || !branches) return;

        const leafColor = new THREE.Color();
        BACKGROUND_TREES.forEach((tree, index) => {
            const [x, , z] = tree.position;
            const { height, width } = tree;
            const rotation = index * 0.73;
            setInstanceTransform(trunks, index, [x, height * 0.29, z], [width * 0.22, height * 0.58, width * 0.22], [0, rotation, 0]);
            setInstanceTransform(lowerCanopies, index, [x, height * 0.61, z], [width * 0.69, height * 0.14, width * 0.69], [0, rotation, 0]);
            setInstanceTransform(middleCanopies, index, [x + Math.cos(rotation) * 0.22, height * 0.74, z + Math.sin(rotation) * 0.22], [width * 0.76, height * 0.15, width * 0.76], [0, rotation + 0.3, 0]);
            setInstanceTransform(upperCanopies, index, [x, height * 0.86, z], [width * 0.54, height * 0.13, width * 0.54], [0, rotation + 0.6, 0]);
            leafColor.set(tree.color);
            lowerCanopies.setColorAt(index, leafColor);
            middleCanopies.setColorAt(index, leafColor.clone().multiplyScalar(1.1));
            upperCanopies.setColorAt(index, leafColor.clone().multiplyScalar(1.2));

            for (let root = 0; root < 4; root += 1) {
                const angle = rotation + root * Math.PI / 2;
                setInstanceTransform(
                    roots,
                    index * 4 + root,
                    [x + Math.cos(angle) * width * 0.15, 0.15, z + Math.sin(angle) * width * 0.15],
                    [width * 0.13, 0.42, width * 0.13],
                    [Math.sin(angle) * -0.74, angle, Math.cos(angle) * 0.74]
                );
            }

            for (let branch = 0; branch < 3; branch += 1) {
                const angle = rotation + branch * (Math.PI * 2 / 3);
                setInstanceTransform(
                    branches,
                    index * 3 + branch,
                    [x + Math.cos(angle) * width * 0.14, height * (0.34 + branch * 0.1), z + Math.sin(angle) * width * 0.14],
                    [width * 0.12, height * 0.12, width * 0.12],
                    [Math.cos(angle) * 0.64, angle, Math.sin(angle) * 0.64]
                );
            }
        });

        [trunks, lowerCanopies, middleCanopies, upperCanopies, roots, branches].forEach((mesh) => {
            mesh.instanceMatrix.needsUpdate = true;
            if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            mesh.computeBoundingSphere();
        });
    }, []);

    return (
        <>
            <instancedMesh ref={trunkRef} args={[undefined, undefined, BACKGROUND_TREES.length]} castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.3, 1, 9]} />
                <meshStandardMaterial map={barkTexture} color="#8b7962" roughness={1} />
            </instancedMesh>
            <instancedMesh ref={lowerCanopyRef} args={[undefined, undefined, BACKGROUND_TREES.length]} castShadow>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={1} />
            </instancedMesh>
            <instancedMesh ref={middleCanopyRef} args={[undefined, undefined, BACKGROUND_TREES.length]} castShadow>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={1} />
            </instancedMesh>
            <instancedMesh ref={upperCanopyRef} args={[undefined, undefined, BACKGROUND_TREES.length]} castShadow>
                <sphereGeometry args={[1, 8, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={1} />
            </instancedMesh>
            <instancedMesh ref={rootsRef} args={[undefined, undefined, BACKGROUND_TREES.length * 4]} castShadow>
                <cylinderGeometry args={[0.035, 0.13, 0.8, 6]} />
                <meshStandardMaterial map={barkTexture} color="#76634e" roughness={1} />
            </instancedMesh>
            <instancedMesh ref={branchesRef} args={[undefined, undefined, BACKGROUND_TREES.length * 3]} castShadow>
                <cylinderGeometry args={[0.1, 0.19, 1, 5]} />
                <meshStandardMaterial map={barkTexture} color="#76634e" roughness={1} />
            </instancedMesh>
        </>
    );
}

export function ForestGround() {
    return (
        <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial map={groundTexture} color="#ffffff" roughness={0.96} />
            </mesh>
            <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <shapeGeometry args={[trailShape]} />
                <meshStandardMaterial map={groundTexture} color="#c2a982" roughness={0.84} />
            </mesh>
            {[
                [-2.8, -6.5, 0.72, 2.1], [2.9, 9.5, 0.88, 2.7],
                [-2.7, 19, 0.65, 1.8], [3.1, -24, 0.74, 2.2],
            ].map(([x, z, size, rotation], index) => (
                <mesh key={`puddle-${index}`} position={[x, -0.018, z]} rotation={[-Math.PI / 2, 0, rotation]} scale={[size, size * 0.62, 1]} receiveShadow>
                    <circleGeometry args={[1, 20]} />
                    <meshStandardMaterial color="#566366" roughness={0.22} metalness={0.16} transparent opacity={0.64} />
                </mesh>
            ))}
            {Array.from({ length: 115 }, (_, index) => {
                const x = Math.sin(index * 91.7) * 22;
                const z = Math.cos(index * 37.3) * 22;
                const size = 0.04 + (index % 5) * 0.018;
                return (
                    <group key={`litter-${index}`} position={[x, -0.015, z]} rotation={[0, index * 1.7, 0]}>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.6, 0.55, 1]}>
                            <circleGeometry args={[size, 5]} />
                            <meshStandardMaterial color={["#6b593c", "#514b35", "#7b6844", "#303b2a"][index % 4]} roughness={1} />
                        </mesh>
                        {index % 3 === 0 && (
                            <mesh position={[0, 0.08, 0]} rotation={[0, 0, index % 2 ? 0.45 : -0.45]}>
                                <coneGeometry args={[0.055, 0.24, 3]} />
                                <meshStandardMaterial color="#415337" roughness={1} />
                            </mesh>
                        )}
                    </group>
                );
            })}
        </>
    );
}

export function Campfire() {
    const flameRef = useRef();
    const innerFlameRef = useRef();
    const lightRef = useRef();

    useFrame(({ clock }) => {
        const time = clock.elapsedTime;
        const flicker = 0.88 + Math.sin(time * 17) * 0.12 + Math.sin(time * 29) * 0.06;
        if (flameRef.current) flameRef.current.scale.set(1, flicker, 1);
        if (innerFlameRef.current) innerFlameRef.current.scale.set(1, 0.9 + Math.sin(time * 22) * 0.12, 1);
        if (lightRef.current) lightRef.current.intensity = 2.2 + flicker * 0.9;
    });

    return (
        <group position={[3.8, 0, -1.8]}>
            <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.05, 16]} />
                <meshStandardMaterial color="#292721" roughness={1} />
            </mesh>
            {Array.from({ length: 7 }, (_, index) => (
                <mesh key={index} position={[Math.cos(index * 0.9) * 0.62, 0.09, Math.sin(index * 0.9) * 0.62]} rotation={[0, index * 0.9, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.075, 0.09, 0.9, 7]} />
                    <meshStandardMaterial map={barkTexture} color="#806044" roughness={1} />
                </mesh>
            ))}
            <mesh position={[0, 0.17, 0]}>
                <icosahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial color="#e08032" emissive="#ff5a13" emissiveIntensity={2.3} roughness={0.72} />
            </mesh>
            <mesh ref={flameRef} position={[0, 0.53, 0]} scale={[1, 0.88, 1]}>
                <coneGeometry args={[0.36, 0.88, 8]} />
                <meshBasicMaterial color="#ff6224" />
            </mesh>
            <mesh ref={innerFlameRef} position={[0.015, 0.4, 0]} scale={[1, 0.9, 1]}>
                <coneGeometry args={[0.2, 0.58, 7]} />
                <meshBasicMaterial color="#ffc252" />
            </mesh>
            <pointLight ref={lightRef} position={[0, 0.68, 0]} color="#ff8a36" intensity={2.8} distance={11} decay={2} />
        </group>
    );
}

export function WorldTree({ fallProgress = 0, hitCount = 0 }) {
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
                    <meshStandardMaterial map={barkTexture} color="#8b7962" roughness={1} />
                </mesh>

                <mesh position={[-0.32, 0.22, 0]} rotation={[0, 0, -0.7]} castShadow>
                    <cylinderGeometry args={[0.035, 0.13, 1.05, 6]} />
                    <meshStandardMaterial map={barkTexture} color="#76634e" roughness={1} />
                </mesh>
                <mesh position={[0.32, 0.22, 0]} rotation={[0, 0, 0.7]} castShadow>
                    <cylinderGeometry args={[0.035, 0.13, 1.05, 6]} />
                    <meshStandardMaterial map={barkTexture} color="#76634e" roughness={1} />
                </mesh>
                <mesh position={[0, 1.62, 0]} scale={[0.95, 0.76, 0.82]} castShadow>
                    <sphereGeometry args={[1, 10, 8]} />
                    <meshStandardMaterial color="#263c2d" roughness={1} />
                </mesh>
                <mesh position={[-0.42, 1.82, 0.12]} scale={[0.55, 0.48, 0.5]} castShadow>
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshStandardMaterial color="#314633" roughness={1} />
                </mesh>
                <mesh position={[0.38, 2.02, -0.08]} scale={[0.59, 0.52, 0.55]} castShadow>
                    <sphereGeometry args={[1, 8, 6]} />
                    <meshStandardMaterial color="#3a5037" roughness={1} />
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
            <Forest />
            <ForestGround />
            <Campfire />
            {/* Fallen deadwood on the forest floor */}
            {[[-8, -2, 0.7], [7, -9, -0.45], [-11, 6, 0.3], [12, 2, -0.8]].map(([x, z, rot], i) => <group key={`log-${i}`} position={[x, 0.18, z]} rotation={[0, rot, Math.PI / 2]}>
                <mesh castShadow receiveShadow><cylinderGeometry args={[0.18, 0.24, 2.1, 8]} /><meshStandardMaterial color="#3f3024" roughness={1} /></mesh>
                <mesh position={[0, 1.06, 0]}><cylinderGeometry args={[0.15, 0.18, 0.025, 8]} /><meshStandardMaterial color="#b29a70" roughness={1} /></mesh>
            </group>)}

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
