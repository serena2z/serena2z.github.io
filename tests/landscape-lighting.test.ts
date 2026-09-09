import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { createDaylight } from '../lib/landscape-daylight';
import { createLanterns } from '../lib/landscape-lanterns';
import { createPalaceArchitecture } from '../lib/palace-architecture';
import { batchStaticMeshes } from '../lib/landscape-batching';
import { rooms } from '../lib/landscape-config';

await test('painted ceilings stay separate from their wooden backing after batching', () => {
  for (const room of rooms) {
    const parent = new T.Group();
    const palette = (color: string) => new T.MeshStandardMaterial({ color });
    const palace = createPalaceArchitecture(palette, new T.Texture());
    palace.ceiling(parent, room.width, room.depth, new T.Texture());
    batchStaticMeshes(parent);
    parent.updateMatrixWorld(true);
    for (const [x, z] of [
      [0, 0],
      [1, -1],
      [-1, 1],
    ]) {
      const ray = new T.Raycaster(
        new T.Vector3(x, 2, z),
        new T.Vector3(0, 1, 0),
      );
      const hits = ray.intersectObject(parent, true);
      const surfaces = [
        ...new Set(hits.map((hit) => Math.round(hit.point.y * 1000) / 1000)),
      ].sort((a, b) => a - b);
      assert.equal(surfaces[0], 4.05);
      assert.ok(
        surfaces[1] - surfaces[0] >= 0.03,
        'ceiling and backing must not share a depth',
      );
    }
  }
});

await test('day and night reuse the same lights and restore the original daylight', () => {
  const scene = new T.Scene();
  scene.fog = new T.FogExp2('#c7e8f1', 0.0028);
  const sky = new Sky();
  const sun = new T.DirectionalLight('#fff4dd', 3.8);
  const hemisphere = new T.HemisphereLight('#d9efff', '#8e956a', 1.05);
  const fill = new T.DirectionalLight('#e3f2ff', 0.55);
  scene.add(sky, sun, hemisphere, fill);
  const daylight = createDaylight(scene, sky.material, sun, hemisphere, fill);
  daylight.setNight(1);
  assert.equal(sky.material.uniforms.nightMix.value, 1);
  assert.ok(sun.intensity > 0 && sun.intensity < 1);
  assert.ok(scene.environmentIntensity > 0 && scene.environmentIntensity < 0.3);
  assert.equal(scene.children.filter((o) => o instanceof T.Light).length, 3);
  daylight.setNight(0.5);
  assert.ok(sun.intensity > 0.55 && sun.intensity < 3.8);
  daylight.setNight(0);
  assert.equal(sun.intensity, 3.8);
  assert.equal(hemisphere.intensity, 1.05);
  assert.equal(scene.environmentIntensity, 0.9);
  assert.ok(scene.fog.color.equals(new T.Color('#c7e8f1')));
});

await test('lantern silk and halo illuminate at night without adding point lights', () => {
  const factory = createLanterns(),
    world = new T.Group();
  const small = factory.add(world, 0, 3, 0, 0.17);
  factory.add(world, 4, 3, 0, 0.31);
  const silk = small.children.find(
    (child): child is T.Mesh<T.BufferGeometry, T.MeshStandardMaterial> =>
      child instanceof T.Mesh &&
      child.material instanceof T.MeshStandardMaterial &&
      child.material.emissiveIntensity === 0.08,
  )!;
  const glow = small.children.find(
    (child): child is T.Sprite => child instanceof T.Sprite,
  )!;
  assert.ok(silk);
  for (const group of factory.groups) batchStaticMeshes(group);
  factory.setNight(1);
  assert.equal(silk.material.emissiveIntensity, 2.8);
  assert.ok(glow.material.opacity > 0.5);
  assert.equal(glow.visible, true);
  let lights = 0;
  world.traverse((o) => {
    if (o instanceof T.Light) lights++;
  });
  assert.equal(lights, 0);
  factory.setNight(0);
  assert.equal(silk.material.emissiveIntensity, 0.08);
  assert.equal(glow.material.opacity, 0);
  assert.equal(glow.visible, false);
  assert.equal(small.scale.x, 0.17);
  factory.dispose();
});
