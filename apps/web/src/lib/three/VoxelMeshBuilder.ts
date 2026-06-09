import * as THREE from "three";

export type VoxelGrid = number[][][]; // [y][z][x]

interface FaceData {
  positions: number[][];
  normals: number[][];
  uvs: number[][];
}

function addFace(faces: FaceData[], fx: number, fy: number, fz: number, nx: number, ny: number, nz: number) {
  const s = 0.5;
  const corners: number[][] = [];

  if (nx !== 0) {
    const x = fx + nx * s;
    corners.push([x, fy - s, fz - s], [x, fy - s, fz + s], [x, fy + s, fz + s], [x, fy + s, fz - s]);
  } else if (ny !== 0) {
    const y = fy + ny * s;
    corners.push([fx - s, y, fz - s], [fx + s, y, fz - s], [fx + s, y, fz + s], [fx - s, y, fz + s]);
  } else {
    const z = fz + nz * s;
    corners.push([fx - s, fy - s, z], [fx + s, fy - s, z], [fx + s, fy + s, z], [fx - s, fy + s, z]);
  }

  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const normal = [nx, ny, nz];
  faces.push({ positions: corners, normals: [normal, normal, normal, normal], uvs: uv });
}

const NEIGHBORS: [number, number, number][] = [
  [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
];

export function buildVoxelMesh(
  grid: VoxelGrid,
  materials: Record<number, number>,
  voxelSize: number
): THREE.Group {
  const group = new THREE.Group();
  const height = grid.length;
  const depth = grid[0]?.length ?? 0;
  const width = grid[0]?.[0]?.length ?? 0;

  const materialFaces = new Map<number, FaceData[]>();

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const matId = grid[y]?.[z]?.[x] ?? 0;
        if (matId === 0) continue;

        for (const [nx, ny, nz] of NEIGHBORS) {
          const nx2 = x + nx;
          const ny2 = y + ny;
          const nz2 = z + nz;
          const neighbor = grid[ny2]?.[nz2]?.[nx2] ?? 0;
          if (neighbor === 0) {
            const list = materialFaces.get(matId) ?? [];
            addFace(list, x, y, z, nx, ny, nz);
            materialFaces.set(matId, list);
          }
        }
      }
    }
  }

  for (const [matId, faces] of materialFaces) {
    if (faces.length === 0) continue;

    const color = materials[matId] ?? 0x888888;
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let vi = 0;

    for (const face of faces) {
      for (let i = 0; i < 4; i++) {
        vertices.push(face.positions[i][0] * voxelSize, face.positions[i][1] * voxelSize, face.positions[i][2] * voxelSize);
        normals.push(face.normals[i][0], face.normals[i][1], face.normals[i][2]);
      }
      indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const cx = (width / 2) * voxelSize;
    const cz = (depth / 2) * voxelSize;
    mesh.position.set(-cx, 0, -cz);
    group.add(mesh);
  }

  return group;
}
