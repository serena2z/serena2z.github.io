import { Mesh, InstancedMesh, Vector3, type Object3D } from 'three';
import { rooms, waypoints, type WaypointId } from './landscape-config';
import { terrainHeight } from './landscape-terrain';

export type GroundPoint = { x: number; z: number };
const radius = 0.23;
const bucketSize = 2;
const eyeHeight = 1.65;
type Polygon = GroundPoint[];
type Floor = { a: Vector3; b: Vector3; c: Vector3 };

function distanceToEdge(p: GroundPoint, a: GroundPoint, b: GroundPoint) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1),
    ),
  );
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
function touches(p: GroundPoint, polygon: Polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (distanceToEdge(p, a, b) < radius) return true;
    if (
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function clipAtHeight(points: Vector3[], height: number, above: boolean) {
  const result: Vector3[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[(i + 1) % points.length];
    const aInside = above ? a.y >= height : a.y <= height;
    const bInside = above ? b.y >= height : b.y <= height;
    if (aInside) result.push(a);
    if (aInside !== bInside)
      result.push(a.clone().lerp(b, (height - a.y) / (b.y - a.y)));
  }
  return result;
}
function localRoomPoint(p: GroundPoint, room: (typeof rooms)[number]) {
  const dx = p.x - room.position[0],
    dz = p.z - room.position[2];
  return {
    x: dx * Math.cos(room.rotation) - dz * Math.sin(room.rotation),
    z: dx * Math.sin(room.rotation) + dz * Math.cos(room.rotation),
  };
}

/** Location labels follow the walker; they never determine where the walker can go. */
export function landmarkAt(p: GroundPoint): WaypointId {
  for (const room of rooms) {
    const local = localRoomPoint(p, room);
    if (
      Math.abs(local.x) < room.width / 2 &&
      Math.abs(local.z) < room.depth / 2
    )
      return room.node;
    const entry = waypoints.find((w) => w.id === room.entry)!;
    if (Math.hypot(p.x - entry.position[0], p.z - entry.position[2]) < 1.8)
      return room.entry;
  }
  const outdoor = waypoints.filter(
    (w) => !w.room && !rooms.some((r) => r.entry === w.id),
  );
  return outdoor.reduce((best, w) =>
    Math.hypot(p.x - w.position[0], p.z - w.position[2]) <
    Math.hypot(p.x - best.position[0], p.z - best.position[2])
      ? w
      : best,
  ).id;
}

/** Camera-relative displacement, with equal speed when two directions are held. */
export function walkingOffset(
  yaw: number,
  forward: number,
  sideways: number,
  distance: number,
): GroundPoint {
  const scale = distance / Math.max(1, Math.hypot(forward, sideways));
  return {
    x: (Math.sin(yaw) * forward + Math.cos(yaw) * sideways) * scale,
    z: (-Math.cos(yaw) * forward + Math.sin(yaw) * sideways) * scale,
  };
}

/** Wheel input changes the viewing angle while the walker stays on the ground. */
export function scrollLook(
  pitch: number,
  yaw: number,
  deltaX: number,
  deltaY: number,
) {
  const clampDelta = (value: number) => Math.max(-160, Math.min(160, value));
  return {
    pitch: Math.max(-1.35, Math.min(1.48, pitch - clampDelta(deltaY) * 0.0025)),
    yaw: yaw + clampDelta(deltaX) * 0.0025,
  };
}

/** Index the rendered walls and furniture once, so walking does not raycast the world every frame. */
export function createWalkingSurface(world: Object3D) {
  const obstacles = new Map<string, Polygon[]>();
  const floors = new Map<string, Floor[]>();
  function bucket(p: GroundPoint) {
    return `${Math.floor(p.x / bucketSize)},${Math.floor(p.z / bucketSize)}`;
  }
  function insert<T>(
    map: Map<string, T[]>,
    item: T,
    points: GroundPoint[],
    padding: number,
  ) {
    const minX = Math.floor(
      (Math.min(...points.map((p) => p.x)) - padding) / bucketSize,
    );
    const maxX = Math.floor(
      (Math.max(...points.map((p) => p.x)) + padding) / bucketSize,
    );
    const minZ = Math.floor(
      (Math.min(...points.map((p) => p.z)) - padding) / bucketSize,
    );
    const maxZ = Math.floor(
      (Math.max(...points.map((p) => p.z)) + padding) / bucketSize,
    );
    for (let x = minX; x <= maxX; x++)
      for (let z = minZ; z <= maxZ; z++) {
        const key = `${x},${z}`,
          items = map.get(key);
        if (items) items.push(item);
        else map.set(key, [item]);
      }
  }
  world.updateMatrixWorld(true);
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3();
  world.traverse((object) => {
    // Foliage and water remain decorative. Solid architecture casts shadows.
    if (
      !(object instanceof Mesh) ||
      object instanceof InstancedMesh ||
      !object.castShadow
    )
      return;
    const positions = object.geometry.getAttribute('position'),
      indices = object.geometry.index;
    if (!positions) return;
    const count = indices?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      a.fromBufferAttribute(
        positions,
        indices ? indices.getX(i) : i,
      ).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(
        positions,
        indices ? indices.getX(i + 1) : i + 1,
      ).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(
        positions,
        indices ? indices.getX(i + 2) : i + 2,
      ).applyMatrix4(object.matrixWorld);
      const low = Math.min(a.y, b.y, c.y),
        high = Math.max(a.y, b.y, c.y);
      if (high >= 0 && high <= 0.6 && high - low < 0.12) {
        const area = (b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z);
        if (Math.abs(area) > 0.0001)
          insert(
            floors,
            { a: a.clone(), b: b.clone(), c: c.clone() },
            [a, b, c],
            0,
          );
      }
      if (high < 0.65 || low > 1.65) continue;
      const clipped = clipAtHeight(
        clipAtHeight([a, b, c], 0.65, true),
        1.65,
        false,
      );
      if (clipped.length >= 3)
        insert(
          obstacles,
          clipped.map((v) => ({ x: v.x, z: v.z })),
          clipped,
          radius,
        );
    }
  });
  function canStand(p: GroundPoint) {
    if (Math.hypot(p.x, p.z) > 250) return false;
    const bridge = Math.abs(p.x) <= 1.18 && p.z >= 7.6 && p.z <= 23.4;
    if (!bridge && terrainHeight(p.x, p.z) < -0.24) return false;
    if (Math.hypot(p.x, p.z + 2) < 2.25) return false;
    return !(obstacles.get(bucket(p)) ?? []).some((polygon) =>
      touches(p, polygon),
    );
  }
  function height(p: GroundPoint) {
    let ground = terrainHeight(p.x, p.z);
    for (const { a, b, c } of floors.get(bucket(p)) ?? []) {
      const den = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
      const u = ((b.z - c.z) * (p.x - c.x) + (c.x - b.x) * (p.z - c.z)) / den;
      const v = ((c.z - a.z) * (p.x - c.x) + (a.x - c.x) * (p.z - c.z)) / den;
      if (u >= -0.001 && v >= -0.001 && u + v <= 1.001)
        ground = Math.max(ground, u * a.y + v * b.y + (1 - u - v) * c.y);
    }
    return ground + eyeHeight;
  }
  function move(from: GroundPoint, offset: GroundPoint) {
    const p = { x: from.x, z: from.z };
    // Substeps prevent a long frame or a fast input from tunneling through a wall.
    const steps = Math.max(1, Math.ceil(Math.hypot(offset.x, offset.z) / 0.1));
    const dx = offset.x / steps,
      dz = offset.z / steps;
    for (let i = 0; i < steps; i++) {
      if (canStand({ x: p.x + dx, z: p.z + dz })) {
        p.x += dx;
        p.z += dz;
      } else {
        // Slide along walls instead of stopping all movement at a glancing angle.
        if (canStand({ x: p.x + dx, z: p.z })) p.x += dx;
        if (canStand({ x: p.x, z: p.z + dz })) p.z += dz;
      }
    }
    return p;
  }
  function clearLine(from: GroundPoint, to: GroundPoint) {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.12),
    );
    for (let i = 1; i <= steps; i++)
      if (
        !canStand({
          x: from.x + ((to.x - from.x) * i) / steps,
          z: from.z + ((to.z - from.z) * i) / steps,
        })
      )
        return false;
    return true;
  }
  /** Shortcuts find a walkable route from the actual position, even off the original paths. */
  function route(from: GroundPoint, to: GroundPoint): GroundPoint[] {
    if (clearLine(from, to)) return [to];
    const spacing = 0.5;
    type Node = GroundPoint & {
      cost: number;
      score: number;
      parent: Node | null;
    };
    const open: Node[] = [];
    function push(node: Node) {
      open.push(node);
      let i = open.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (open[parent].score <= node.score) break;
        open[i] = open[parent];
        i = parent;
      }
      open[i] = node;
    }
    function pop() {
      const first = open[0],
        last = open.pop()!;
      if (open.length) {
        let i = 0;
        while (i * 2 + 1 < open.length) {
          let child = i * 2 + 1;
          if (
            child + 1 < open.length &&
            open[child + 1].score < open[child].score
          )
            child++;
          if (open[child].score >= last.score) break;
          open[i] = open[child];
          i = child;
        }
        open[i] = last;
      }
      return first;
    }
    const visited = new Map<string, number>();
    const start = { x: from.x, z: from.z, cost: 0, score: 0, parent: null };
    push(start);
    visited.set('0,0', 0);
    const minX = Math.min(from.x, to.x) - 15,
      maxX = Math.max(from.x, to.x) + 15;
    const minZ = Math.min(from.z, to.z) - 15,
      maxZ = Math.max(from.z, to.z) + 15;
    for (let count = 0; open.length && count < 30000; count++) {
      const node = pop();
      if (Math.hypot(node.x - to.x, node.z - to.z) < 1 && clearLine(node, to)) {
        const path: GroundPoint[] = [to];
        let cursor: Node | null = node;
        while (cursor?.parent) {
          path.push({ x: cursor.x, z: cursor.z });
          cursor = cursor.parent;
        }
        path.reverse();
        const simplified: GroundPoint[] = [];
        let anchor = from;
        for (let i = 0; i < path.length;) {
          let far = path.length - 1;
          while (far > i && !clearLine(anchor, path[far])) far--;
          anchor = path[far];
          simplified.push(anchor);
          i = far + 1;
        }
        return simplified;
      }
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const x = node.x + dx * spacing,
            z = node.z + dz * spacing;
          if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
          const cost = node.cost + Math.hypot(dx, dz) * spacing;
          const key = `${Math.round((x - from.x) / spacing)},${Math.round((z - from.z) / spacing)}`;
          if (
            (visited.get(key) ?? Infinity) <= cost ||
            !clearLine(node, { x, z })
          )
            continue;
          visited.set(key, cost);
          push({
            x,
            z,
            cost,
            score: cost + Math.hypot(x - to.x, z - to.z),
            parent: node,
          });
        }
    }
    return [];
  }
  return { canStand, height, move, route, clearLine };
}
