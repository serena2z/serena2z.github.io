import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
} from 'three';
import {
  createWalkingSurface,
  landmarkAt,
  walkingOffset,
  scrollLook,
} from '../lib/landscape-navigation';
import { rooms } from '../lib/landscape-config';

function wall(
  world: Group,
  x: number,
  z: number,
  width: number,
  depth: number,
  height = 3,
) {
  const mesh = new Mesh(
    new BoxGeometry(width, height, depth),
    new MeshStandardMaterial(),
  );
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true;
  world.add(mesh);
  return mesh;
}

await test('forward/backward/sideways follow the camera, without rotating it', () => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.63]) {
    const camera = new PerspectiveCamera();
    camera.lookAt(Math.sin(yaw), 0.25, -Math.cos(yaw));
    const quaternion = camera.quaternion.clone();
    const forward = walkingOffset(yaw, 1, 0, 3);
    const backward = walkingOffset(yaw, -1, 0, 3);
    const sideways = walkingOffset(yaw, 0, 1, 3);
    assert.ok(Math.abs(forward.x + backward.x) < 1e-10);
    assert.ok(Math.abs(forward.z + backward.z) < 1e-10);
    assert.ok(
      Math.abs(forward.x * sideways.x + forward.z * sideways.z) < 1e-10,
    );
    camera.position.x += forward.x;
    camera.position.z += forward.z;
    assert.ok(camera.quaternion.equals(quaternion));
    assert.ok(
      Math.abs(Math.hypot(...Object.values(walkingOffset(yaw, 1, 1, 3))) - 3) <
        1e-10,
    );
  }
});

await test('walking reaches arbitrary garden positions and is independent of frame rate', () => {
  const surface = createWalkingSurface(new Group());
  const walk = (fps: number) => {
    let p = { x: -4, z: -8 };
    for (let i = 0; i < fps; i++)
      p = surface.move(p, walkingOffset(0.31, 1, 1, 3.2 / fps));
    return p;
  };
  const a = walk(20),
    b = walk(60);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-8);
  assert.ok(Math.hypot(a.x + 4, a.z + 8) > 3.19);
});

await test('walls stop large movements and allow sliding; door gaps remain walkable', () => {
  const world = new Group();
  wall(world, -5, -10, 0.2, 8);
  wall(world, 3, -10, 3, 0.2);
  wall(world, -1, -10, 3, 0.2);
  const surface = createWalkingSurface(world);
  const stopped = surface.move({ x: -7, z: -8 }, { x: 4, z: -2 });
  assert.ok(stopped.x < -5.32);
  assert.ok(stopped.z < -9.9);
  assert.ok(surface.clearLine({ x: 1, z: -8 }, { x: 1, z: -12 }));
  assert.ok(!surface.clearLine({ x: 3, z: -8 }, { x: 3, z: -12 }));
});

await test('shortcuts find a collision-free route from an arbitrary position around a wall', () => {
  const world = new Group();
  wall(world, -5, -10, 0.2, 5);
  const surface = createWalkingSurface(world);
  const start = { x: -7.13, z: -10.17 },
    end = { x: -3.37, z: -10.11 };
  const route = surface.route(start, end);
  assert.ok(route.length > 1);
  let previous = start;
  for (const point of route) {
    assert.ok(surface.clearLine(previous, point));
    previous = point;
  }
  assert.deepEqual(previous, end);
});

await test('lake and pond are blocked while the entrance bridge stays accessible', () => {
  const surface = createWalkingSurface(new Group());
  assert.equal(surface.canStand({ x: 0, z: -2 }), false);
  assert.equal(surface.canStand({ x: 4, z: 20 }), false);
  assert.equal(surface.canStand({ x: 0, z: 20 }), true);
  assert.equal(surface.canStand({ x: -5, z: 0 }), true);
});

await test('ground height follows the modeled floor and ignores overhead roofs', () => {
  const world = new Group();
  const floor = wall(world, -4, -8, 3, 3, 0.2);
  floor.position.y = 0.2;
  const roof = wall(world, -4, -8, 5, 5, 0.3);
  roof.position.y = 4;
  const surface = createWalkingSurface(world);
  assert.equal(surface.canStand({ x: -4, z: -8 }), true);
  assert.ok(Math.abs(surface.height({ x: -4, z: -8 }) - 1.95) < 1e-6);
});

await test('entering each rotated room updates its collection; walking outside does not leave stale room state', () => {
  for (const room of rooms) {
    assert.equal(
      landmarkAt({ x: room.position[0] + 0.37, z: room.position[2] - 0.21 }),
      room.node,
    );
  }
  assert.ok(!rooms.some((room) => room.node === landmarkAt({ x: -24, z: 0 })));
});

await test('scrolling tilts the view up and down and stays within a natural viewing range', () => {
  const up = scrollLook(0, 0.7, 0, -100);
  assert.ok(up.pitch > 0);
  assert.equal(up.yaw, 0.7);
  const down = scrollLook(up.pitch, up.yaw, 0, 100);
  assert.equal(down.pitch, 0);
  let pitch = 0;
  for (let i = 0; i < 100; i++) pitch = scrollLook(pitch, 0, 0, -1000).pitch;
  assert.equal(pitch, 1.48);
  for (let i = 0; i < 100; i++) pitch = scrollLook(pitch, 0, 0, 1000).pitch;
  assert.equal(pitch, -1.35);
  assert.ok(scrollLook(0, 0, 100, 0).yaw > 0);
});
