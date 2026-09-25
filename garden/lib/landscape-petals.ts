import * as T from 'three';

/** Curled petals, concentrated beside paths, share one draw and never block walking. */
export function createDriftingPetals() {
  const positions: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= 5; row++) {
    const t = row / 5;
    for (let col = 0; col <= 3; col++) {
      const u = col / 1.5 - 1;
      positions.push(
        u * Math.sin(Math.PI * t) * 0.36,
        0.18 * t * t + 0.12 * u * u,
        t - 0.5,
      );
    }
  }
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 3; col++) {
      const a = row * 4 + col;
      indices.push(a, a + 4, a + 1, a + 1, a + 4, a + 5);
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.82,
    side: T.DoubleSide,
  });
  const count = 144;
  const mesh = new T.InstancedMesh(geometry, material, count);
  mesh.name = 'Drifting blossom petals';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.excludeFromContactShadows = true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.boundingSphere = new T.Sphere(new T.Vector3(0, 2.8, 6), 23);
  const seed = (i: number) =>
    T.MathUtils.euclideanModulo(Math.sin(i * 127.1 + 311.7) * 43758.5453, 1);
  const blossoms = Array.from({ length: count }, (_, i) => {
    const lane = i % 3;
    mesh.setColorAt(i, new T.Color(['#f6c4d2', '#fff0df', '#eaa4bb'][i % 3]));
    return {
      x:
        lane === 2
          ? (seed(i + 1) - 0.5) * 1.6
          : (lane === 0 ? -1 : 1) * (4.5 + seed(i + 1) * 3.2),
      z: lane === 2 ? 8 + seed(i + 2) * 12 : -8.5 + seed(i + 2) * 20,
      phase: seed(i + 3),
      duration: 24 + seed(i + 4) * 14,
      size: 0.075 + seed(i + 5) * 0.04,
    };
  });
  const transform = new T.Object3D();
  function update(time: number) {
    for (let i = 0; i < count; i++) {
      const blossom = blossoms[i];
      const cycle = T.MathUtils.euclideanModulo(
        time / blossom.duration + blossom.phase,
        1,
      );
      const phase = blossom.phase * Math.PI * 2;
      // Taper to nothing at both ends of a fall, so recycling never visibly pops.
      const appear =
        T.MathUtils.smoothstep(cycle, 0, 0.07) *
        (1 - T.MathUtils.smoothstep(cycle, 0.9, 1));
      transform.position.set(
        blossom.x + Math.sin(time * 0.35 + phase) * 0.55,
        0.25 + (1 - cycle) * 4.8,
        blossom.z + Math.cos(time * 0.27 + phase) * 0.35,
      );
      transform.rotation.set(
        Math.sin(time * 0.7 + phase) * 0.8,
        phase + time * (0.25 + blossom.phase * 0.2),
        Math.cos(time * 0.5 + phase) * 0.65,
      );
      transform.scale.setScalar(blossom.size * appear);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { mesh, update };
}
