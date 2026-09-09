import * as T from 'three';

/** Drifting blossoms share one draw and stay out of the solid walking geometry. */
export function createDriftingPetals(material: T.Material) {
  const count = 65;
  const mesh = new T.InstancedMesh(
    new T.SphereGeometry(0.022, 8, 5),
    material,
    count,
  );
  mesh.name = 'Drifting blossom petals';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.boundingSphere = new T.Sphere(new T.Vector3(0, 3, 3), 31);
  const positions = new Float32Array(count * 3);
  const transform = new T.Object3D();
  transform.scale.set(1.2, 0.3, 1);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = Math.sin(i * 2.4) * 24;
    positions[i * 3 + 1] = 1 + (i % 10) * 0.55;
    positions[i * 3 + 2] = 3 + Math.cos(i * 2.1) * 16;
  }
  function update(dt: number, time: number) {
    transform.rotation.y = time * 0.3;
    for (let i = 0; i < count; i++) {
      positions[i * 3] += Math.sin(time * 0.4 + i) * dt * 0.08;
      positions[i * 3 + 1] -= dt * 0.1;
      if (positions[i * 3 + 1] < 0.3) positions[i * 3 + 1] = 6;
      transform.position.fromArray(positions, i * 3);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, 0);
  return { mesh, update };
}
