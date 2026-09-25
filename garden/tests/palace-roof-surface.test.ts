import assert from 'node:assert/strict';
import test from 'node:test';
import { Vector3 } from 'three';
import { createRoofPanel, roofPoint } from '../lib/palace-roof-surface';
import { rooms } from '../lib/landscape-config';

const roofs = [
  ...rooms.map((room) => [room.width + 2.25, room.depth + 2.25, 1.55]),
  [8.8, 6.5, 1.45],
  [6.1, 2.3, 1.1],
  [3.5, 10, 0.9],
];

await test('every roof triangle faces outward and has nonzero area, including the ridge ends', () => {
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    normal = new Vector3();
  for (const [width, depth, height] of roofs) {
    for (let side = 0; side < 4; side++) {
      const geometry = createRoofPanel(side, width, depth, height);
      const positions = geometry.getAttribute('position'),
        indices = geometry.index!;
      try {
        for (let i = 0; i < indices.count; i += 3) {
          a.fromBufferAttribute(positions, indices.getX(i));
          b.fromBufferAttribute(positions, indices.getX(i + 1));
          c.fromBufferAttribute(positions, indices.getX(i + 2));
          normal.crossVectors(b.sub(a), c.sub(a));
          assert.ok(
            normal.lengthSq() > 1e-14,
            `degenerate triangle on roof ${width}×${depth}, side ${side}`,
          );
          assert.ok(
            normal.y > 0,
            `inward-facing roof ${width}×${depth}, side ${side}`,
          );
        }
      } finally {
        geometry.dispose();
      }
    }
  }
});

await test('all roof panels share a smooth ridge and meet exactly along their hips', () => {
  for (const [width, depth, height] of roofs) {
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i <= 30; i++) {
        const t = i / 30;
        const a = roofPoint(side, t, 1, width, depth, height);
        const b = roofPoint((side + 1) % 4, t, -1, width, depth, height);
        assert.ok(a.distanceTo(b) < 1e-10);
        assert.equal(
          roofPoint(side, 0, i / 15 - 1, width, depth, height).y,
          height,
        );
      }
    }
  }
});
