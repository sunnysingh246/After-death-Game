import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
const CYCLE_DURATION = 150;
export default function DayNightCycle({ onNightChange }) {
  const { scene } = useThree();
  const [elapsed, setElapsed] = useState(0);
  const [startedAt] = useState(() => performance.now());
  const lastNight = useMemo(() => ({ value: null }), []);
  useFrame(() => {
    const next = ((performance.now() - startedAt) / 1000) % CYCLE_DURATION;
    setElapsed((v) => (Math.abs(v - next) > 0.08 ? next : v));
  });
  const progress = elapsed / CYCLE_DURATION;
  const daylight = THREE.MathUtils.clamp((Math.cos(progress * Math.PI * 2) + 0.2) / 1.2, 0, 1);
  const isNight = daylight < 0.14;
  const sky = useMemo(() => new THREE.Color(), []);
  sky.set("#10151d").lerp(new THREE.Color("#a9bdc0"), daylight);
  useEffect(() => {
    scene.background = sky.clone();
    scene.fog = new THREE.Fog(sky.clone(), isNight ? 8 : 18, isNight ? 32 : 55);
  }, [scene, daylight, isNight]);
  useEffect(() => {
    if (lastNight.value !== isNight) {
      lastNight.value = isNight;
      onNightChange?.(isNight);
    }
  }, [isNight, onNightChange, lastNight]);
  return (
    <>
      <ambientLight
        intensity={isNight ? 0.24 : 0.28 + daylight * 0.55}
        color={isNight ? "#8798c2" : "#dce5d2"}
      />
      <hemisphereLight intensity={isNight ? 0.2 : 0.45} color="#b8c8d8" groundColor="#25251e" />
      <directionalLight
        position={[
          Math.cos(progress * Math.PI * 2) * 16,
          Math.max(1.5, daylight * 18),
          Math.sin(progress * Math.PI * 2) * 16,
        ]}
        intensity={isNight ? 0.12 : 0.35 + daylight * 1.3}
        color={isNight ? "#8d9dce" : "#ffe3b3"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-32}
        shadow-camera-right={32}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.00015}
        shadow-normalBias={0.035}
      />
    </>
  );
}
