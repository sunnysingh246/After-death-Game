import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const CYCLE_DURATION = 120;
const START_TIME = 0.25;

export default function DayNightCycle() {
  const elapsed = useRef(0);
  const sunRef = useRef();
  const ambientRef = useRef();
  const backgroundRef = useRef();
  const fogRef = useRef();
  const nightColor = useMemo(() => new THREE.Color("#101a35"), []);
  const dayColor = useMemo(() => new THREE.Color("#b8d8ee"), []);
  const skyColor = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    elapsed.current = (elapsed.current + delta) % CYCLE_DURATION;
    const time = (START_TIME + elapsed.current / CYCLE_DURATION) % 1;
    const sunAngle = time * Math.PI * 2;
    const daylight = Math.max(0, Math.sin(sunAngle - Math.PI / 2));

    skyColor.copy(nightColor).lerp(dayColor, daylight);
    backgroundRef.current?.copy(skyColor);
    if (fogRef.current) fogRef.current.color.copy(skyColor);

    if (ambientRef.current) ambientRef.current.intensity = 0.15 + daylight * 1.2;
    if (sunRef.current) {
      sunRef.current.position.set(
        Math.cos(sunAngle) * 15,
        Math.max(1, daylight * 20),
        Math.sin(sunAngle) * 15
      );
      sunRef.current.intensity = 0.15 + daylight * 2;
    }
  });

  return (
    <>
      <color ref={backgroundRef} attach="background" args={["#101a35"]} />
      <fog ref={fogRef} attach="fog" args={["#101a35", 25, 55]} />
      <ambientLight ref={ambientRef} intensity={0.15} />
      <directionalLight
        ref={sunRef}
        position={[0, 1, 15]}
        intensity={0.15}
        castShadow
      />
    </>
  );
}
