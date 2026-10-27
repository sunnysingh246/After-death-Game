import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function seededRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

export default function WoodChips({ position = [0, 0, 0], onComplete }) {
  const particlesRef = useRef();
  const elapsed = useRef(0);
  const completed = useRef(false);

  const particles = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const sample = (offset) => seededRandom(index * 7 + offset);

      return {
        position: new THREE.Vector3(
          (sample(1) - 0.5) * 0.3,
          sample(2) * 0.25,
          (sample(3) - 0.5) * 0.3,
        ),
        velocity: new THREE.Vector3(
          (sample(4) - 0.5) * 3,
          1.5 + sample(5) * 2.5,
          (sample(6) - 0.5) * 3,
        ),
        rotation: new THREE.Euler(sample(7) * Math.PI, sample(8) * Math.PI, sample(9) * Math.PI),
        rotationSpeed: new THREE.Vector3(sample(10) * 8, sample(11) * 8, sample(12) * 8),
        scale: 0.04 + sample(13) * 0.07,
      };
    });
  }, []);

  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    elapsed.current += delta;
    const safeDelta = Math.min(delta, 0.05);

    particles.forEach((particle, index) => {
      const mesh = particlesRef.current.children[index];
      if (!mesh) return;

      particle.velocity.y -= 5 * safeDelta;
      particle.position.addScaledVector(particle.velocity, safeDelta);

      particle.rotation.x += particle.rotationSpeed.x * safeDelta;
      particle.rotation.y += particle.rotationSpeed.y * safeDelta;
      particle.rotation.z += particle.rotationSpeed.z * safeDelta;

      mesh.position.copy(particle.position);
      mesh.rotation.copy(particle.rotation);

      // Fade out during the final part of the effect.
      const opacity = THREE.MathUtils.clamp(1 - elapsed.current / 1.2, 0, 1);

      mesh.material.opacity = opacity;
    });

    if (elapsed.current >= 1.2 && !completed.current) {
      completed.current = true;
      onComplete?.();
    }
  });

  return (
    <group position={position} ref={particlesRef}>
      {particles.map((particle, index) => (
        <mesh
          key={index}
          position={particle.position}
          rotation={particle.rotation}
          scale={particle.scale}
          castShadow
        >
          <boxGeometry args={[1, 0.45, 0.5]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? "#9a633b" : "#c28a50"}
            roughness={1}
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </group>
  );
}
