import * as React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float } from "@react-three/drei";
import * as THREE from "three";

/**
 * Automotive Robot Advisor — stylized 3D avatar
 * - Helmet-shaped head with a glowing visor
 * - Angular shoulder pads and chest plate
 * - Antenna with a pulsing tip
 * - Animated mouth-grill that opens with audio amplitude
 * - Premium dark/teal-amber lighting for an automotive garage feel
 * Kept lightweight — no external GLB needed.
 */
function Head({ amplitude, speaking }: { amplitude: number; speaking: boolean }) {
  const group = React.useRef<THREE.Group>(null);
  const mouth = React.useRef<THREE.Mesh>(null);
  const ring = React.useRef<THREE.Mesh>(null);
  const antenna = React.useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y = Math.sin(t * 0.4) * 0.15;
      group.current.position.y = Math.sin(t * 1.2) * 0.05;
    }
    if (mouth.current) {
      const target = speaking ? 0.05 + amplitude * 0.45 : 0.04;
      mouth.current.scale.y += (target - mouth.current.scale.y) * 0.4;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.3;
      const s = 1 + (speaking ? amplitude * 0.25 : 0.02 * Math.sin(t * 2));
      ring.current.scale.set(s, s, 1);
    }
    if (antenna.current) {
      const glow = speaking ? 0.6 + amplitude * 0.8 + 0.2 * Math.sin(t * 8) : 0.35 + 0.15 * Math.sin(t * 3);
      const mat = antenna.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, glow, 0.15);
    }
  });

  return (
    <group ref={group}>
      {/* Outer glow ring */}
      <mesh ref={ring} position={[0, 0, -0.55]}>
        <torusGeometry args={[1.45, 0.035, 16, 80]} />
        <meshBasicMaterial color={"#f59e0b"} transparent opacity={0.45} />
      </mesh>

      {/* Helmet — main dome */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <sphereGeometry args={[0.95, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        <meshStandardMaterial color={"#1a2332"} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Helmet rim */}
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.97, 0.06, 16, 64]} />
        <meshStandardMaterial color={"#0f172a"} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Visor band */}
      <mesh position={[0, 0.22, 0.82]}>
        <boxGeometry args={[1.0, 0.22, 0.08]} />
        <meshStandardMaterial color={"#0b1a2e"} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Visor glow strip */}
      <mesh position={[0, 0.22, 0.87]}>
        <boxGeometry args={[0.86, 0.12, 0.04]} />
        <meshStandardMaterial color={"#f59e0b"} emissive={"#f59e0b"} emissiveIntensity={1.2} metalness={0.2} roughness={0.2} />
      </mesh>

      {/* Left eye lens */}
      <mesh position={[-0.28, 0.22, 0.9]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={"#fbbf24"} emissive={"#f59e0b"} emissiveIntensity={0.9} metalness={0.3} roughness={0.15} />
      </mesh>

      {/* Right eye lens */}
      <mesh position={[0.28, 0.22, 0.9]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={"#fbbf24"} emissive={"#f59e0b"} emissiveIntensity={0.9} metalness={0.3} roughness={0.15} />
      </mesh>

      {/* Cheek guards */}
      <mesh position={[-0.55, -0.18, 0.65]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.4, 0.12]} />
        <meshStandardMaterial color={"#111827"} metalness={0.65} roughness={0.3} />
      </mesh>
      <mesh position={[0.55, -0.18, 0.65]} rotation={[0, -0.35, 0]}>
        <boxGeometry args={[0.22, 0.4, 0.12]} />
        <meshStandardMaterial color={"#111827"} metalness={0.65} roughness={0.3} />
      </mesh>

      {/* Mouth / speaker grill */}
      <mesh ref={mouth} position={[0, -0.38, 0.88]} scale={[0.6, 0.04, 0.25]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color={"#1e293b"} metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Mouth grill lines */}
      <mesh position={[0, -0.38, 0.92]} scale={[0.55, 0.005, 0.005]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={"#334155"} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.42, 0.92]} scale={[0.5, 0.005, 0.005]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={"#334155"} metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Chin plate */}
      <mesh position={[0, -0.58, 0.72]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.55, 0.18, 0.1]} />
        <meshStandardMaterial color={"#0f172a"} metalness={0.7} roughness={0.25} />
      </mesh>

      {/* Antenna base */}
      <mesh position={[0.55, 0.95, -0.1]}>
        <cylinderGeometry args={[0.04, 0.06, 0.3, 12]} />
        <meshStandardMaterial color={"#1e293b"} metalness={0.75} roughness={0.2} />
      </mesh>

      {/* Antenna tip */}
      <mesh ref={antenna} position={[0.55, 1.15, -0.1]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color={"#f59e0b"} emissive={"#f59e0b"} emissiveIntensity={0.35} metalness={0.2} roughness={0.3} />
      </mesh>

      {/* Shoulder pads */}
      <mesh position={[-0.9, -1.1, 0.1]} rotation={[0.15, 0, -0.25]}>
        <boxGeometry args={[0.7, 0.35, 0.55]} />
        <meshStandardMaterial color={"#1a2332"} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.9, -1.1, 0.1]} rotation={[0.15, 0, 0.25]}>
        <boxGeometry args={[0.7, 0.35, 0.55]} />
        <meshStandardMaterial color={"#1a2332"} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Chest plate */}
      <mesh position={[0, -1.35, 0.35]}>
        <boxGeometry args={[0.9, 0.45, 0.2]} />
        <meshStandardMaterial color={"#111827"} metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Chest glow */}
      <mesh position={[0, -1.35, 0.47]}>
        <boxGeometry args={[0.3, 0.18, 0.04]} />
        <meshStandardMaterial color={"#f59e0b"} emissive={"#f59e0b"} emissiveIntensity={1.0} metalness={0.2} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function Avatar3D({ amplitude, speaking }: { amplitude: number; speaking: boolean }) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0.35, 5.4], fov: 32 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#0a0e17"]} />
        <fog attach="fog" args={["#0a0e17", 5, 12]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 4, 5]} intensity={1.1} color={"#ffffff"} />
        <pointLight position={[-3, 0, 2]} intensity={1.2} color={"#f59e0b"} />
        <pointLight position={[3, -1, 2]} intensity={0.7} color={"#fbbf24"} />
        <pointLight position={[0, 2, -1]} intensity={0.5} color={"#60a5fa"} />
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.3}>
          <group scale={0.72} position={[0, 0.2, 0]}>
            <Head amplitude={amplitude} speaking={speaking} />
          </group>
        </Float>
        <Environment preset="city" />
      </Canvas>
      {/* Amber floor glow */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-amber-500/25 via-amber-500/5 to-transparent blur-2xl" />
    </div>
  );
}
