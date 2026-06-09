import * as THREE from "three";

export function buildTerrainChunk(
  chunkX: number,
  chunkZ: number,
  chunkSize: number,
  columns: number,
  rows: number,
  worldWidth: number,
  worldHeight: number,
  heights: Float32Array,
  colors: Uint32Array
): THREE.Mesh | null {
  const cellW = worldWidth / columns;
  const cellH = worldHeight / rows;
  const startX = chunkX * chunkSize * cellW - worldWidth / 2;
  const startZ = chunkZ * chunkSize * cellH - worldHeight / 2;

  const vertices: number[] = [];
  const vertColors: number[] = [];
  const indices: number[] = [];
  let vi = 0;

  for (let lx = 0; lx < chunkSize; lx++) {
    const cx = chunkX * chunkSize + lx;
    if (cx >= columns) continue;

    for (let lz = 0; lz < chunkSize; lz++) {
      const cz = chunkZ * chunkSize + lz;
      if (cz >= rows) continue;

      const idx = cz * columns + cx;
      const h = heights[idx] ?? 1;
      const color = colors[idx] ?? 0x7fae55;

      const vx = lx * cellW;
      const vz = lz * cellH;
      const vx2 = vx + cellW;
      const vz2 = vz + cellH;

      // Top face (Y plane)
      const base = vi;
      vertices.push(vx, h, vz, vx2, h, vz, vx, h, vz2, vx2, h, vz2);
      for (let j = 0; j < 4; j++) vertColors.push(color, color, color);
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      vi += 4;

      // Side faces (only if height > 0)
      if (h <= 0) continue;

      const darker = multiplyColor(color, 0.6);

      // North face
      const bn = vi;
      vertices.push(vx, 0, vz, vx2, 0, vz, vx, h, vz, vx2, h, vz);
      for (let j = 0; j < 4; j++) vertColors.push(darker, darker, darker);
      indices.push(bn, bn + 2, bn + 1, bn + 1, bn + 2, bn + 3);
      vi += 4;

      // South face
      const bs = vi;
      vertices.push(vx, 0, vz2, vx, h, vz2, vx2, 0, vz2, vx2, h, vz2);
      for (let j = 0; j < 4; j++) vertColors.push(darker, darker, darker);
      indices.push(bs, bs + 1, bs + 2, bs + 1, bs + 3, bs + 2);
      vi += 4;

      // East face
      const be = vi;
      vertices.push(vx2, 0, vz, vx2, h, vz, vx2, 0, vz2, vx2, h, vz2);
      for (let j = 0; j < 4; j++) vertColors.push(darker, darker, darker);
      indices.push(be, be + 1, be + 2, be + 1, be + 3, be + 2);
      vi += 4;

      // West face
      const bw = vi;
      vertices.push(vx, 0, vz2, vx, h, vz2, vx, 0, vz, vx, h, vz);
      for (let j = 0; j < 4; j++) vertColors.push(darker, darker, darker);
      indices.push(bw, bw + 1, bw + 2, bw + 1, bw + 3, bw + 2);
      vi += 4;
    }
  }

  if (indices.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(vertColors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(startX, 0, startZ);
  mesh.receiveShadow = true;
  return mesh;
}

function multiplyColor(hex: number, factor: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * factor);
  const g = Math.floor(((hex >> 8) & 0xff) * factor);
  const b = Math.floor((hex & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
