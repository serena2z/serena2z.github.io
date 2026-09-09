import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { createDriftingPetals } from '../lib/landscape-petals';
import { createWalkingSurface } from '../lib/landscape-navigation';

await test('drifting petals never leave an invisible barrier across the entrance bridge', () => {
  const world = new T.Group();
  const petals = createDriftingPetals();
  world.add(petals.mesh);
  // A decorative petal at the old entrance-blocker position is still never solid.
  petals.mesh.setMatrixAt(0, new T.Matrix4().makeTranslation(0, 1, 19));
  const surface = createWalkingSurface(world);
  const from = { x: 0, z: 20 };
  const stepped = surface.move(from, { x: 0, z: -0.8 });
  assert.ok(Math.abs(stepped.z - 19.2) < 1e-9);
  assert.equal(stepped.x, 0);
  assert.ok(surface.clearLine(from, { x: 0, z: 12 }));
  petals.update(2);
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

await test('petals follow the same wind at any frame rate and stay inside their culling bounds', () => {
  const a = createDriftingPetals(),
    b = createDriftingPetals();
  for (let i = 0; i <= 60; i++) a.update(i / 30);
  for (let i = 0; i <= 120; i++) b.update(i / 60);
  assert.deepEqual(a.mesh.instanceMatrix.array, b.mesh.instanceMatrix.array);
  const matrix = new T.Matrix4(),
    position = new T.Vector3();
  for (let time = 0; time <= 180; time += 0.5) {
    a.update(time);
    for (let i = 0; i < a.mesh.count; i++) {
      a.mesh.getMatrixAt(i, matrix);
      position.setFromMatrixPosition(matrix);
      assert.ok(a.mesh.boundingSphere!.containsPoint(position));
    }
  }
  for (const petals of [a, b]) {
    petals.mesh.geometry.dispose();
    petals.mesh.material.dispose();
    petals.mesh.dispose();
  }
});

await test('recycled petals shrink out before wrapping to the top of the breeze', () => {
  const petals = createDriftingPetals(),
    matrix = new T.Matrix4();
  const previous = Array.from({ length: petals.mesh.count }, () => ({
    y: 0,
    size: 0,
  }));
  let wraps = 0;
  for (let t = 0; t <= 40; t += 0.05) {
    petals.update(t);
    for (let i = 0; i < petals.mesh.count; i++) {
      petals.mesh.getMatrixAt(i, matrix);
      const y = matrix.elements[13],
        size = new T.Vector3().setFromMatrixScale(matrix).length();
      if (t > 0 && y - previous[i].y > 4) {
        assert.ok(size < 0.002 && previous[i].size < 0.002);
        wraps++;
      }
      previous[i] = { y, size };
    }
  }
  assert.ok(wraps >= petals.mesh.count);
});
