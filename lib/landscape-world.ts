import * as T from 'three';
import { createGeometryTools } from './landscape-geometry';
import { createPalaceArchitecture } from './palace-architecture';
import {
  createMaterialPalette,
  type LandscapeSurfaces,
} from './landscape-materials';
import { createPlanting } from './landscape-planting';
import { createLake } from './landscape-water';
import { batchStaticMeshes } from './landscape-batching';
import type { Object3D, Group } from 'three';
import { rooms, type RoomId } from './landscape-config';
import { createFlowers } from './landscape-flowers';
import { createInteriors } from './landscape-interiors';
import { createTerrain, terrainHeight } from './landscape-terrain';
import { createRoofPanel, roofPoint } from './palace-roof-surface';

export function createLandscapeWorld(
  makeSign: (
    title: string,
    kicker: string,
    lines: string[],
    aspect?: number,
  ) => T.Texture,
  surfaces: LandscapeSurfaces,
  frieze: T.Texture,
) {
  const material = createMaterialPalette(surfaces);
  const { mesh, box, cyl, line } = createGeometryTools(material);
  const stone = '#ded8c8',
    white = '#f0e8d7',
    red = '#a94737',
    jade = '#376758',
    wood = '#604238',
    gold = '#c9aa69';
  const palace = createPalaceArchitecture(material, frieze);
  const flowers = createFlowers();
  const interiors = createInteriors(
    material,
    makeSign,
    flowers.bouquet,
    lantern,
  );

  // Modeled overlapping barrel tiles and curved eaves catch light from any viewpoint.
  function roof(
    p: Object3D,
    y: number,
    w: number,
    d: number,
    h: number,
    c = jade,
  ) {
    const g = new T.Group();
    g.position.y = y;
    p.add(g);
    const roofMaterial = material(c).clone();
    roofMaterial.side = T.DoubleSide;
    function point(side: number, t: number, u: number) {
      return roofPoint(side, t, u, w, d, h);
    }
    for (let side = 0; side < 4; side++) {
      const geo = createRoofPanel(side, w, d, h);
      const surface = new T.Mesh(geo, roofMaterial);
      surface.castShadow = true;
      surface.receiveShadow = true;
      g.add(surface);
      const edge = Array.from({ length: 49 }, (_, i) =>
        point(side, 1, i / 24 - 1),
      );
      line(g, edge, c, 0.065);
      const hip = Array.from({ length: 25 }, (_, i) => {
        const v = point(side, i / 24, 1);
        v.y += 0.07;
        return v;
      });
      line(g, hip, c, 0.09);
      // Exposed rafters extend below each overhanging eave.
      for (let k = 1; k < 20; k++) {
        const a = point(side, 0.75, k / 10 - 1),
          b = point(side, 1, k / 10 - 1);
        a.y -= 0.13;
        b.y -= 0.13;
        line(g, [a, b], wood, 0.035);
      }
    }
    const ridge = Math.max(w * 0.24, (w - d) * 0.5);
    line(
      g,
      [
        new T.Vector3(-ridge - 0.12, h + 0.38, 0),
        new T.Vector3(-ridge, h + 0.14, 0),
        new T.Vector3(0, h + 0.12, 0),
        new T.Vector3(ridge, h + 0.14, 0),
        new T.Vector3(ridge + 0.12, h + 0.38, 0),
      ],
      c,
      0.09,
    );
    return g;
  }
  const lanterns: Group[] = [];
  function lantern(p: Object3D, x: number, y: number, z: number, size = 0.13) {
    const g = new T.Group();
    g.position.set(x, y, z);
    p.add(g);
    lanterns.push(g);
    cyl(g, 0, 0.13, 0, 0.013, 0.2, gold, 0.013, 6);
    const l = mesh(
      new T.SphereGeometry(size, 32, 20),
      '#e99a62',
      g,
      0,
      0,
      0,
      0,
      true,
    );
    l.scale.y = 1.2;
    cyl(g, 0, 0.14, 0, size * 0.53, 0.045, gold, size * 0.53, 10);
    cyl(g, 0, -0.14, 0, size * 0.5, 0.035, gold, size * 0.5, 10);
    cyl(g, 0, -0.23, 0, 0.015, 0.15, red, 0.015, 6);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      cyl(
        g,
        Math.cos(a) * size * 0.92,
        0,
        Math.sin(a) * size * 0.92,
        0.009,
        0.2,
        '#ba7045',
        0.009,
        5,
      );
    }
  }
  function lamp(p: Object3D, x: number, z: number) {
    cyl(p, x, 0.58, z, 0.025, 1.16, wood, 0.025, 8);
    box(p, x + 0.12, 1.13, z, 0.3, 0.04, 0.045, wood);
    lantern(p, x + 0.22, 0.88, z, 0.115);
  }
  const { tree, bamboo, grass } = createPlanting(material('#795a44'));
  const world = new T.Group(),
    contentObjects = new Map<RoomId, T.Group>();
  world.add(createTerrain(surfaces));
  const lake = createLake();
  const water = lake.surface;
  world.add(water);
  const waterMaterial = lake.material;
  // Garden paths are individually laid stone, with open planted space between them.
  palace.pavedWalk(world, 0, 8, 0, 4, 3.4);
  palace.pavedWalk(world, 0, 4, -7, 3);
  palace.pavedWalk(world, 0, 4, 7, 3);
  palace.pavedWalk(world, -7, 3, -8.9, -5, 2.45);
  palace.pavedWalk(world, 7, 3, 8.9, -5, 2.45);
  palace.pavedWalk(world, 0, 4, 6, -4, 2.45);
  palace.pavedWalk(world, 6, -4, 0, -8.85, 2.45);
  palace.pavedWalk(world, -7, 3, -14, 3.7);
  palace.pavedWalk(world, 7, 3, 14, 4.7);
  palace.landing(world, 0, 4, 2.25);
  palace.landing(world, -7, 3, 1.75);
  palace.landing(world, 7, 3, 1.75);
  palace.landing(world, 6, -4, 1.65);
  palace.pondTerrace(world);
  palace.gardenBed(world, -4.6, -2.1, 2.6, 5.1);
  palace.gardenBed(world, 6.2, -1.8, 0.75, 1.8);
  for (const [x1, z1, x2, z2] of [
    [-7, 3, -8.9, -5],
    [7, 3, 8.9, -5],
    [6, -4, 0, -8.85],
  ]) {
    const gallery = palace.corridor(world, x1, z1, x2, z2, roof);
    lantern(gallery, 0, 2.88, 0, 0.19);
  }
  // A long, low stone bridge forms the entrance to the estate.
  const bridge = new T.Group();
  bridge.position.z = 15;
  world.add(bridge);
  for (let i = 0; i < 35; i++) {
    const z = -7 + i * 0.412,
      y = 0.1 + Math.sin((i / 34) * Math.PI) * 0.34;
    box(bridge, 0, y, z, 3.2, 0.2, 0.43, '#e5dfcf');
    if (i % 3 === 0)
      for (const x of [-1.46, 1.46]) {
        box(bridge, x, y + 0.48, z, 0.18, 0.95, 0.18, stone);
        mesh(new T.SphereGeometry(0.13, 16, 10), stone, bridge, x, y + 0.99, z);
      }
  }
  for (const x of [-1.46, 1.46])
    line(
      bridge,
      Array.from(
        { length: 20 },
        (_, i) =>
          new T.Vector3(
            x,
            0.83 + Math.sin((i / 19) * Math.PI) * 0.34,
            -7 + (i / 19) * 14,
          ),
      ),
      stone,
      0.065,
    );
  for (const side of [-1, 1])
    for (const center of [-4, 0, 4]) {
      const arch = Array.from({ length: 25 }, (_, i) => {
        const a = (i * Math.PI) / 24;
        return new T.Vector3(
          side * 1.4,
          -0.94 + Math.sin(a) * 1.1,
          center + Math.cos(a) * 1.9,
        );
      });
      line(bridge, arch, stone, 0.16);
    }
  box(world, 0, 0.08, 22.5, 5, 0.35, 2.2, stone);
  const gate = new T.Group();
  gate.position.set(0, 0, 16.5);
  world.add(gate);
  for (const x of [-2.25, 2.25]) {
    palace.column(gate, x, 0, 4.0, 0.16);
    lantern(gate, x, 3.25, 0.25, 0.3);
  }
  palace.beam(gate, 0, 4.3, 0, 5.0, 0.54);
  roof(gate, 4.4, 6.1, 2.3, 1.1);
  // Fully modeled, open doorways lead into furnished rooms at human scale.
  rooms.forEach((room) => {
    const g = new T.Group();
    g.position.set(room.position[0], room.position[1], room.position[2]);
    g.rotation.y = room.rotation;
    world.add(g);
    const w = room.width,
      d = room.depth,
      h = 4.1,
      open = room.id === 'writing' || room.id === 'inspiration';
    box(g, 0, 0.06, 0, w + 0.7, 0.22, d + 0.7, stone);
    box(g, 0, 0.185, 0, w, 0.035, d, '#8b7054');
    for (let x = -w / 2 + 0.16; x < w / 2; x += 0.43)
      box(g, x, 0.207, 0, 0.014, 0.006, d, '#705940');
    box(g, 0, 2.1, -d / 2, 3.2, h, 0.18, '#d9cfb8');
    for (const side of [-1, 1]) {
      const sideWidth = (w - 3.2) / 2,
        x = (side * (w + 3.2)) / 4;
      box(g, x, 0.69, -d / 2, sideWidth, 1.06, 0.18, '#d9cfb8');
      box(g, x, 3.45, -d / 2, sideWidth, 0.96, 0.18, '#d9cfb8');
      palace.lattice(g, x, 2.1, -d / 2 - 0.05, sideWidth - 0.18, 1.78);
      const sideBeam = new T.Group();
      sideBeam.position.x = side * (w / 2 + 0.05);
      sideBeam.rotation.y = Math.PI / 2;
      g.add(sideBeam);
      palace.beam(sideBeam, 0, 3.95, 0, d + 0.1, 0.3);
    }
    palace.beam(g, 0, 3.96, -d / 2 - 0.05, w + 0.1, 0.3);
    if (!open) {
      for (const x of [-w / 2, w / 2]) {
        box(g, x, 0.7, 0, 0.17, 1.2, d, '#d6cbb2');
        box(g, x, 3.52, 0, 0.17, 1.18, d, '#d6cbb2');
        for (let z = -d / 2 + 0.3; z < d / 2; z += 1.05) {
          box(g, x, 2.13, z, 0.19, 1.7, 0.075, wood);
          for (const y of [1.35, 2.88])
            box(g, x, y, z, 0.19, 0.065, 1.05, wood);
          for (let j = -1; j <= 1; j++)
            box(g, x, 2.12, z + j * 0.23, 0.05, 1.5, 0.025, wood);
        }
      }
      const sideWidth = (w - 3.2) / 2;
      for (const side of [-1, 1]) {
        const x = (side * (w + 3.2)) / 4;
        box(g, x, 0.69, d / 2, sideWidth, 1.06, 0.18, '#d8ceb6');
        box(g, x, 3.45, d / 2, sideWidth, 0.96, 0.18, '#d8ceb6');
        palace.lattice(g, x, 2.1, d / 2 + 0.05, sideWidth - 0.18, 1.78);
      }
      for (const side of [-1, 1]) {
        const door = new T.Group();
        door.position.set(side * 1.6, 0.18, d / 2);
        door.rotation.y = side * Math.PI * 0.44;
        g.add(door);
        box(door, side * 0.6, 1.5, 0, 1.2, 3, 0.13, red);
        for (let k = 0; k < 4; k++)
          box(
            door,
            side * 0.6,
            0.85 + k * 0.5,
            0.075,
            0.94,
            0.028,
            0.022,
            gold,
          );
      }
    }
    for (const x of [-w / 2 + 0.16, w / 2 - 0.16])
      palace.column(g, x, -d / 2 + 0.1, 3.82, 0.12);
    palace.porch(g, w, d);
    palace.beam(g, 0, 3.96, d / 2, w + 0.12, 0.38);
    box(g, 0, 4.15, 0, w + 0.1, 0.13, d + 0.1, wood);
    // A painted coffered ceiling: lacquer panels framed by a grid of beams.
    const acrossX = Math.max(3, Math.round(w / 1.45)),
      acrossZ = Math.max(3, Math.round(d / 1.45));
    const panels = interiors.coffer(room.accent);
    panels.wrapS = panels.wrapT = T.RepeatWrapping;
    panels.repeat.set(acrossX, acrossZ);
    const ceiling = new T.Mesh(
      new T.PlaneGeometry(w, d),
      new T.MeshStandardMaterial({
        map: panels,
        roughness: 0.55,
        metalness: 0.05,
      }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.085;
    ceiling.receiveShadow = true;
    g.add(ceiling);
    for (let i = 1; i < acrossZ; i++)
      box(g, 0, 3.93, -d / 2 + (i * d) / acrossZ, w, 0.2, 0.17, wood);
    for (let i = 1; i < acrossX; i++)
      box(g, -w / 2 + (i * w) / acrossX, 3.94, 0, 0.15, 0.18, d, wood);
    roof(
      g,
      4.2,
      w + 2.25,
      d + 2.25,
      1.55,
      room.id === 'research' ? '#b8954e' : jade,
    );
    if (room.id === 'research') {
      box(g, 0, 5.66, 0, 7.1, 0.94, 4.8, '#d8ceb5');
      palace.beam(g, 0, 5.97, 2.45, 7.25, 0.37);
      roof(g, 6.07, 8.8, 6.5, 1.45, '#b8954e');
    }
    for (const x of [-w * 0.31, w * 0.31])
      lantern(g, x, 3.2, d / 2 - 0.45, 0.31);
    const warm = new T.PointLight('#fff1d8', 9, 11, 2);
    warm.position.set(0, 3.3, 0);
    g.add(warm);
    // Door plaques are readable objects within the world.
    const plaque = mesh(
      new T.PlaneGeometry(2.15, 0.56),
      '#fff',
      g,
      0,
      3.4,
      d / 2 + 0.745,
    );
    plaque.material = new T.MeshStandardMaterial({
      map: makeSign(room.name, '', [], 3.85),
      roughness: 1,
    });
    box(g, 0, 3.4, d / 2 + 0.68, 2.3, 0.68, 0.1, red);
    contentObjects.set(room.id, interiors.furnish(g, room));
  });
  // The courtyard pond and planting soften the route between the rooms.
  const pond = mesh(
    new T.CircleGeometry(2.03, 64),
    '#5a958b',
    world,
    0,
    0.112,
    -2,
  );
  pond.rotation.x = -Math.PI / 2;
  pond.material = new T.MeshStandardMaterial({
    color: '#638d80',
    metalness: 0.4,
    roughness: 0.23,
  });
  pond.castShadow = false;
  function lotus(x: number, z: number) {
    const pad = mesh(
      new T.CircleGeometry(0.24, 18),
      '#7a9169',
      world,
      x,
      0.15,
      z,
    );
    pad.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const petal = mesh(
        new T.SphereGeometry(0.075, 16, 12),
        '#e7b4b5',
        world,
        x + Math.cos(a) * 0.07,
        0.22,
        z + Math.sin(a) * 0.07,
      );
      petal.scale.set(1, 0.45, 1);
    }
  }
  for (let i = 0; i < 10; i++) {
    const a = i * 2.4,
      r = 0.4 + (i % 4) * 0.42;
    lotus(Math.cos(a) * r, -2 + Math.sin(a) * r);
  }
  for (const [x, z, s, b] of [
    [-7, 7, 4.5, 1],
    [7.5, 7, 4.4, 1],
    [-19, 4, 4.5, 1],
    [20, 3, 4.6, 1],
    [-19, -11, 5, 0],
    [20, -12, 4.6, 0],
    [-9, -20, 5.5, 0],
    [9, -20, 5, 0],
    [-27, -5, 5.5, 0],
    [27, -3, 6, 0],
    [-23, 12, 4.2, 0],
    [24, 13, 5, 0],
    [-28, -20, 6.5, 0],
    [27, -24, 7, 0],
  ])
    tree(world, x, z, s, !!b);
  for (const [x, z] of [
    [-6, -9],
    [6, -9],
    [-20, 0],
    [20, 0],
    [-10, -15],
    [10, -15],
  ]) {
    const grove = new T.Group();
    grove.position.set(x, 0, z);
    grove.scale.setScalar(2.5);
    world.add(grove);
    bamboo(grove, 0, 0);
    bamboo(grove, 0.35, 0.3);
  }
  for (const [x, z] of [
    [-2, 7],
    [2, 7],
    [-6, 1.8],
    [6, 1.8],
    [-3, -9],
    [3, -9],
  ]) {
    const pole = new T.Group();
    pole.position.set(x, 0, z);
    pole.scale.setScalar(2.2);
    world.add(pole);
    lamp(pole, 0, 0);
  }
  for (const [x, z, scale, blossom] of [
    [-33, -8, 5.6, 1],
    [34, -8, 5.8, 1],
    [-38, 5, 5.2, 1],
    [39, 5, 5.4, 1],
    [-39, -25, 6.4, 0],
    [41, -26, 6.5, 0],
    [-26, -36, 6.2, 1],
    [27, -37, 6.1, 1],
    [-9, -37, 5.9, 0],
    [11, -39, 6.3, 0],
    [-52, -40, 7, 0],
    [53, -42, 7.2, 0],
  ]) {
    const grove = new T.Group();
    grove.position.y = terrainHeight(x, z) + 0.08;
    world.add(grove);
    tree(grove, x, z, scale, !!blossom);
  }
  grass(world);
  flowers.garden(world);
  // Low walls and a moon gate keep the estate open to the surrounding mountains.
  function gardenWall(x: number, z: number, w: number) {
    box(world, x, 1.15, z, w, 2.3, 0.22, '#d2c9b2');
    box(world, x, 2.35, z, w + 0.2, 0.13, 0.44, jade);
    for (let xx = -w / 2 + 0.2; xx < w / 2; xx += 0.45)
      box(world, x + xx, 2.43, z, 0.05, 0.04, 0.48, '#7e9383');
  }
  gardenWall(0, -21, 27);
  gardenWall(-23, -13, 9);
  gardenWall(24, -13, 8);
  const moon = mesh(
    new T.TorusGeometry(1.4, 0.15, 24, 96),
    white,
    world,
    19,
    1.52,
    5,
  );
  moon.rotation.y = 0.32;
  const petals: T.Mesh[] = [];
  for (let i = 0; i < 65; i++) {
    const p = mesh(
      new T.SphereGeometry(0.022, 8, 5),
      '#ebc1b8',
      world,
      Math.sin(i * 2.4) * 24,
      1 + (i % 10) * 0.55,
      3 + Math.cos(i * 2.1) * 16,
    );
    p.scale.set(1.2, 0.3, 1);
    petals.push(p);
  }
  // Draw stationary architecture in material batches; retain interactive objects.
  const moving = new Set<Object3D>([
    water,
    ...lanterns,
    ...contentObjects.values(),
    ...petals,
  ]);
  // Lanterns still sway, but their small pieces share draws within each lantern.
  for (const lantern of lanterns) batchStaticMeshes(lantern);
  batchStaticMeshes(world, moving);
  world.updateMatrixWorld(true);
  world.traverse((object) => {
    for (
      let ancestor: Object3D | null = object;
      ancestor && ancestor !== world;
      ancestor = ancestor.parent
    ) {
      if (moving.has(ancestor)) return;
    }
    object.matrixAutoUpdate = false;
    object.matrixWorldAutoUpdate = false;
  });
  let time = 0;
  function update(dt: number, paused: boolean) {
    if (paused) return;
    time += dt;
    waterMaterial.uniforms.time.value = time;
    lanterns.forEach(
      (g, i) => (g.rotation.z = Math.sin(time * 0.65 + i) * 0.025),
    );
    petals.forEach((p, i) => {
      p.position.y -= dt * 0.1;
      p.position.x += Math.sin(time * 0.4 + i) * dt * 0.08;
      p.rotation.y = time * 0.3;
      if (p.position.y < 0.3) p.position.y = 6;
    });
  }
  function dispose() {
    water.dispose();
    interiors.dispose();
  }
  return { world, contentObjects, update, dispose };
}
