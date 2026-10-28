import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const NIGHT_SPAWNS = [
  [-10, 0, -8],
  [11, 0, -7],
  [-12, 0, 8],
  [10, 0, 11],
];
const BLOOD_MOON_SPAWNS = [...NIGHT_SPAWNS, [-16, 0, 1], [15, 0, 3], [3, 0, -15], [-4, 0, 15]];

function ZombieModel({ zombie, registerRef, bloodMoon = false }) {
  const groupRef = useRef();
  const boss = zombie.type === "boss";

  useEffect(() => {
    registerRef(zombie.id, groupRef.current);
    return () => registerRef(zombie.id, null);
  }, [zombie.id, registerRef]);
``
  const skin = boss ? "#28121c" : "#78916a";
  const cloth = boss ? "#641126" : "#526b4c";
  return (
    <group ref={groupRef} position={zombie.position} scale={boss ? 2.25 : 1}>
      <mesh position={[0, 1.65, 0]} castShadow>
        <boxGeometry args={boss ? [0.62, 0.58, 0.52] : [0.48, 0.48, 0.42]} />
        <meshStandardMaterial color={skin} roughness={1} />
      </mesh>
      <mesh position={[-0.12, 1.7, -0.215]}>
        <sphereGeometry args={[boss ? 0.075 : 0.045, 8, 8]} />
        <meshBasicMaterial color={boss || bloodMoon ? "#ff001e" : "#ff3030"} />
      </mesh>
      <mesh position={[0.12, 1.7, -0.215]}>
        <sphereGeometry args={[boss ? 0.075 : 0.045, 8, 8]} />
        <meshBasicMaterial color={boss || bloodMoon ? "#ff001e" : "#ff3030"} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={boss ? [0.9, 1.0, 0.52] : [0.62, 0.78, 0.36]} />
        <meshStandardMaterial
          color={cloth}
          roughness={1}
          emissive={boss ? "#5c0018" : "#000000"}
          emissiveIntensity={boss ? 0.7 : 0}
        />
      </mesh>
      <mesh position={[-0.43, 1.05, -0.02]} rotation={[0, 0, -0.35]} castShadow>
        <boxGeometry args={[0.2, 0.68, 0.22]} />
        <meshStandardMaterial color={skin} roughness={1} />
      </mesh>
      <mesh position={[0.43, 1.05, -0.02]} rotation={[0, 0, 0.35]} castShadow>
        <boxGeometry args={[0.2, 0.68, 0.22]} />
        <meshStandardMaterial color={skin} roughness={1} />
      </mesh>
      <mesh position={[-0.17, 0.38, 0]} castShadow>
        <boxGeometry args={[0.23, 0.55, 0.27]} />
        <meshStandardMaterial color="#20232b" roughness={1} />
      </mesh>
      <mesh position={[0.17, 0.38, 0]} castShadow>
        <boxGeometry args={[0.23, 0.55, 0.27]} />
        <meshStandardMaterial color="#20232b" roughness={1} />
      </mesh>
    </group>
  );
}

export default function ZombieSystem({
  playerPosition,
  isNight,
  bloodMoon = false,
  bossMode = false,
  hasAxe,
  disabled,
  onPlayerDamage,
  onMessage,
  onBossHealthChange,
}) {
  const [zombies, setZombies] = useState([]);
  const zombieRefs = useRef({});
  const attackCooldowns = useRef({});
  const lastNightState = useRef(false);
  const lastBloodMoon = useRef(bloodMoon);
  const lastBossMode = useRef(bossMode);
  const playerRef = useRef(new THREE.Vector3());
  const zombiesRef = useRef(zombies);

  useEffect(() => {
    zombiesRef.current = zombies;
    onBossHealthChange?.(zombies.find((z) => z.type === "boss")?.health ?? 0);
  }, [zombies, onBossHealthChange]);

  useEffect(() => {
    if (
      isNight &&
      (!lastNightState.current ||
        lastBloodMoon.current !== bloodMoon ||
        lastBossMode.current !== bossMode)
    ) {
      const spawnPoints = bloodMoon ? BLOOD_MOON_SPAWNS : NIGHT_SPAWNS;
      const next = spawnPoints.map((position, index) => ({
        id: `${bloodMoon ? "blood" : "night"}-${Date.now()}-${index}`,
        position: [...position],
        health: bloodMoon ? 160 : 100,
        type: "normal",
      }));
      if (bossMode)
        next.push({ id: `boss-${Date.now()}`, position: [0, 0, -18], health: 1200, type: "boss" });

      setZombies(next);
      onMessage?.(
        bossMode
          ? "☠ THE ABOMINATION HAS AWAKENED. Aim carefully!"
          : bloodMoon
            ? "🩸 BLOOD MOON! Eight hostiles detected!"
            : "🌙 Night has fallen! Zombies are approaching...",
      );
    } else if (!isNight && lastNightState.current) {
      setZombies([]);
      zombieRefs.current = {};
      attackCooldowns.current = {};
      onMessage?.("🌅 Sunrise! The zombies have disappeared.");
    }
    lastNightState.current = isNight;
    lastBloodMoon.current = bloodMoon;
    lastBossMode.current = bossMode;
  }, [isNight, bloodMoon, bossMode, onMessage]);

  const registerRef = useCallback((id, object) => {
    if (object) zombieRefs.current[id] = object;
    else delete zombieRefs.current[id];
  }, []);

  useFrame((_, delta) => {
    if (!isNight || disabled) return;
    playerRef.current.set(playerPosition?.x ?? 0, 0, playerPosition?.z ?? 0);
    for (const zombie of zombiesRef.current) {
      const object = zombieRefs.current[zombie.id];
      if (!object) continue;
      const dx = playerRef.current.x - object.position.x,
        dz = playerRef.current.z - object.position.z;
      const distance = Math.hypot(dx, dz);
      const boss = zombie.type === "boss";
      const detection = boss ? 28 : 13;
      if (distance < detection && distance > (boss ? 2.3 : 1.15)) {
        const step = Math.min((boss ? 1.22 : bloodMoon ? 1.65 : 1.05) * delta, distance);
        object.position.x += (dx / distance) * step;
        object.position.z += (dz / distance) * step;
        object.rotation.y = Math.atan2(-dx, -dz);
      }
      const now = performance.now();
      if (
        distance <= (boss ? 2.8 : 1.45) &&
        now - (attackCooldowns.current[zombie.id] || 0) > (boss ? 1800 : 1400)
      ) {
        attackCooldowns.current[zombie.id] = now;
        onPlayerDamage?.(boss ? 24 : bloodMoon ? 12 : 8);
        if (boss) onMessage?.("☠ THE ABOMINATION SLAMMED YOU! RUN!");
      }
    }
  });

  useEffect(() => {
    const fire = (event) => {
      if (disabled || !isNight) return;
      const damage = Math.max(1, Number(event.detail?.damage) || 45);
      const px = playerPosition?.x ?? 0,
        pz = playerPosition?.z ?? 0;
      let target = null,
        targetDistance = 24;
      for (const zombie of zombiesRef.current) {
        const object = zombieRefs.current[zombie.id];
        if (!object) continue;
        const d = Math.hypot(object.position.x - px, object.position.z - pz);
        if (d < targetDistance) {
          target = zombie;
          targetDistance = d;
        }
      }
      if (!target) {
        onMessage?.("🔫 Shot fired — no hostile in range (24m).");
        return;
      }
      const nextHealth = target.health - damage;
      if (nextHealth <= 0) {
        setZombies((current) => current.filter((z) => z.id !== target.id));
        delete zombieRefs.current[target.id];
        delete attackCooldowns.current[target.id];
        onMessage?.(
          target.type === "boss"
            ? "🏆 ABOMINATION ELIMINATED! You survived the boss fight!"
            : "💥 Hostile eliminated!",
        );
      } else {
        setZombies((current) =>
          current.map((z) => (z.id === target.id ? { ...z, health: nextHealth } : z)),
        );
        onMessage?.(
          target.type === "boss"
            ? `☠ Boss hit! ${Math.ceil(nextHealth)} HP remaining!`
            : `🎯 Hit confirmed! ${Math.ceil(nextHealth)} HP remaining.`,
        );
      }
    };
    const axe = (event) => {
      if (event.code !== "KeyF" || event.repeat || disabled || !isNight || !hasAxe) return;
      const px = playerPosition?.x ?? 0,
        pz = playerPosition?.z ?? 0;
      let target = null,
        nearestDistance = 2.6;

      for (const z of zombiesRef.current) {
        const o = zombieRefs.current[z.id];
        if (!o) continue;
        const d = Math.hypot(o.position.x - px, o.position.z - pz);

        if (d < nearestDistance) {
          target = z;
          nearestDistance = d;
        }
      }

      if (!target) return;
      const nextHealth = target.health - (target.type === "boss" ? 45 : 100);

      if (nextHealth <= 0) {
        setZombies((current) => current.filter((z) => z.id !== target.id));
        delete zombieRefs.current[target.id];
        onMessage?.(
          target.type === "boss" ? "🏆 Boss defeated with your axe!" : "🪓 Zombie defeated!",
        );
      } else {
        setZombies((current) =>
          current.map((z) => (z.id === target.id ? { ...z, health: nextHealth } : z)),
        );
        onMessage?.("🪓 Axe hit! Keep fighting!");
      }
    };
    window.addEventListener("afterdeath:fire", fire);
    window.addEventListener("keydown", axe);

    return () => {
      window.removeEventListener("afterdeath:fire", fire);
      window.removeEventListener("keydown", axe);
    };
  }, [disabled, hasAxe, isNight, onMessage, playerPosition]);

  if (!isNight || disabled) return null;

  return (
    <>
      {zombies.map((zombie) => (
        <ZombieModel
          key={zombie.id}
          zombie={zombie}
          registerRef={registerRef}
          bloodMoon={bloodMoon}
        />
      ))}
    </>
  );
}
