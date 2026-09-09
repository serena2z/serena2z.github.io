import * as T from 'three';
import { terrainHeight } from './landscape-terrain';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function leafGeometry() {
  const vertices: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 5; i++) {
    const t = i / 5,
      width = Math.sin(t * Math.PI) * 0.3;
    for (const side of [-1, 0, 1])
      vertices.push(
        side * width,
        Math.sin(t * Math.PI) * 0.09 - Math.abs(side) * 0.045,
        t - 0.45,
      );
  }
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createPlanting(wood: T.MeshStandardMaterial) {
  const leaf = leafGeometry();
  const leavesMaterial = new T.MeshStandardMaterial({
    color: '#c2d0a6',
    roughness: 0.84,
    side: T.DoubleSide,
  });
  const petalParts: T.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5;
    const petal = leaf.clone();
    petal.scale(0.8, 0.55, 0.72);
    petal.rotateY(angle);
    petal.translate(Math.sin(angle) * 0.28, 0, Math.cos(angle) * 0.28);
    petalParts.push(petal);
  }
  const flower = mergeGeometries(petalParts)!;
  petalParts.forEach((p) => p.dispose());
  const flowersMaterial = new T.MeshStandardMaterial({
    color: '#f0c9c8',
    roughness: 0.9,
    side: T.DoubleSide,
  });

  function tree(
    parent: T.Object3D,
    x: number,
    z: number,
    scale: number,
    blossom = false,
  ) {
    const rng = random(Math.round((x + 80) * 771 + (z + 80) * 991));
    const group = new T.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);
    parent.add(group);
    const leaves: { position: T.Vector3; size: number }[] = [],
      flowers: T.Vector3[] = [];
    function branch(points: T.Vector3[], radius: number) {
      const curve = new T.CatmullRomCurve3(points);
      const tube = new T.TubeGeometry(curve, 9, radius, 8, false);
      const positions = tube.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const t = Math.floor(i / 9) / 9;
        const center = curve.getPointAt(t);
        const v = new T.Vector3()
          .fromBufferAttribute(positions, i)
          .sub(center)
          .multiplyScalar(1 - t * 0.74)
          .add(center);
        positions.setXYZ(i, v.x, v.y, v.z);
      }
      tube.computeVertexNormals();
      const mesh = new T.Mesh(tube, wood);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    const base = new T.Vector3(),
      fork = new T.Vector3(0.035, 0.57, -0.025);
    branch(
      [
        base,
        new T.Vector3(-0.025, 0.24, 0.015),
        fork,
        new T.Vector3(0.06, 1.0, 0),
      ],
      0.043,
    );
    for (let i = 0; i < 8; i++) {
      const a = i * 2.3999 + rng() * 0.3,
        height = 0.65 + (i % 4) * 0.115;
      const root = new T.Vector3(0.025, 0.38 + i * 0.058, 0);
      const end = new T.Vector3(
        Math.cos(a) * (0.3 + rng() * 0.15),
        height,
        Math.sin(a) * (0.3 + rng() * 0.15),
      );
      branch(
        [
          root,
          root
            .clone()
            .lerp(end, 0.46)
            .add(new T.Vector3(0, 0.1, 0)),
          end,
        ],
        0.016 - i * 0.0009,
      );
      for (let j = 0; j < 5; j++) {
        const angle = a + (j - 2) * 0.56;
        const start = root.clone().lerp(end, 0.35 + j * 0.14);
        const tip = end
          .clone()
          .add(
            new T.Vector3(
              Math.cos(angle) * (0.1 + rng() * 0.12),
              0.025 + rng() * 0.16,
              Math.sin(angle) * (0.1 + rng() * 0.12),
            ),
          );
        branch(
          [
            start,
            start
              .clone()
              .lerp(tip, 0.55)
              .add(new T.Vector3(0, 0.04, 0)),
            tip,
          ],
          0.005,
        );
        for (let k = 0; k < 62; k++) {
          const azimuth = rng() * Math.PI * 2,
            radius = Math.sqrt(rng()) * 0.17;
          const position = tip
            .clone()
            .add(
              new T.Vector3(
                Math.cos(azimuth) * radius,
                (rng() - 0.35) * 0.17,
                Math.sin(azimuth) * radius,
              ),
            );
          if (!blossom || k % 3 === 0)
            leaves.push({ position, size: 0.027 + rng() * 0.022 });
          if (blossom && k % 2 === 0) flowers.push(position);
        }
      }
    }
    const matrix = new T.Object3D(),
      color = new T.Color();
    const foliage = new T.InstancedMesh(leaf, leavesMaterial, leaves.length);
    leaves.forEach((l, i) => {
      matrix.position.copy(l.position);
      matrix.rotation.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * 0.8);
      matrix.scale.setScalar(l.size);
      matrix.updateMatrix();
      foliage.setMatrixAt(i, matrix.matrix);
      color.setHSL(0.23 + rng() * 0.06, 0.24 + rng() * 0.2, 0.3 + rng() * 0.32);
      foliage.setColorAt(i, color);
    });
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    foliage.computeBoundingSphere();
    group.add(foliage);
    if (flowers.length) {
      const blooms = new T.InstancedMesh(
        flower,
        flowersMaterial,
        flowers.length,
      );
      flowers.forEach((position, i) => {
        matrix.position.copy(position);
        matrix.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
        matrix.scale.setScalar(0.018 + rng() * 0.012);
        matrix.updateMatrix();
        blooms.setMatrixAt(i, matrix.matrix);
        color.setHSL(
          0.97 + rng() * 0.035,
          0.15 + rng() * 0.15,
          0.77 + rng() * 0.2,
        );
        blooms.setColorAt(i, color);
      });
      blooms.castShadow = true;
      blooms.receiveShadow = true;
      blooms.computeBoundingSphere();
      group.add(blooms);
    }
  }

  function bamboo(parent: T.Object3D, x: number, z: number) {
    const rng = random(Math.round((x + 5) * 1021 + (z + 6) * 713));
    const foliage = new T.InstancedMesh(leaf, leavesMaterial, 180),
      dummy = new T.Object3D();
    let index = 0;
    for (let i = 0; i < 6; i++) {
      const bx = x + (rng() - 0.5) * 0.45,
        bz = z + (rng() - 0.5) * 0.45,
        height = 1.15 + rng() * 0.8;
      const stalk = new T.Mesh(
        new T.CylinderGeometry(0.013, 0.021, height, 12),
        leavesMaterial,
      );
      stalk.position.set(bx, height / 2, bz);
      stalk.castShadow = true;
      parent.add(stalk);
      for (let node = 0; node < 5; node++) {
        const y = height * (0.22 + node * 0.16);
        const ring = new T.Mesh(
          new T.TorusGeometry(0.022, 0.003, 5, 12),
          leavesMaterial,
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(bx, y, bz);
        parent.add(ring);
        for (let j = 0; j < 6; j++) {
          const angle = j * 1.1 + i,
            distance = 0.06 + rng() * 0.15;
          dummy.position.set(
            bx + Math.sin(angle) * distance,
            y + rng() * 0.08,
            bz + Math.cos(angle) * distance,
          );
          dummy.rotation.set(0.1 + rng() * 0.6, angle, 0.2);
          dummy.scale.set(0.07, 0.1, 0.24);
          dummy.updateMatrix();
          foliage.setMatrixAt(index++, dummy.matrix);
        }
      }
    }
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    foliage.computeBoundingSphere();
    parent.add(foliage);
  }

  function grass(parent: T.Object3D) {
    const rng = random(7013),
      blades: T.Matrix4[] = [],
      dummy = new T.Object3D();
    for (let i = 0; i < 6200; i++) {
      const x = (rng() - 0.5) * 75,
        z = (rng() - 0.5) * 58 - 7;
      if (
        z > 13 ||
        (Math.abs(x) < 11.8 && z > -16 && z < 8) ||
        (Math.abs(x) < 20 && z > -20 && z < 14) ||
        (z > 10 && Math.abs(x) < 22)
      )
        continue;
      const ground = terrainHeight(x, z);
      if (ground < -0.15) continue;
      dummy.position.set(x, ground + 0.08, z);
      dummy.rotation.set(-Math.PI / 2 + rng() * 0.45, rng() * Math.PI * 2, 0);
      dummy.scale.set(0.08 + rng() * 0.06, 0.3, 0.22 + rng() * 0.38);
      dummy.updateMatrix();
      blades.push(dummy.matrix.clone());
    }
    const plants = new T.InstancedMesh(leaf, leavesMaterial, blades.length),
      color = new T.Color();
    blades.forEach((matrix, i) => {
      plants.setMatrixAt(i, matrix);
      color.setHSL(0.2 + rng() * 0.08, 0.25, 0.35 + rng() * 0.25);
      plants.setColorAt(i, color);
    });
    plants.receiveShadow = true;
    plants.computeBoundingSphere();
    parent.add(plants);
  }
  return { tree, bamboo, grass };
}
