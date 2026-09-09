import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { createDriftingPetals } from '../lib/landscape-petals';
import { createWalkingSurface } from '../lib/landscape-navigation';

await test('drifting petals never leave an invisible barrier across the entrance bridge', () => {
  const world = new T.Group();
  const petals = createDriftingPetals(new T.MeshStandardMaterial());
  world.add(petals.mesh);
  // The first blossom starts directly in front of the arrival viewpoint.
  const matrix = new T.Matrix4();
  petals.mesh.getMatrixAt(0, matrix);
  assert.deepEqual(
    new T.Vector3().setFromMatrixPosition(matrix).toArray(),
    [0, 1, 19],
  );
  const surface = createWalkingSurface(world);
  const from = { x: 0, z: 20 };
  const stepped = surface.move(from, { x: 0, z: -0.8 });
  assert.ok(Math.abs(stepped.z - 19.2) < 1e-9);
  assert.equal(stepped.x, 0);
  assert.ok(surface.clearLine(from, { x: 0, z: 12 }));
  petals.update(2, 2);
  assert.ok(surface.clearLine(from, { x: 0, z: 12 }));
  assert.equal(petals.mesh.castShadow, false);

  const wall = new T.Mesh(
    new T.BoxGeometry(3.2, 3, 0.2),
    new T.MeshStandardMaterial(),
  );
  wall.position.set(0, 1.5, 17);
  wall.castShadow = true;
  world.add(wall);
  assert.equal(
    createWalkingSurface(world).clearLine(from, { x: 0, z: 12 }),
    false,
  );
});
