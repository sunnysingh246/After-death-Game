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
    setElapsed(v => Math.abs(v - next) > 0.08 ? next : v);
  });
  const progress = elapsed / CYCLE_DURATION;
  const daylight = THREE.MathUtils.clamp((Math.sin(progress * Math.PI * 2 - Math.PI / 2) + 0.18) / 1.18, 0, 1);
  const isNight = progress >= 0.48 && progress < 0.98;
  const sky = useMemo(() => new THREE.Color(), []);
  sky.set("#10151d").lerp(new THREE.Color("#a9bdc0"), daylight);
  useEffect(() => {
    scene.background = sky.clone();
    scene.fog = new THREE.Fog(sky.clone(), isNight ? 10 : 22, isNight ? 34 : 62);
  }, [scene, daylight, isNight]);
  useEffect(() => {
    if (lastNight.value !== isNight) { lastNight.value = isNight; onNightChange?.(isNight); }
  }, [isNight, onNightChange, lastNight]);
  return <>
    <ambientLight intensity={isNight ? 0.24 : 0.28 + daylight * 0.55} color={isNight ? "#8798c2" : "#dce5d2"} />
    <hemisphereLight intensity={isNight ? 0.2 : 0.45} color="#b8c8d8" groundColor="#25251e" />
    <directionalLight position={[Math.cos(progress * Math.PI * 2) * 16, Math.max(1.5, daylight * 18), Math.sin(progress * Math.PI * 2) * 16]} intensity={isNight ? 0.12 : 0.35 + daylight * 1.3} color={isNight ? "#8d9dce" : "#ffe3b3"} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    {isNight && <pointLight position={[3.8, 1.3, -1.8]} intensity={0.45} distance={8} color="#ff9a4a" />}
  </>;
}
