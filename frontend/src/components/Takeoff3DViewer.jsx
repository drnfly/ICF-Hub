import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function useWallGeometry(model3d) {
  return useMemo(() => {
    const walls = model3d?.walls || [];
    if (!walls.length) return [];

    return walls.map((wall, index) => {
      const start = wall.start || [0, 0, 0];
      const end = wall.end || [0, 0, 0];

      const sx = Number(start[0]) || 0;
      const sz = Number(start[1]) || 0;
      const ex = Number(end[0]) || 0;
      const ez = Number(end[1]) || 0;

      const dx = ex - sx;
      const dz = ez - sz;
      const length = Math.max(Math.sqrt(dx * dx + dz * dz), 0.25);
      const angle = Math.atan2(dz, dx);

      const centerX = (sx + ex) / 2;
      const centerZ = (sz + ez) / 2;
      const height = Number(wall.height_ft) || 10;
      const thickness = Number(wall.thickness_ft) || 0.5;

      return {
        id: wall.id || `W${index + 1}`,
        centerX,
        centerZ,
        length,
        angle,
        height,
        thickness
      };
    });
  }, [model3d]);
}

export default function Takeoff3DViewer({ model3d }) {
  const containerRef = useRef(null);
  const walls = useWallGeometry(model3d);

  useEffect(() => {
    if (!containerRef.current || !walls.length) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f8fafc");

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(34, 26, 32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 8;
    controls.maxDistance = 200;
    controls.target.set(0, 4, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(28, 44, 14);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 260),
      new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: 0.95, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(200, 80, "#cbd5e1", "#e2e8f0");
    scene.add(grid);

    walls.forEach((wall) => {
      const geometry = new THREE.BoxGeometry(wall.length, wall.height, wall.thickness);
      const material = new THREE.MeshStandardMaterial({ color: "#f97316", roughness: 0.72, metalness: 0.12 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(wall.centerX, wall.height / 2, wall.centerZ);
      mesh.rotation.y = -wall.angle;
      scene.add(mesh);
    });

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nextWidth = container.clientWidth || width;
      const nextHeight = container.clientHeight || height;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();

      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose?.());
          } else {
            obj.material.dispose?.();
          }
        }
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [walls]);

  if (!walls.length) {
    return (
      <div className="h-[360px] rounded-md border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
        3D wall layout will appear after analysis.
      </div>
    );
  }

  return (
    <div className="relative h-[360px] rounded-md overflow-hidden border border-zinc-300 bg-gradient-to-b from-zinc-100 to-zinc-200 p-4">
      <div ref={containerRef} className="h-full w-full rounded-md border border-zinc-300 bg-white/80 relative overflow-hidden" />
      <div className="absolute left-8 bottom-8 bg-white/90 border border-zinc-200 px-2 py-1 text-[11px] uppercase tracking-wide text-zinc-600">
        Interactive 3D Wall Model
      </div>
    </div>
  );
}
