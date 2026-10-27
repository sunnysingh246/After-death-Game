import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Survivor({ isChopping = false, onAxeSwing, onAxeHit }) {
  const body = useRef();
  const leftArm = useRef();
  const rightArm = useRef();
  const leftLeg = useRef();
  const rightLeg = useRef();
  const axe = useRef();
  const previousChopping = useRef(false);
  const previousPhase = useRef(0);
  const elapsedChopping = useRef(0);
  useFrame((state, delta) => {
    if (!body.current) return;
    const moving = body.current.parent?.userData.moving ?? false;
    if (isChopping) {
      if (!previousChopping.current) {
        elapsedChopping.current = 0;
        previousPhase.current = 0;
      }
      elapsedChopping.current += delta;
      const phase = (elapsedChopping.current % 0.88) / 0.88;
      if (phase < previousPhase.current) previousPhase.current = 0;
      if (previousPhase.current < 0.34 && phase >= 0.34) onAxeSwing?.();
      if (previousPhase.current < 0.53 && phase >= 0.53) onAxeHit?.();
      previousPhase.current = phase;
      const angle =
        phase < 0.34
          ? THREE.MathUtils.lerp(0, -1.95, phase / 0.34)
          : phase < 0.53
            ? THREE.MathUtils.lerp(-1.95, 0.92, (phase - 0.34) / 0.19)
            : THREE.MathUtils.lerp(0.92, 0, (phase - 0.53) / 0.47);
      if (rightArm.current) {
        rightArm.current.rotation.x = angle;
        rightArm.current.rotation.z = -0.16;
      }
      if (leftArm.current) {
        leftArm.current.rotation.x = -0.45;
        leftArm.current.rotation.z = 0.12;
      }
      if (axe.current) axe.current.rotation.x = angle;
      body.current.rotation.x = phase > 0.34 && phase < 0.53 ? 0.13 : -0.025;
      if (leftLeg.current) leftLeg.current.rotation.x = 0;
      if (rightLeg.current) rightLeg.current.rotation.x = 0;
    } else {
      elapsedChopping.current = 0;
      previousPhase.current = 0;
      if (axe.current) axe.current.rotation.x = 0;
      body.current.rotation.x = THREE.MathUtils.damp(
        body.current.rotation.x,
        moving ? 0.04 : 0,
        8,
        delta,
      );
      const swing = moving ? Math.sin(state.clock.elapsedTime * 8.5) * 0.42 : 0;
      if (leftArm.current) {
        leftArm.current.rotation.x = swing;
        leftArm.current.rotation.z = 0.1;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = -swing;
        rightArm.current.rotation.z = -0.12;
      }
      if (leftLeg.current) leftLeg.current.rotation.x = -swing;
      if (rightLeg.current) rightLeg.current.rotation.x = swing;
    }
    previousChopping.current = isChopping;
  });
  const cloth = new THREE.MeshStandardMaterial({ color: "#3e4941", roughness: 0.96 });
  const darkCloth = new THREE.MeshStandardMaterial({ color: "#252c29", roughness: 1 });
  const skin = new THREE.MeshStandardMaterial({ color: "#99765c", roughness: 0.95 });
  const pants = new THREE.MeshStandardMaterial({ color: "#343b3b", roughness: 1 });
  const boot = new THREE.MeshStandardMaterial({ color: "#211f1b", roughness: 1 });
  return (
    <group ref={body}>
      {/* weathered field jacket */}
      <mesh position={[0, 1.08, 0]} castShadow>
        <capsuleGeometry args={[0.29, 0.62, 5, 10]} />
        <primitive object={cloth} attach="material" />
      </mesh>
      <mesh position={[0, 1.16, 0.235]} castShadow>
        <boxGeometry args={[0.18, 0.48, 0.035]} />
        <primitive object={darkCloth} attach="material" />
      </mesh>
      <mesh position={[0, 0.93, -0.22]} castShadow>
        <boxGeometry args={[0.48, 0.48, 0.24]} />
        <meshStandardMaterial color="#554637" roughness={1} />
      </mesh>
      {/* straps and pack */}
      <mesh position={[-0.19, 1.13, 0.035]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.065, 0.62, 0.33]} />
        <meshStandardMaterial color="#776345" roughness={1} />
      </mesh>
      <mesh position={[0, 1.15, -0.29]} castShadow>
        <boxGeometry args={[0.39, 0.55, 0.2]} />
        <meshStandardMaterial color="#494337" roughness={1} />
      </mesh>
      <mesh position={[0, 1.48, 0]} castShadow>
        <sphereGeometry args={[0.17, 16, 12]} />
        <primitive object={skin} attach="material" />
      </mesh>
      <mesh position={[0, 1.55, -0.015]} castShadow>
        <sphereGeometry args={[0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#292620" roughness={1} />
      </mesh>
      <mesh position={[0, 1.39, 0.13]} castShadow>
        <boxGeometry args={[0.25, 0.075, 0.09]} />
        <meshStandardMaterial color="#332b24" roughness={1} />
      </mesh>
      {[-0.055, 0.055].map((x) => (
        <mesh key={x} position={[x, 1.49, 0.153]}>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#171816" roughness={0.5} />
        </mesh>
      ))}
      <group ref={leftArm} position={[-0.32, 1.24, 0]}>
        <mesh position={[0, -0.19, 0]} rotation={[0, 0, -0.12]} castShadow>
          <capsuleGeometry args={[0.105, 0.37, 4, 8]} />
          <primitive object={cloth} attach="material" />
        </mesh>
        <mesh position={[0, -0.42, 0.025]} castShadow>
          <sphereGeometry args={[0.075, 10, 8]} />
          <primitive object={skin} attach="material" />
        </mesh>
      </group>
      <group ref={rightArm} position={[0.32, 1.24, 0]}>
        <mesh position={[0, -0.19, 0]} rotation={[0, 0, 0.12]} castShadow>
          <capsuleGeometry args={[0.105, 0.37, 4, 8]} />
          <primitive object={cloth} attach="material" />
        </mesh>
        <mesh position={[0, -0.42, 0.025]} castShadow>
          <sphereGeometry args={[0.075, 10, 8]} />
          <primitive object={skin} attach="material" />
        </mesh>
        <group ref={axe} position={[0, -0.46, 0.04]} rotation={[0, 0, -0.15]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <cylinderGeometry args={[0.027, 0.04, 0.53, 8]} />
            <meshStandardMaterial color="#6b4b2d" roughness={1} />
          </mesh>
          <mesh position={[0.075, 0.09, 0]} rotation={[0, 0, -0.12]} castShadow>
            <boxGeometry args={[0.28, 0.16, 0.055]} />
            <meshStandardMaterial color="#747c7c" metalness={0.72} roughness={0.34} />
          </mesh>
        </group>
      </group>
      <group ref={leftLeg} position={[-0.14, 0.56, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.115, 0.37, 4, 8]} />
          <primitive object={pants} attach="material" />
        </mesh>
        <mesh position={[0, -0.47, 0.055]} castShadow>
          <boxGeometry args={[0.21, 0.14, 0.32]} />
          <primitive object={boot} attach="material" />
        </mesh>
      </group>
      <group ref={rightLeg} position={[0.14, 0.56, 0]}>
        <mesh position={[0, -0.22, 0]} castShadow>
          <capsuleGeometry args={[0.115, 0.37, 4, 8]} />
          <primitive object={pants} attach="material" />
        </mesh>
        <mesh position={[0, -0.47, 0.055]} castShadow>
          <boxGeometry args={[0.21, 0.14, 0.32]} />
          <primitive object={boot} attach="material" />
        </mesh>
      </group>
    </group>
  );
}
