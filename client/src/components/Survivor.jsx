import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const clamp01 = (value) => THREE.MathUtils.clamp(value, 0, 1);

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
    const impactKick = useRef(0);

    useFrame((state, delta) => {
        if (!body.current) return;

        const moving = body.current.parent?.userData.moving ?? false;
        const safeDelta = Math.min(delta, 0.05);

        if (isChopping) {
            if (!previousChopping.current) {
                elapsedChopping.current = 0;
                previousPhase.current = 0;
                impactKick.current = 0;
            }

            elapsedChopping.current += safeDelta;

            // A slower, more readable 1.05-second chop: wind-up, strike, recovery.
            const cycleDuration = 1.05;
            const phase = (elapsedChopping.current % cycleDuration) / cycleDuration;

            if (phase < previousPhase.current) previousPhase.current = 0;

            if (previousPhase.current < 0.36 && phase >= 0.36) onAxeSwing?.();
            if (previousPhase.current < 0.53 && phase >= 0.53) {
                onAxeHit?.();
                impactKick.current = 1;
            }
            previousPhase.current = phase;

            let armAngle;
            let bodyLean;
            let bodyTwist;

            if (phase < 0.36) {
                // Pull the axe up and back before the hit.
                const t = THREE.MathUtils.smoothstep(phase / 0.36, 0, 1);
                armAngle = THREE.MathUtils.lerp(0.05, -2.05, t);
                bodyLean = THREE.MathUtils.lerp(0, 0.16, t);
                bodyTwist = THREE.MathUtils.lerp(0, -0.12, t);
            } else if (phase < 0.53) {
                // Fast acceleration into the trunk.
                const t = THREE.MathUtils.smoothstep((phase - 0.36) / 0.17, 0, 1);
                armAngle = THREE.MathUtils.lerp(-2.05, 0.9, t);
                bodyLean = THREE.MathUtils.lerp(0.16, -0.16, t);
                bodyTwist = THREE.MathUtils.lerp(-0.12, 0.08, t);
            } else {
                // Settle back into a ready stance rather than snapping to idle.
                const t = THREE.MathUtils.smoothstep((phase - 0.53) / 0.47, 0, 1);
                armAngle = THREE.MathUtils.lerp(0.9, 0.05, t);
                bodyLean = THREE.MathUtils.lerp(-0.16, 0, t);
                bodyTwist = THREE.MathUtils.lerp(0.08, 0, t);
            }

            impactKick.current = Math.max(0, impactKick.current - safeDelta * 5.5);
            const kick = impactKick.current;

            if (rightArm.current) {
                rightArm.current.rotation.set(armAngle, 0, -0.08 + kick * 0.08);
            }
            if (leftArm.current) {
                leftArm.current.rotation.set(-0.42 + kick * 0.12, 0, 0.18);
            }
            if (axe.current) {
                // Keep the axe head leading the strike, then add a small impact recoil.
                axe.current.rotation.set(0.18 - kick * 0.16, 0, -0.12);
            }
            body.current.rotation.set(bodyLean, bodyTwist, 0);
            body.current.position.y = -0.035 * Math.sin(Math.PI * clamp01(phase / 0.36));
            body.current.scale.set(1, 1, 1);

            if (leftLeg.current) leftLeg.current.rotation.set(0.08, 0, 0.04);
            if (rightLeg.current) rightLeg.current.rotation.set(-0.08, 0, -0.04);
        } else {
            elapsedChopping.current = 0;
            previousPhase.current = 0;
            impactKick.current = 0;

            body.current.rotation.set(0, 0, 0);
            body.current.position.y = 0;
            body.current.scale.set(
                1,
                1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.012,
                1
            );
            if (axe.current) axe.current.rotation.set(0, 0, -0.15);

            if (moving) {
                const swing = Math.sin(state.clock.elapsedTime * 9) * 0.48;
                if (leftArm.current) leftArm.current.rotation.set(swing, 0, 0);
                if (rightArm.current) rightArm.current.rotation.set(-swing, 0, 0);
                if (leftLeg.current) leftLeg.current.rotation.set(-swing, 0, 0);
                if (rightLeg.current) rightLeg.current.rotation.set(swing, 0, 0);
            } else {
                const idleSway = Math.sin(state.clock.elapsedTime * 1.8) * 0.025;
                if (leftArm.current) leftArm.current.rotation.set(idleSway, 0, 0.02);
                if (rightArm.current) rightArm.current.rotation.set(-idleSway, 0, -0.02);
                if (leftLeg.current) leftLeg.current.rotation.set(0, 0, 0);
                if (rightLeg.current) rightLeg.current.rotation.set(0, 0, 0);
            }
        }

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