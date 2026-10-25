import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function Survivor() {
    const body = useRef();
    const leftArm = useRef();
    const rightArm = useRef();
    const leftLeg = useRef();
    const rightLeg = useRef();

    useFrame(({ clock }) => {
        if (!body.current) return;


        const moving = body.current.parent?.userData.moving;

        if (moving) {
            const swing = Math.sin(clock.elapsedTime * 10) * 0.55;

            if (leftArm.current) leftArm.current.rotation.x = swing;
            if (rightArm.current) rightArm.current.rotation.x = -swing;

            if (leftLeg.current) leftLeg.current.rotation.x = -swing;
            if (rightLeg.current) rightLeg.current.rotation.x = swing;
        } else {
            if (leftArm.current) leftArm.current.rotation.x = 0;
            if (rightArm.current) rightArm.current.rotation.x = 0;

            if (leftLeg.current) leftLeg.current.rotation.x = 0;
            if (rightLeg.current) rightLeg.current.rotation.x = 0;
        }


    });

    return (<group ref={body}>
        {/* Body */}
        <mesh position={[0, 1.05, 0]} castShadow>
            <capsuleGeometry args={[0.3, 0.65, 4, 8]} /> <meshStandardMaterial color="#ef783d" roughness={0.8} /> </mesh>


        {/* Head */}
        <mesh position={[0, 1.85, 0]} castShadow>
            <sphereGeometry args={[0.27, 24, 24]} />
            <meshStandardMaterial color="#e8b58e" />
        </mesh>

        {/* Hair */}
        <mesh position={[0, 2, -0.035]} castShadow>
            <sphereGeometry
                args={[0.275, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color="#49352b" />
        </mesh>

        {/* Eyes */}
        {[-0.09, 0.09].map((x) => (
            <mesh key={x} position={[x, 1.88, 0.245]}>
                <sphereGeometry args={[0.035, 12, 12]} />
                <meshStandardMaterial color="#222222" />
            </mesh>
        ))}

        {/* Arms */}
        <group ref={leftArm} position={[-0.34, 1.15, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
                <meshStandardMaterial color="#e8b58e" />
            </mesh>
        </group>

        <group ref={rightArm} position={[0.34, 1.15, 0]}>
            <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
                <meshStandardMaterial color="#e8b58e" />
            </mesh>
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
