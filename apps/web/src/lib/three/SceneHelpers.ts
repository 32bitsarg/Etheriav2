import * as THREE from "three";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1a2a20");

  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffeedd, 1.4);
  sun.position.set(15, 12, 10);
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xaaccff, 0.25);
  fill.position.set(-8, 4, -6);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.2);
  rim.position.set(0, 2, -10);
  scene.add(rim);

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
