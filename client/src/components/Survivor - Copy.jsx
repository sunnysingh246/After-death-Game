import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Survivor({
    isChopping = false,
    onAxeSwing,
    onAxeHit,
}) {
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
            const cycleDuration = 0.8;
            const phase = (elapsedChopping.current % cycleDuration) / cycleDuration;

            // Sound events are fired at the matching animation phases.
            if (phase < previousPhase.current) {
                previousPhase.current = 0;
            }
            if (previousPhase.current < 0.34 && phase >= 0.34) {
                onAxeSwing?.();
            }
            if (previousPhase.current < 0.53 && phase >= 0.53) {
                onAxeHit?.();
            }
            previousPhase.current = phase;

            let angle;
            let bodyLean;
            if (phase < 0.34) {
                const windup = THREE.MathUtils.smoothstep(phase / 0.34, 0, 1);
                angle = THREE.MathUtils.lerp(0, -2, windup);
                bodyLean = -0.12 * windup;
            } else if (phase < 0.53) {
                const strike = THREE.MathUtils.smoothstep(
                    (phase - 0.34) / 0.19,
                    0,
                    1
                );
                angle = THREE.MathUtils.lerp(-2, 1.1, strike);
                bodyLean = THREE.MathUtils.lerp(-0.12, 0.18, strike);
            } else {
                const recovery = THREE.MathUtils.smoothstep(
                    (phase - 0.53) / 0.47,
                    0,
                    1
                );
                angle = THREE.MathUtils.lerp(1.1, 0, recovery);
                bodyLean = THREE.MathUtils.lerp(0.18, 0, recovery);
            }

            if (rightArm.current) rightArm.current.rotation.x = angle;
            if (leftArm.current) leftArm.current.rotation.x = -0.35;
            if (axe.current) axe.current.rotation.x = -angle * 0.45;
            body.current.rotation.x = bodyLean;
            body.current.position.y = phase < 0.34
                ? -0.06 * Math.sin((phase / 0.34) * Math.PI)
                : 0;
            if (leftLeg.current) leftLeg.current.rotation.x = 0;
            if (rightLeg.current) rightLeg.current.rotation.x = 0;
        } else {
            elapsedChopping.current = 0;
            previousPhase.current = 0;
            if (axe.current) axe.current.rotation.x = 0;
            if (body.current) body.current.rotation.x = 0;
            if (body.current) body.current.position.y = 0;

            if (moving) {
                const swing = Math.sin(state.clock.elapsedTime * 9) * 0.55;
                if (leftArm.current) leftArm.current.rotation.x = swing;
                if (rightArm.current) rightArm.current.rotation.x = -swing;
                if (leftLeg.current) leftLeg.current.rotation.x = -swing;
                if (rightLeg.current) rightLeg.current.rotation.x = swing;
            } else {
                const idleSway = Math.sin(state.clock.elapsedTime * 1.8) * 0.035;
                if (leftArm.current) leftArm.current.rotation.x = idleSway;
                if (rightArm.current) rightArm.current.rotation.x = -idleSway;
                if (leftLeg.current) leftLeg.current.rotation.x = 0;
                if (rightLeg.current) rightLeg.current.rotation.x = 0;
            }

            body.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.012;
        }

        if (isChopping) body.current.scale.y = 1;
        previousChopping.current = isChopping;
    });

    return (
        <group ref={body}>
            {/* Body */}
            <mesh position={[0, 1.05, 0]} castShadow>
                <capsuleGeometry args={[0.3, 0.65, 4, 8]} />
                <meshStandardMaterial color="#ef783d" roughness={0.8} />
            </mesh>

            {/* Head */}
            <mesh position={[0, 1.85, 0]} castShadow>
                <sphereGeometry args={[0.27, 24, 24]} />
                <meshStandardMaterial color="#e8b58e" />
            </mesh>

            {/* Hair */}
            <mesh position={[0, 2, -0.035]} castShadow>
                <sphereGeometry args={[0.275, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#49352b" />
            </mesh>

            {/* Eyes */}
            {[-0.09, 0.09].map((x) => (
                <mesh key={x} position={[x, 1.88, 0.245]}>
                    <sphereGeometry args={[0.035, 12, 12]} />
                    <meshStandardMaterial color="#222222" />
                </mesh>
            ))}

            {/* Left arm */}
            <group ref={leftArm} position={[-0.34, 1.15, 0]}>
                <mesh position={[0, -0.2, 0]} castShadow>
                    <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
                    <meshStandardMaterial color="#e8b58e" />
                </mesh>
            </group>

            {/* Right arm and axe */}
            <group ref={rightArm} position={[0.34, 1.15, 0]}>
                <mesh position={[0, -0.2, 0]} castShadow>
                    <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
                    <meshStandardMaterial color="#e8b58e" />
                </mesh>

                <group ref={axe} position={[0, -0.43, 0.02]} rotation={[0, 0, -0.15]}>
                    <mesh position={[0, -0.17, 0]} castShadow>
                        <cylinderGeometry args={[0.035, 0.045, 0.48, 8]} />
                        <meshStandardMaterial color="#80552f" />
                    </mesh>
                    <mesh position={[0, 0.08, 0]} castShadow>
                        <boxGeometry args={[0.3, 0.17, 0.09]} />
                        <meshStandardMaterial color="#9ba5ad" metalness={0.65} roughness={0.35} />
                    </mesh>
                </group>
            </group>

            {/* Legs */}
            <group ref={leftLeg} position={[-0.14, 0.52, 0]}>
                <mesh position={[0, -0.24, 0]} castShadow>
                    <capsuleGeometry args={[0.11, 0.4, 4, 8]} />
                    <meshStandardMaterial color="#405d9b" />
                </mesh>
            </group>
            <group ref={rightLeg} position={[0.14, 0.52, 0]}>
                <mesh position={[0, -0.24, 0]} castShadow>
                    <capsuleGeometry args={[0.11, 0.4, 4, 8]} />
                    <meshStandardMaterial color="#405d9b" />
                </mesh>
            </group>
        </group>
    );
}