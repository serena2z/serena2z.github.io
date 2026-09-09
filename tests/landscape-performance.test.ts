import assert from 'node:assert/strict';
import test from 'node:test';
import {
  Box3,
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { batchStaticMeshes } from '../lib/landscape-batching';
import { RenderBudget, renderPixelRatio } from '../lib/landscape-render-budget';

await test('batching preserves indexed vertices and world-space placement under transformed parents', () => {
  const parent = new Group(),
    root = new Group();
  parent.position.set(15, 2, -8);
  parent.rotation.y = 0.72;
  root.position.set(2, 0.5, 1);
  parent.add(root);
  const material = new MeshStandardMaterial();
  for (const x of [-1, 1]) {
    const mesh = new Mesh(new BoxGeometry(), material);
    mesh.position.x = x;
    mesh.castShadow = true;
    root.add(mesh);
  }
  parent.updateMatrixWorld(true);
  const before = new Box3().setFromObject(root);
  batchStaticMeshes(root);
  const meshes = root.children.filter((o) => o instanceof Mesh);
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].geometry.getAttribute('position').count, 48);
  assert.equal(meshes[0].geometry.index?.count, 72);
  assert.equal(meshes[0].castShadow, true);
  const after = new Box3().setFromObject(root);
  assert.ok(before.min.distanceTo(after.min) < 1e-6);
  assert.ok(before.max.distanceTo(after.max) < 1e-6);
});

await test('moving collection objects and instanced flowers remain independent after batching', () => {
  const root = new Group(),
    moving = new Group();
  const material = new MeshStandardMaterial();
  const book = new Mesh(new BoxGeometry(), material);
  moving.add(book);
  root.add(moving);
  const flowers = new InstancedMesh(new BoxGeometry(), material, 2);
  flowers.setMatrixAt(1, new Matrix4().makeTranslation(4, 0, 0));
  root.add(flowers);
  batchStaticMeshes(root, new Set([moving]));
  assert.ok(root.children.includes(flowers));
  assert.equal(flowers.count, 2);
  assert.equal(book.parent, moving);
  moving.position.x = 3;
  root.updateMatrixWorld(true);
  assert.equal(book.getWorldPosition(new Vector3()).x, 3);
});

await test('static batches stay separated across distant rooms for frustum culling', () => {
  const root = new Group(),
    material = new MeshStandardMaterial();
  for (const x of [-20, 20]) {
    const mesh = new Mesh(new BoxGeometry(), material);
    mesh.position.x = x;
    root.add(mesh);
  }
  batchStaticMeshes(root);
  assert.equal(root.children.length, 2);
  for (const child of root.children) {
    assert.ok(child instanceof Mesh);
    child.geometry.computeBoundingSphere();
    assert.ok(child.geometry.boundingSphere!.radius < 1);
  }
});

await test('render buffers respect the pixel budget on Retina and 4K displays', () => {
  for (const [width, height, device] of [
    [1280, 800, 2],
    [1920, 1080, 1],
    [3840, 2160, 2],
    [390, 844, 3],
  ]) {
    const ratio = renderPixelRatio(width, height, device);
    assert.ok(ratio > 0 && ratio <= device && ratio <= 1.5);
    assert.ok(width * height * ratio * ratio <= 2_500_001);
  }
});

await test('quality only falls after sustained slow frames, with a fixed lower limit', () => {
  const healthy = new RenderBudget();
  for (let i = 0; i < 120; i++) healthy.observe(i === 4 ? 500 : 33.3);
  assert.equal(healthy.scale, 1);
  const slow = new RenderBudget();
  for (let i = 0; i < 59; i++) assert.equal(slow.observe(65), false);
  assert.equal(slow.observe(65), true);
  assert.equal(slow.scale, 0.85);
  for (let i = 0; i < 600; i++) slow.observe(65);
  assert.equal(slow.scale, 0.7);
});
