import * as THREE from "three";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a110e");

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
  sun.position.set(10, 20, 5);
  scene.add(sun);

  const bounce = new THREE.DirectionalLight(0xaaccff, 0.3);
  bounce.position.set(-5, 3, -5);
  scene.add(bounce);

  return scene;
}

export function createGround(size = 24, color = 0x244234): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

export function tileToWorld(tx: number, ty: number, gridSize = 24): { x: number; z: number } {
  const half = gridSize / 2;
  return {
    x: (tx - ty) * 0.5,
    z: (tx + ty) * 0.5 - half,
  };
}
