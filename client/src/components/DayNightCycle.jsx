import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const CYCLE_DURATION = 120;

export default function DayNightCycle({ onNightChange }) {
  const { scene } = useThree();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const startTime = performance.now();

    const timer = setInterval(() => {
      const seconds =
        ((performance.now() - startTime) / 1000) % CYCLE_DURATION;

      setElapsed(seconds);
    }, 250);

    return () => clearInterval(timer);
  }, []);

  const progress = elapsed / CYCLE_DURATION;

  // First 60 seconds = day, next 60 seconds = night.
  const isNight = progress >= 0.5;

  // Smooth lighting transition between day and night.
  const daylight = Math.max(
    0,
    Math.sin(progress * Math.PI * 2)
  );

  const skyColor = new THREE.Color("#101a35").lerp(
    new THREE.Color("#b8d8ee"),
    daylight
  );

  useEffect(() => {
    scene.background = skyColor.clone();

    const previousFog = scene.fog;

    scene.fog = new THREE.Fog(skyColor.clone(), 25, 55);

    return () => {
      scene.fog = previousFog;
    };
  }, [scene, daylight]);

  useEffect(() => {
    onNightChange?.(isNight);
  }, [isNight, onNightChange]);

  return (
    <>
      <ambientLight
        intensity={isNight ? 0.2 : 0.15 + daylight * 1.2}
      />

      <directionalLight
        position={[
          Math.cos(progress * Math.PI * 2) * 15,
          Math.max(1, daylight * 20),
          Math.sin(progress * Math.PI * 2) * 15,
        ]}
        intensity={isNight ? 0.25 : 0.15 + daylight * 2}
        castShadow
      />
    </>
  );
}