export type RoomId =
  | 'work'
  | 'writing'
  | 'research'
  | 'creative'
  | 'inspiration';
export type Point = readonly [number, number, number];
export const rooms = [
  {
    id: 'work',
    name: 'The workroom',
    subject: 'Work & code',
    subtitle: 'Engineering, experiments, and things built with care.',
    position: [-14, 0, -5],
    rotation: Math.PI / 2,
    width: 8,
    depth: 9,
    entry: 'work_door',
    node: 'work',
    object: [-15.85, 1.45, -5],
    objectName: 'Work portfolio',
    action: 'Open the portfolio',
    accent: '#b29255',
    number: '01',
  },
  {
    id: 'writing',
    name: 'The writing pavilion',
    subject: 'Writing',
    subtitle: 'Essays, observations, and notes in the margins.',
    position: [-14, 0, 8],
    rotation: Math.PI,
    width: 8,
    depth: 7,
    entry: 'writing_door',
    node: 'writing',
    object: [-14, 1.45, 9.6],
    objectName: 'Writing scroll',
    action: 'Unroll the writing',
    accent: '#9d6560',
    number: '02',
  },
  {
    id: 'research',
    name: 'The library',
    subject: 'Research',
    subtitle: 'Papers read closely and questions followed.',
    position: [0, 0, -14],
    rotation: 0,
    width: 12,
    depth: 9,
    entry: 'library_door',
    node: 'research',
    object: [0, 1.45, -15.85],
    objectName: 'Research volume',
    action: 'Open the research volume',
    accent: '#698471',
    number: '03',
  },
  {
    id: 'creative',
    name: 'The gallery',
    subject: 'Creative work',
    subtitle: 'Photographs, drawings, and moving images.',
    position: [14, 0, -5],
    rotation: -Math.PI / 2,
    width: 9,
    depth: 9,
    entry: 'gallery_door',
    node: 'creative',
    object: [15.85, 1.45, -5],
    objectName: 'Photo album',
    action: 'Open the photo album',
    accent: '#a77c88',
    number: '04',
  },
  {
    id: 'inspiration',
    name: 'The tea house',
    subject: 'From others',
    subtitle: 'Things worth sharing, over a cup of tea.',
    position: [14, 0, 9],
    rotation: Math.PI,
    width: 8,
    depth: 7,
    entry: 'tea_door',
    node: 'inspiration',
    object: [14, 1.21, 10.6],
    objectName: 'Book of discoveries',
    action: 'Browse the discoveries',
    accent: '#699096',
    number: '05',
  },
] as const;
export type Room = (typeof rooms)[number];
export type WaypointId =
  | 'arrival'
  | 'bridge'
  | 'courtyard'
  | 'west_path'
  | 'east_path'
  | 'east_walk'
  | 'work_door'
  | 'gallery_door'
  | 'library_door'
  | 'writing_door'
  | 'tea_door'
  | RoomId;
export type Waypoint = {
  id: WaypointId;
  name: string;
  position: Point;
  lookAt: Point;
  neighbors: readonly WaypointId[];
  room?: RoomId;
};
export const waypoints: readonly Waypoint[] = [
  {
    id: 'arrival',
    name: 'The arrival bridge',
    position: [0, 2.02, 20],
    lookAt: [0, 3, -10],
    neighbors: ['bridge'],
  },
  {
    id: 'bridge',
    name: 'Over the water',
    position: [0, 2.18, 12],
    lookAt: [0, 2.8, -10],
    neighbors: ['arrival', 'courtyard'],
  },
  {
    id: 'courtyard',
    name: 'Lotus courtyard',
    position: [0, 1.85, 4],
    lookAt: [0, 3, -14],
    neighbors: ['bridge', 'west_path', 'east_path', 'east_walk'],
  },
  {
    id: 'west_path',
    name: 'The west garden',
    position: [-7, 1.85, 3],
    lookAt: [-14, 2, -5],
    neighbors: ['courtyard', 'work_door', 'writing_door'],
  },
  {
    id: 'east_path',
    name: 'The blossom path',
    position: [7, 1.85, 3],
    lookAt: [14, 2, -5],
    neighbors: ['courtyard', 'gallery_door', 'tea_door'],
  },
  {
    id: 'east_walk',
    name: 'The covered walk',
    position: [6, 1.85, -4],
    lookAt: [0, 2, -8.85],
    neighbors: ['courtyard', 'library_door'],
  },
  {
    id: 'work_door',
    name: 'Enter the workroom',
    position: [-8.9, 1.85, -5],
    lookAt: [-16.5, 1.75, -5],
    neighbors: ['west_path', 'work'],
    room: undefined,
  },
  {
    id: 'work',
    name: 'The workroom',
    position: [-14, 1.85, -5],
    lookAt: [-15.85, 1.45, -5],
    neighbors: ['work_door'],
    room: 'work',
  },
  {
    id: 'gallery_door',
    name: 'Enter the gallery',
    position: [8.9, 1.85, -5],
    lookAt: [16.5, 1.85, -5],
    neighbors: ['east_path', 'creative'],
  },
  {
    id: 'creative',
    name: 'The gallery',
    position: [14, 1.85, -5],
    lookAt: [15.85, 1.45, -5],
    neighbors: ['gallery_door'],
    room: 'creative',
  },
  {
    id: 'library_door',
    name: 'Enter the library',
    position: [0, 1.85, -8.85],
    lookAt: [0, 2, -16],
    neighbors: ['east_walk', 'research'],
  },
  {
    id: 'research',
    name: 'The library',
    position: [0, 1.85, -14],
    lookAt: [0, 1.45, -15.85],
    neighbors: ['library_door'],
    room: 'research',
  },
  {
    id: 'writing_door',
    name: 'Enter the writing pavilion',
    position: [-14, 1.85, 3.7],
    lookAt: [-14, 2, 10],
    neighbors: ['west_path', 'writing'],
  },
  {
    id: 'writing',
    name: 'The writing pavilion',
    position: [-14, 1.85, 8],
    lookAt: [-14, 1.45, 9.6],
    neighbors: ['writing_door'],
    room: 'writing',
  },
  {
    id: 'tea_door',
    name: 'Enter the tea house',
    position: [14, 1.85, 4.7],
    lookAt: [14, 2, 11],
    neighbors: ['east_path', 'inspiration'],
  },
  {
    id: 'inspiration',
    name: 'The tea house',
    position: [14, 1.85, 9],
    lookAt: [14, 1.21, 10.6],
    neighbors: ['tea_door'],
    room: 'inspiration',
  },
];
export function getWaypoint(id: WaypointId) {
  return waypoints.find((p) => p.id === id)!;
}
export function findRoom(id: string | null | undefined) {
  return rooms.find((r) => r.id === id);
}
export function findWaypoint(id: string | null | undefined) {
  return waypoints.find((p) => p.id === id);
}
export function routeBetween(from: WaypointId, to: WaypointId): WaypointId[] {
  if (from === to) return [];
  const queue: WaypointId[][] = [[from]],
    seen = new Set<WaypointId>([from]);
  while (queue.length) {
    const path = queue.shift()!;
    for (const next of getWaypoint(path[path.length - 1]).neighbors) {
      if (seen.has(next)) continue;
      const route = [...path, next];
      if (next === to) return route.slice(1);
      seen.add(next);
      queue.push(route);
    }
  }
  return [];
}
/** The room a visitor is inside of, or standing at the doorway of. */
export function roomAt(id: WaypointId | null | undefined) {
  if (!id) return undefined;
  const point = findWaypoint(id);
  if (!point) return undefined;
  return rooms.find((r) => r.node === id || r.entry === id);
}
