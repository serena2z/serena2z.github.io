import * as T from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rooms, waypoints, getWaypoint } from './landscape-config';

function petalGeometry() {
  const positions: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 6; row++) {
    const t = row / 6;
    for (let col = 0; col <= 4; col++) {
      const u = col / 2 - 1;
      positions.push(
        u * Math.sin(Math.PI * t) * 0.42,
        0.22 * t * t + 0.11 * u * u * Math.sin(Math.PI * t),
        t,
      );
    }
  }
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 4; col++) {
      const a = row * 5 + col;
      indices.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type Bloom = {
  x: number;
  y: number;
  z: number;
  size: number;
  kind: number;
  turn: number;
};

export function createFlowers() {
  const petal = petalGeometry();
  const blossom = [1, 3, 2].map((layers, kind) => {
    const parts: T.BufferGeometry[] = [];
    for (let layer = 0; layer < layers; layer++)
      for (let i = 0; i < 8; i++) {
        const part = petal.clone(),
          size = 1 - layer * 0.22;
        part.scale(size, kind === 1 ? 1.8 : 1, size);
        part.rotateX(-layer * 0.2);
        part.rotateY((i * Math.PI) / 4 + layer * 0.35);
        part.translate(0, layer * 0.12, 0);
        parts.push(part);
      }
    const geometry = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return geometry;
  });
  const bloomMaterial = new T.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.72,
    side: T.DoubleSide,
  });
  const green = new T.MeshStandardMaterial({
    color: '#648341',
    roughness: 0.85,
    side: T.DoubleSide,
  });
  const pollen = new T.MeshStandardMaterial({
    color: '#e6b856',
    roughness: 0.65,
  });
  const stem = new T.CylinderGeometry(0.009, 0.014, 1, 5);
  const center = new T.SphereGeometry(0.16, 8, 6);
  const shades = [
    '#f3c1d2',
    '#df779a',
    '#fff4da',
    '#caabd9',
    '#ef9dab',
    '#fff7eb',
  ];

  const arrangements: { parent: T.Object3D; blooms: Bloom[]; base: number }[] =
    [];
  function plant(parent: T.Object3D, blooms: Bloom[], base = 0.02) {
    arrangements.push({ parent, blooms, base });
  }
  function flush(parent: T.Object3D) {
    parent.updateWorldMatrix(true, false);
    const inverse = parent.matrixWorld.clone().invert();
    const blooms = arrangements.flatMap((arrangement) => {
      arrangement.parent.updateWorldMatrix(true, false);
      const transform = inverse
        .clone()
        .multiply(arrangement.parent.matrixWorld);
      return arrangement.blooms.map((b) => ({
        ...b,
        base: arrangement.base,
        transform,
      }));
    });
    const dummy = new T.Object3D(),
      matrix = new T.Matrix4();
    const stems = new T.InstancedMesh(stem, green, blooms.length);
    const leaves = new T.InstancedMesh(petal, green, blooms.length * 3);
    const hearts = new T.InstancedMesh(center, pollen, blooms.length);
    const meshes = blossom.map(
      (geometry, kind) =>
        new T.InstancedMesh(
          geometry,
          bloomMaterial,
          blooms.filter((b) => b.kind === kind).length,
        ),
    );
    const counts = [0, 0, 0];
    blooms.forEach((b, i) => {
      const { base, transform } = b;
      const height = b.y - base;
      dummy.position.set(b.x, base + height / 2, b.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(i, matrix.multiplyMatrices(transform, dummy.matrix));
      for (let j = 0; j < 3; j++) {
        dummy.position.set(b.x, base + height * (0.25 + j * 0.19), b.z);
        dummy.rotation.set(-0.42, b.turn + j * 2.4, 0.16);
        dummy.scale.set(0.2, 0.24, 0.23);
        dummy.updateMatrix();
        leaves.setMatrixAt(
          i * 3 + j,
          matrix.multiplyMatrices(transform, dummy.matrix),
        );
      }
      dummy.position.set(b.x, b.y, b.z);
      dummy.rotation.set(0.1 * Math.sin(i), b.turn, 0.12 * Math.cos(i));
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      const index = counts[b.kind]++;
      meshes[b.kind].setMatrixAt(
        index,
        matrix.multiplyMatrices(transform, dummy.matrix),
      );
      meshes[b.kind].setColorAt(index, new T.Color(shades[i % shades.length]));
      dummy.position.y += b.size * 0.15;
      dummy.scale.set(b.size, b.size * 0.42, b.size);
      dummy.updateMatrix();
      hearts.setMatrixAt(i, matrix.multiplyMatrices(transform, dummy.matrix));
    });
    for (const mesh of [stems, leaves, hearts, ...meshes]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
    arrangements.length = 0;
  }

  // Keep flowers in soil, leaving every walking route and threshold clear.
  const edges = waypoints.flatMap((a) =>
    a.neighbors
      .filter((id) => id > a.id)
      .map((id) => {
        const b = getWaypoint(id);
        return [
          new T.Vector2(a.position[0], a.position[2]),
          new T.Vector2(b.position[0], b.position[2]),
        ];
      }),
  );
  function isGarden(x: number, z: number) {
    if (Math.hypot(x, z + 2) < 3.05 || (Math.abs(x) < 7 && z > 7.8))
      return false;
    for (const room of rooms) {
      const dx = x - room.position[0],
        dz = z - room.position[2];
      const localX =
        dx * Math.cos(room.rotation) - dz * Math.sin(room.rotation);
      const localZ =
        dx * Math.sin(room.rotation) + dz * Math.cos(room.rotation);
      if (
        Math.abs(localX) < room.width / 2 + 0.55 &&
        Math.abs(localZ) < room.depth / 2 + 1.55
      )
        return false;
    }
    const point = new T.Vector2(x, z);
    return edges.every(([a, b]) => {
      const delta = b.clone().sub(a);
      const t = T.MathUtils.clamp(
        point.clone().sub(a).dot(delta) / delta.lengthSq(),
        0,
        1,
      );
      return point.distanceTo(a.clone().addScaledVector(delta, t)) > 1.8;
    });
  }
  function garden(parent: T.Object3D) {
    let seed = 9183;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const blooms: Bloom[] = [];
    const beds = [
      [-4.8, -2.3, 1.3, 3.2],
      [-4.5, -6.8, 2.1, 1.5],
      [3.7, -0.9, 1.7, 2.5],
      [3.8, -6.9, 2.3, 1.7],
      [-4.5, 6.5, 2.3, 1.2],
      [4.8, 6.7, 2.3, 1.4],
      [-20.1, -5, 1.6, 4.8],
      [20.2, -5, 1.6, 4.8],
      [-20.1, 9, 2, 3.1],
      [21, 9.5, 2.4, 2.8],
      [-8.5, -17.5, 2, 2],
      [8.8, -17.8, 2.1, 2],
      [-24, -2, 2.5, 4],
      [25, -1, 2.6, 4.8],
    ];
    for (const [cx, cz, rx, rz] of beds)
      for (let i = 0; i < 140; i++) {
        const theta = random() * Math.PI * 2,
          radius = Math.sqrt(random());
        const x = cx + Math.cos(theta) * radius * rx,
          z = cz + Math.sin(theta) * radius * rz;
        if (!isGarden(x, z)) continue;
        blooms.push({
          x,
          z,
          y: 0.32 + random() * 0.4,
          size: 0.085 + random() * 0.075,
          kind: i % 3,
          turn: random() * 6.28,
        });
      }
    plant(parent, blooms);
    flush(parent);
  }
  function bouquet(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    scale = 1,
  ) {
    const group = new T.Group();
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    parent.add(group);
    const blooms = Array.from({ length: 17 }, (_, i) => {
      const angle = i * 2.4,
        radius = Math.sqrt(i / 17) * 0.27;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        y: 0.42 + 0.24 * (1 - radius / 0.27),
        size: 0.09,
        kind: i % 3,
        turn: angle,
      };
    });
    plant(group, blooms, -0.08);
  }
  return { garden, bouquet };
}
