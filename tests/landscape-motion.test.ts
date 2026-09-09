import assert from 'node:assert/strict';
import test from 'node:test';
import { Group } from 'three';
import { FrameClock, motionBlend, WALK_SPEED } from '../lib/landscape-motion';
import {
  createWalkingSurface,
  walkingOffset,
} from '../lib/landscape-navigation';

await test('active and idle frames hold their cadence on 60 and 120 Hz displays', () => {
  for (const refresh of [60, 120])
    for (const fps of [30, 60]) {
      const clock = new FrameClock(),
        frames: number[] = [];
      for (let i = 0; i < refresh * 2; i++) {
        const now = (i * 1000) / refresh;
        if (clock.tick(now, fps)) frames.push(now);
      }
      assert.equal(frames.length, fps * 2);
      for (let i = 1; i < frames.length; i++)
        assert.ok(Math.abs(frames[i] - frames[i - 1] - 1000 / fps) < 0.001);
    }
});

await test('changing cadence, loading stalls, and hidden tabs never trigger catch-up movement', () => {
  const clock = new FrameClock();
  clock.tick(0, 30);
  assert.equal(clock.tick(16, 30), null);
  assert.ok(clock.tick(17, 60));
  assert.equal(clock.tick(18, 60), null);
  assert.equal(clock.tick(5000, 60)!.dt, 0.1);
  assert.equal(clock.tick(5001, 60), null);
  clock.reset(60000);
  assert.ok(clock.tick(60016, 60)!.dt <= 0.016);
});

await test('zoom and floor easing settle at the same rate across display speeds', () => {
  for (const rate of [6, 7, 9, 12]) {
    const values = [30, 60, 120].map((fps) => {
      let value = 0;
      for (let i = 0; i < fps; i++)
        value += (1 - value) * motionBlend(rate, 1 / fps);
      return value;
    });
    assert.ok(Math.abs(values[0] - values[2]) < 1e-12);
    assert.ok(Math.abs(values[0] - (1 - Math.exp(-rate))) < 1e-12);
  }
});

await test('faster walking covers six units each second at both supported frame rates', () => {
  const surface = createWalkingSurface(new Group());
  for (const fps of [30, 60]) {
    let position = { x: 0, z: 20 };
    for (let i = 0; i < fps; i++)
      position = surface.move(
        position,
        walkingOffset(0, 1, 0, WALK_SPEED / fps),
      );
    assert.ok(Math.abs(position.z - 14) < 1e-9);
  }
});
