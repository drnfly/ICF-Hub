import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function WallSegment({ wall }) {
  const { position, rotationY, dimensions } = useMemo(() => {
    const start = wall.start || [0, 0, 0];
    const end = wall.end || [0, 0, 0];

    const dx = (end[0] || 0) - (start[0] || 0);
    const dy = (end[1] || 0) - (start[1] || 0);
    const length = Math.max(Math.sqrt(dx * dx + dy * dy), 0.1);

    const centerX = ((start[0] || 0) + (end[0] || 0)) / 2;
    const centerZ = ((start[1] || 0) + (end[1] || 0)) / 2;
    const height = wall.height_ft || 10;
    const thickness = wall.thickness_ft || 0.5;
    const angle = Math.atan2(dy, dx);

    return {
      position: [centerX, height / 2, centerZ],
      rotationY: -angle,
      dimensions: [length, height, thickness]
    };
  }, [wall]);

  return (
    <mesh position={position} rotation={[0, rotationY, 0]} castShadow receiveShadow>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial color="#f97316" metalness={0.15} roughness={0.75} />
    </mesh>
  );
}

function TakeoffScene({ walls }) {
  const groupRef = useRef(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.15;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[12, 18, 10]} intensity={1.2} castShadow />

      <group ref={groupRef}>
        {walls.map((wall) => (
          <WallSegment key={wall.id} wall={wall} />
        ))}
      </group>

      <gridHelper args={[120, 80, "#d4d4d8", "#e4e4e7"]} position={[0, 0, 0]} />
    </>
  );
}

export default function Takeoff3DViewer({ model3d }) {
  const walls = model3d?.walls || [];

  if (!walls.length) {
    return (
      <div className="h-[360px] rounded-md border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
        3D wall layout will appear after analysis.
      </div>
    );
  }

  return (
    <div className="h-[360px] rounded-md overflow-hidden border border-border bg-gradient-to-b from-zinc-100 to-zinc-200">
      <Canvas shadows camera={{ position: [24, 20, 24], fov: 52 }}>
        <TakeoffScene walls={walls} />
      </Canvas>
    </div>
  );
}
