import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Survivor from "./Survivor";
import WoodChips from "./WoodChips";
import DayNightCycle from "./DayNightCycle";
import ZombieSystem from "./ZombieSystem";
import "./Game3D.fullscreen.css";

const combatButton = {
  border: "1px solid rgba(148,163,184,.5)",
  color: "#f8fafc",
  borderRadius: 7,
  padding: "7px 10px",
  fontWeight: 900,
  fontSize: 10,
  letterSpacing: 0.5,
  cursor: "pointer",
};

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
      1 - Math.exp(-9 * delta),
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

function Player({ onPositionChange, onStaminaChange, isChopping, onAxeSwing, onAxeHit, disabled }) {
  const player = useRef();
  const keys = useRef({});
  const direction = useRef(new THREE.Vector3());
  const cameraTarget = useRef(new THREE.Vector3());
  const visual = useRef();
  const walkTime = useRef(0);
  const stamina = useRef(100);
  const staminaReportTime = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const allowedKeys = [
      "w",
      "a",
      "s",
      "d",
      "arrowup",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "shift",
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
      Number(Boolean(input.d || input.arrowright)) - Number(Boolean(input.a || input.arrowleft));
    const z =
      Number(Boolean(input.s || input.arrowdown)) - Number(Boolean(input.w || input.arrowup));

    direction.current.set(x, 0, z);
    const isMoving = direction.current.lengthSq() > 0 && !isChopping && !disabled;
    const sprinting = isMoving && Boolean(input.shift) && stamina.current > 0;
    if (sprinting) {
      stamina.current = Math.max(0, stamina.current - 26 * delta);
    } else {
      stamina.current = Math.min(100, stamina.current + 14 * delta);
    }
    staminaReportTime.current += delta;
    if (staminaReportTime.current >= 0.12) {
      staminaReportTime.current = 0;
      onStaminaChange?.(Math.round(stamina.current));
    }

    if (isMoving) {
      direction.current.normalize();
      player.current.position.addScaledVector(
        direction.current,
        (sprinting ? 8.2 : 5) * Math.min(delta, 0.05),
      );
      player.current.rotation.y = Math.atan2(-direction.current.x, -direction.current.z);
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
      player.current.position.z,
    );

    const desiredCamera = new THREE.Vector3(
      player.current.position.x,
      player.current.position.y + 5,
      player.current.position.z + 7,
    );

    camera.position.lerp(desiredCamera, 1 - Math.exp(-5 * Math.min(delta, 0.05)));
    camera.lookAt(cameraTarget.current);
  });

  return (
    <group ref={player}>
      <group ref={visual}>
        <Survivor isChopping={isChopping} onAxeSwing={onAxeSwing} onAxeHit={onAxeHit} />
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
  onStaminaChange,
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

  const updatePlayerPosition = useCallback(
    (position) => {
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
      setNearbyTreeId((previousId) => (previousId === closestTreeId ? previousId : closestTreeId));

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
      setNearbySupplyId((previousId) =>
        previousId === closestSupplyId ? previousId : closestSupplyId,
      );

      onPositionChange?.({
        x: Math.round(position.x * 10) / 10,
        z: Math.round(position.z * 10) / 10,
      });
    },
    [onPositionChange],
  );

  const handleAxeHit = useCallback(() => {
    onAxeHit?.();

    const targetId = choppingTreeIdRef.current;

    if (targetId === null) return;

    const targetTree = treesRef.current.find((tree) => tree.id === targetId);

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
          setTrees((previousTrees) => previousTrees.filter((tree) => tree.id !== targetId));
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
            onMessage?.("🍎 Apple collected! Eat it from your inventory.");
          } else {
            onWaterCollected?.(1);
            onMessage?.("💧 Water bottle collected! Drink it from your inventory.");
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
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    disabled,
    hasAxe,
    onWoodCollected,
    onMessage,
    setIsChopping,
    onFoodCollected,
    onWaterCollected,
  ]);

  const fallProgress = chopProgress < 0.82 ? 0 : (chopProgress - 0.82) / 0.18;

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
          onComplete={() =>
            setWoodChipEffects((previous) => previous.filter((item) => item.id !== effect.id))
          }
        />
      ))}

      <Rock position={[-4, 0, 2]} />
      <Rock position={[5, 0, 5]} />
      <Rock position={[8, 0, -8]} />
      <Rock position={[-8, 0, 0]} />

      <Player
        onPositionChange={updatePlayerPosition}
        onStaminaChange={onStaminaChange}
        isChopping={isChopping}
        onAxeSwing={onAxeSwing}
        onAxeHit={handleAxeHit}
        disabled={disabled}
      />
    </>
  );
}

function Safehouse({ position }) {
  if (!position) return null;
  return (
    <group position={[position.x, 0, position.z]}>
      {/* Reinforced survival cabin */}
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.2, 3.6]} />
        <meshStandardMaterial color="#493a2d" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[3.3, 1.5, 4]} />
        <meshStandardMaterial color="#241f22" roughness={1} />
      </mesh>
      <mesh position={[0, 0.85, 1.82]} castShadow>
        <boxGeometry args={[0.9, 1.7, 0.12]} />
        <meshStandardMaterial color="#171717" roughness={1} />
      </mesh>
      {[-2.25, 2.25].map((x) => (
        <mesh key={`post-${x}`} position={[x, 0.8, 2.15]} castShadow>
          <boxGeometry args={[0.18, 1.6, 0.18]} />
          <meshStandardMaterial color="#8b5e3c" />
        </mesh>
      ))}
      <group position={[0, 0.12, 3.0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[0.75, 16]} />
          <meshStandardMaterial color="#262626" />
        </mesh>
        <pointLight position={[0, 1.1, 0]} color="#ff6b35" intensity={1.7} distance={8} />
        <mesh position={[0, 0.28, 0]} castShadow>
          <icosahedronGeometry args={[0.28, 0]} />
          <meshStandardMaterial color="#ff5a1f" emissive="#f97316" emissiveIntensity={2} />
        </mesh>
      </group>
      <pointLight position={[0, 2.2, 0]} color="#f59e0b" intensity={0.5} distance={7} />
    </group>
  );
}

export default function Game3D() {
  const [position, setPosition] = useState({ x: 0, z: 0 });
  const [wood, setWood] = useState(0);
  const [safehousePosition, setSafehousePosition] = useState(null);
  const [hasAxe, setHasAxe] = useState(false);
  const [isChopping, setIsChopping] = useState(false);
  const [message, setMessage] = useState("");
  const [chopSoundEnabled, setChopSoundEnabled] = useState(true);
  const [health, setHealth] = useState(100);
  const [hunger, setHunger] = useState(100);
  const [thirst, setThirst] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [gameOver, setGameOver] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [bloodMoon, setBloodMoon] = useState(false);
  const [bossMode, setBossMode] = useState(false);
  const [weapon, setWeapon] = useState("pistol");
  const [ammo, setAmmo] = useState({ pistol: 12, rifle: 30 });
  const [reserveAmmo, setReserveAmmo] = useState({ pistol: 48, rifle: 90 });
  const [bossHealth, setBossHealth] = useState(0);
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

  useEffect(
    () => () => {
      if (messageTimeout.current) clearTimeout(messageTimeout.current);
      if (ambienceRef.current) {
        ambienceRef.current.pause();
        ambienceRef.current = null;
      }
    },
    [],
  );

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

  const collectFood = useCallback((amount) => {
    setApples((value) => value + amount);
  }, []);

  const collectWater = useCallback((amount) => {
    setWaterBottles((value) => value + amount);
  }, []);

  const eatApple = () => {
    if (apples <= 0) {
      showMessage("No apples! Find a red apple in the forest.");
      return;
    }
    setApples((value) => Math.max(0, value - 1));
    setHunger((value) => Math.min(100, value + 30));
    showMessage("🍎 You ate an apple. Hunger restored!");
  };

  const drinkWater = () => {
    if (waterBottles <= 0) {
      showMessage("No water! Find a blue water bottle in the forest.");
      return;
    }
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

  const buildSafehouse = () => {
    if (safehousePosition) {
      showMessage("🏚️ Your safehouse is already built!");
      return;
    }
    if (wood < 30) {
      showMessage(`Need ${30 - wood} more wood to build a safehouse.`);
      return;
    }
    setWood((value) => value - 30);
    setSafehousePosition({ x: position.x, z: position.z });
    showMessage("🏚️ SAFEHOUSE BUILT! Stay close to reduce incoming damage.");
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
    setStamina(100);
    setBloodMoon(false);
    setBossMode(false);
    setWeapon("pistol");
    setAmmo({ pistol: 12, rifle: 30 });
    setReserveAmmo({ pistol: 48, rifle: 90 });
    setBossHealth(0);
    setWood(0);
    setSafehousePosition(null);
    setApples(0);
    setWaterBottles(0);
    setHasAxe(false);
    setIsChopping(false);
    setPosition({ x: 0, z: 0 });
    setMessage("");
    setGameOver(false);
    setWorldKey((key) => key + 1);
  };

  const shootGun = () => {
    if (gameOver) return;
    if (!isNight) {
      showMessage("🔦 No hostiles detected. Guns can hit zombies at night.");
      return;
    }
    if (ammo[weapon] <= 0) {
      showMessage("🔴 Magazine empty! Press R or tap RELOAD.");
      return;
    }
    setAmmo((current) => ({ ...current, [weapon]: current[weapon] - 1 }));
    window.dispatchEvent(
      new CustomEvent("afterdeath:fire", { detail: { damage: weapon === "rifle" ? 85 : 55 } }),
    );
  };

  const reloadGun = () => {
    const capacity = weapon === "rifle" ? 30 : 12;
    const needed = capacity - ammo[weapon];
    if (needed <= 0) {
      showMessage("Magazine is already full.");
      return;
    }
    if (reserveAmmo[weapon] <= 0) {
      showMessage("Out of reserve ammo!");
      return;
    }
    const loaded = Math.min(needed, reserveAmmo[weapon]);
    setAmmo((current) => ({ ...current, [weapon]: current[weapon] + loaded }));
    setReserveAmmo((current) => ({ ...current, [weapon]: current[weapon] - loaded }));
    showMessage(`🔄 Reloaded ${loaded} rounds.`);
  };

  useEffect(() => {
    const handleGunKeys = (event) => {
      if (event.code === "KeyR") reloadGun();
      if (event.code === "Digit1") setWeapon("pistol");
      if (event.code === "Digit2") setWeapon("rifle");
    };
    window.addEventListener("keydown", handleGunKeys);
    return () => window.removeEventListener("keydown", handleGunKeys);
  });

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
      <style>{`
                @keyframes afterDeathPulse {
                    0%, 100% { border-color: rgba(248,113,113,.45); }
                    50% { border-color: rgba(248,113,113,1); }
                }
            `}</style>
      <div className="game3d-hud">
        <div className="game3d-brand">
          <strong>AFTER DEATH</strong>
          <span>WASTELAND · SECTOR 07</span>
        </div>

        <div className="player-coordinates">
          X: {position.x} · Z: {position.z}
        </div>
        <div
          className="game3d-threat"
          style={{
            border: `1px solid ${isNight ? "rgba(248,113,113,.65)" : "rgba(148,163,184,.35)"}`,
            background: isNight ? "rgba(127,29,29,.72)" : "rgba(15,23,42,.62)",
          }}
        >
          <span
            className="game3d-threat-dot"
            style={{
              background: isNight ? "#f87171" : "#86efac",
              boxShadow: isNight ? "0 0 12px #ef4444" : "0 0 8px #4ade80",
            }}
          />
          {bloodMoon ? "BLOOD MOON: EXTREME" : isNight ? "Threat level: HIGH" : "Threat level: LOW"}
        </div>

        <div className="player-inventory">
          <span>🪵 Wood: {wood}</span>
          <span>🍎 Apples: {apples}</span>
          <span>💧 Water: {waterBottles}</span>
          <span>{hasAxe ? "🪓 Axe: Equipped" : "🪓 Axe: Not Crafted"}</span>
          <button type="button" onClick={toggleSound} className="sound-toggle">
            {chopSoundEnabled ? "🔊 Sound On" : "🔇 Sound Off"}
          </button>
          <button
            type="button"
            onClick={() => {
              setBloodMoon((active) => !active);
              showMessage(
                bloodMoon
                  ? "🩸 Blood Moon signal cancelled."
                  : "🩸 BLOOD MOON ACTIVATED. Prepare for the horde!",
              );
            }}
            className="game3d-action game3d-action--danger"
            style={{
              border: `1px solid ${bloodMoon ? "#fb7185" : "#991b1b"}`,
              background: bloodMoon ? "#7f1d1d" : "#450a0a",
            }}
          >
            {bloodMoon ? "🩸 BLOOD MOON ON" : "🩸 TRIGGER BLOOD MOON"}
          </button>
          <button
            type="button"
            onClick={buildSafehouse}
            className="game3d-action"
            style={{
              ...combatButton,
              background: safehousePosition ? "#14532d" : "#422006",
              borderColor: "#f59e0b",
            }}
          >
            {safehousePosition ? "🏚️ SAFEHOUSE BUILT" : `🏚️ BUILD SAFEHOUSE · 30 WOOD`}
          </button>
        </div>
        <div className="game3d-action-row">
          <button
            type="button"
            onClick={() => setWeapon("pistol")}
            className="game3d-button"
            style={{ ...combatButton, background: weapon === "pistol" ? "#1d4ed8" : "#172033" }}
          >
            🔫 PISTOL [1] · {ammo.pistol}/{reserveAmmo.pistol}
          </button>
          <button
            type="button"
            onClick={() => setWeapon("rifle")}
            className="game3d-button"
            style={{ ...combatButton, background: weapon === "rifle" ? "#1d4ed8" : "#172033" }}
          >
            ⚡ RIFLE [2] · {ammo.rifle}/{reserveAmmo.rifle}
          </button>
          <button
            type="button"
            onClick={shootGun}
            className="game3d-button"
            style={{ ...combatButton, background: "#991b1b", borderColor: "#f87171" }}
          >
            FIRE 🔥
          </button>
          <button type="button" onClick={reloadGun} className="game3d-button" style={combatButton}>
            RELOAD [R]
          </button>
          <button
            type="button"
            onClick={() => {
              setBossMode((active) => !active);
              showMessage(
                bossMode
                  ? "Boss signal cancelled."
                  : "☠ BOSS SIGNAL ARMED — survive until nightfall!",
              );
            }}
            className="game3d-button game3d-button--boss"
            style={{
              ...combatButton,
              background: bossMode ? "#7f1d1d" : "#3f0b19",
              borderColor: "#fb7185",
            }}
          >
            {bossMode ? "☠ BOSS ARMED" : "☠ SUMMON BOSS"}
          </button>
        </div>
      </div>

      {bossHealth > 0 && !gameOver && (
        <div
          style={{
            position: "absolute",
            top: 205,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 8,
            width: "min(420px, 72vw)",
            color: "#fff",
            textAlign: "center",
            pointerEvents: "none",
            textShadow: "0 2px 8px #000",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 1000, letterSpacing: 4, marginBottom: 6 }}>
            ☠ THE ABOMINATION · {Math.ceil(bossHealth)} / 1200 HP
          </div>
          <div
            style={{
              height: 12,
              border: "1px solid #fb7185",
              background: "#1f0710",
              borderRadius: 99,
              overflow: "hidden",
              boxShadow: "0 0 18px #be123c",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.max(0, (bossHealth / 1200) * 100)}%`,
                background: "linear-gradient(90deg,#7f1d1d,#fb7185,#fff1f2)",
                transition: "width 180ms",
              }}
            />
          </div>
        </div>
      )}

      <div
        className="survival-status-panel"
        style={{
          position: "absolute",
          top: 150,
          left: 18,
          zIndex: 5,
          width: 230,
          padding: "12px 14px",
          borderRadius: 12,
          color: "#f8fafc",
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          fontFamily: "inherit",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: 1.5, opacity: 0.75, marginBottom: 10 }}>
          SURVIVAL STATUS
        </div>
        {[
          { label: "❤️ Health", value: health, color: "#ef4444" },
          { label: "🍖 Hunger", value: hunger, color: "#f59e0b" },
          { label: "💧 Thirst", value: thirst, color: "#38bdf8" },
          { label: "⚡ Stamina", value: stamina, color: "#a3e635" },
        ].map((meter) => (
          <div key={meter.label} style={{ marginBottom: 9 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              <span>{meter.label}</span>
              <span>{Math.round(meter.value)}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 99,
                overflow: "hidden",
                background: "rgba(255,255,255,0.16)",
              }}
            >
              <div
                style={{
                  width: `${meter.value}%`,
                  height: "100%",
                  background: meter.color,
                  borderRadius: 99,
                  transition: "width 250ms linear",
                }}
              />
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
          Hunger & thirst decrease over time · Hold SHIFT to sprint
        </div>
      </div>

      {bloodMoon && !gameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 4,
            pointerEvents: "none",
            background: "radial-gradient(ellipse at 50% 8%, rgba(190,18,60,.20), transparent 58%)",
            boxShadow: "inset 0 0 100px rgba(127,29,29,.28)",
          }}
        />
      )}

      {bloodMoon && !gameOver && (
        <div
          style={{
            position: "absolute",
            top: 150,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 7,
            textAlign: "center",
            color: "#ffe4e6",
            pointerEvents: "none",
            textShadow: "0 0 18px #e11d48",
            fontWeight: 1000,
            letterSpacing: 4,
            fontSize: 19,
            animation: "afterDeathPulse 1.1s ease-in-out infinite",
          }}
        >
          🩸 BLOOD MOON — NO ONE IS COMING TO SAVE YOU 🩸
          <div style={{ fontSize: 10, letterSpacing: 2, marginTop: 8 }}>
            8 HOSTILES · +57% SPEED · +50% DAMAGE
          </div>
        </div>
      )}

      {isNight && !gameOver && (
        <div
          style={{
            position: "absolute",
            top: 86,
            right: 18,
            zIndex: 6,
            width: 250,
            padding: "13px 15px",
            borderRadius: 12,
            color: "#fff7ed",
            background: "rgba(69,10,10,.88)",
            border: "1px solid rgba(248,113,113,.55)",
            boxShadow: "0 8px 28px rgba(127,29,29,.28)",
            pointerEvents: "none",
            animation: "afterDeathPulse 1.8s ease-in-out infinite",
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1.6, color: "#fca5a5", marginBottom: 5 }}>
            ⚠ NIGHTFALL WARNING
          </div>
          <strong style={{ display: "block", fontSize: 16, marginBottom: 5 }}>
            HOSTILES ACTIVE
          </strong>
          <div style={{ fontSize: 12, lineHeight: 1.5, opacity: 0.9 }}>
            Use guns for distant targets. Reload with R; save ammo for the boss. Axe attacks work
            with F up close.
          </div>
        </div>
      )}

      <div className="game3d-canvas">
        <Canvas key={worldKey} shadows camera={{ position: [0, 5, 7], fov: 55 }} dpr={[1, 1.5]}>
          <color attach="background" args={[bloodMoon ? "#35101b" : "#c6d5bd"]} />
          <fog
            attach="fog"
            args={[bloodMoon ? "#35101b" : "#c6d5bd", bloodMoon ? 13 : 25, bloodMoon ? 38 : 55]}
          />

          <DayNightCycle onNightChange={setIsNight} />
          <Safehouse position={safehousePosition} />
          <ZombieSystem
            playerPosition={position}
            isNight={isNight}
            bloodMoon={bloodMoon}
            bossMode={bossMode}
            onBossHealthChange={setBossHealth}
            hasAxe={hasAxe}
            disabled={gameOver}
            onPlayerDamage={(amount) => {
              const protectedByShelter =
                safehousePosition &&
                Math.hypot(position.x - safehousePosition.x, position.z - safehousePosition.z) < 5;
              const actualDamage = protectedByShelter
                ? Math.max(1, Math.round(amount * 0.25))
                : amount;
              if (protectedByShelter) showMessage("🛡️ SAFEHOUSE ARMOR reduced the hit!");
              setHealth((current) => {
                const next = Math.max(0, current - actualDamage);
                survivalRef.current.health = next;
                if (next === 0) setGameOver(true);
                return next;
              });
            }}
            onMessage={showMessage}
          />

          <Environment
            onPositionChange={setPosition}
            onStaminaChange={setStamina}
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
        <div className="chop-status" role="status" aria-live="polite">
          🪓 Chopping tree — press E again to cancel.
        </div>
      )}

      <div className="game3d-controls">
        <div className="objective-panel">
          <div className="objective-panel-label">CURRENT OBJECTIVE</div>
          <div className="objective-panel-title">
            {hasAxe ? "SURVIVE THE NIGHT" : "CRAFT A WEAPON"}
          </div>
          <div className="objective-panel-description">
            {hasAxe
              ? isNight
                ? "Hostiles are active. Keep distance and strike carefully."
                : "Gather supplies before darkness returns."
              : `Collect ${Math.max(0, 10 - wood)} more wood to craft your first axe.`}
          </div>
        </div>
        <div className="crafting-panel">
          <h3>🎒 Survival Inventory</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button
              type="button"
              onClick={eatApple}
              disabled={apples <= 0}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: 0,
                cursor: apples > 0 ? "pointer" : "not-allowed",
              }}
            >
              🍎 Eat Apple ({apples}) +30 Hunger
            </button>
            <button
              type="button"
              onClick={drinkWater}
              disabled={waterBottles <= 0}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                border: 0,
                cursor: waterBottles > 0 ? "pointer" : "not-allowed",
              }}
            >
              💧 Drink Water ({waterBottles}) +35 Thirst
            </button>
          </div>
          <h3>🛠️ Crafting</h3>
          <div className="crafting-item">
            <div>
              <strong>🪓 Wooden Axe</strong>
              <p>Required: 10 Wood</p>
            </div>
            <button type="button" onClick={craftAxe} disabled={hasAxe || wood < 10}>
              {hasAxe ? "AXE CRAFTED" : wood < 10 ? "NEED 10 WOOD" : "CRAFT AXE"}
            </button>
          </div>
        </div>
        <span>
          <b>W A S D</b> Move character
        </span>
        <span>
          <b>E</b> Collect apples, water, or gather/chop wood
        </span>
        <span>
          <b>F</b> Attack nearby zombies at night (requires axe)
        </span>
        <span>
          <b>Inventory buttons</b> Eat apple / drink water
        </span>
        <span>
          <b>🏚️ Build Safehouse</b> Spend 30 wood; stay nearby to reduce zombie damage by 75%
        </span>
        <span>
          <b>Follow Camera</b> Camera follows player
        </span>
      </div>

      {gameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(3, 7, 18, 0.82)",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              textAlign: "center",
              padding: "32px 26px",
              borderRadius: 18,
              color: "#f8fafc",
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.16)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>💀</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 30 }}>YOU DIED</h2>
            <p style={{ margin: "0 0 22px", color: "#cbd5e1", lineHeight: 1.5 }}>
              Your survival journey has ended. Try again and stay alive.
            </p>
            <button
              type="button"
              onClick={restartGame}
              style={{
                border: 0,
                borderRadius: 10,
                padding: "12px 22px",
                fontWeight: 800,
                cursor: "pointer",
                color: "#111827",
                background: "#a3e635",
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
