import * as T from 'three';
import {
  createGeometryTools,
  type MaterialFactory,
} from './landscape-geometry';

const red = '#a94737',
  green = '#275c4d',
  blue = '#1f4358',
  gold = '#c9aa69',
  stone = '#ded8c8';

export function createPalaceArchitecture(
  material: MaterialFactory,
  frieze: T.Texture,
) {
  const { mesh, box, cyl } = createGeometryTools(material);
  const painted = new T.MeshStandardMaterial({
    map: frieze,
    roughness: 0.64,
    color: '#ffffff',
  });

  function ceiling(
    parent: T.Object3D,
    width: number,
    depth: number,
    painting: T.Texture,
  ) {
    box(parent, 0, 4.15, 0, width + 0.1, 0.13, depth + 0.1, '#604238');
    const panel = new T.Mesh(
      new T.PlaneGeometry(width, depth),
      new T.MeshStandardMaterial({
        map: painting,
        roughness: 0.65,
        metalness: 0.03,
      }),
    );
    panel.name = 'Painted lotus ceiling';
    panel.rotation.x = Math.PI / 2;
    // The backing's underside is at 4.085. Keep the painted face clearly below it.
    panel.position.y = 4.05;
    panel.receiveShadow = true;
    parent.add(panel);
    return panel;
  }

  function beam(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height = 0.42,
  ) {
    box(parent, x, y, z, width, height, 0.32, green);
    for (const side of [-1, 1]) {
      const geometry = new T.PlaneGeometry(width - 0.04, height - 0.03);
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++)
        uv.setX(i, (uv.getX(i) * width) / (height * 3));
      const face = new T.Mesh(geometry, painted);
      face.position.set(x, y, z + side * 0.166);
      face.rotation.y = side < 0 ? Math.PI : 0;
      face.receiveShadow = true;
      parent.add(face);
    }
    for (const dy of [-height / 2, height / 2])
      box(parent, x, y + dy, z, width + 0.03, 0.028, 0.36, gold);
  }

  function bracket(parent: T.Object3D, x: number, y: number, z: number) {
    for (let level = 0; level < 3; level++) {
      const width = 0.38 + level * 0.23;
      box(
        parent,
        x,
        y + level * 0.11,
        z,
        width,
        0.09,
        0.2,
        level % 2 ? blue : green,
      );
      box(
        parent,
        x,
        y + level * 0.11 + 0.045,
        z,
        width + 0.03,
        0.022,
        0.23,
        gold,
      );
      for (const side of [-1, 1])
        box(
          parent,
          x + side * (width / 2 - 0.04),
          y + level * 0.11 + 0.08,
          z,
          0.11,
          0.11,
          0.24,
          green,
        );
    }
    box(parent, x, y + 0.21, z, 0.19, 0.11, 0.85, green);
  }

  function column(
    parent: T.Object3D,
    x: number,
    z: number,
    height = 3.2,
    radius = 0.12,
    color = red,
  ) {
    const profile = [
      [0.23, 0],
      [0.23, 0.055],
      [0.21, 0.09],
      [0.17, 0.13],
      [0.15, 0.2],
      [0.15, 0.24],
    ].map(([r, y]) => new T.Vector2(r, y));
    mesh(new T.LatheGeometry(profile, 24), stone, parent, x, 0.12, z);
    cyl(
      parent,
      x,
      (height + 0.36) / 2,
      z,
      radius,
      height - 0.36,
      color,
      radius * 0.92,
      28,
    );
    for (const y of [0.38, height - 0.23])
      cyl(parent, x, y, z, radius + 0.012, 0.045, gold, radius + 0.012, 24);
    bracket(parent, x, height - 0.12, z);
  }

  function lattice(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    for (const xx of [-width / 2, width / 2])
      box(g, xx, 0, 0, 0.065, height + 0.07, 0.09, red);
    for (const yy of [-height / 2, height / 2])
      box(g, 0, yy, 0, width + 0.07, 0.065, 0.09, red);
    const cells = Math.max(2, Math.floor(width / 0.38)),
      cellWidth = width / cells;
    for (let i = 1; i < cells; i++)
      box(g, -width / 2 + i * cellWidth, 0, 0, 0.022, height, 0.038, red);
    for (const yy of [-height * 0.31, height * 0.31])
      box(g, 0, yy, 0, width, 0.025, 0.04, red);
    for (let i = 0; i < cells; i++) {
      const xx = -width / 2 + (i + 0.5) * cellWidth;
      for (const yy of [-height * 0.17, height * 0.17]) {
        const diamond = new T.Group();
        diamond.position.set(xx, yy, 0.01);
        diamond.rotation.z = Math.PI / 4;
        g.add(diamond);
        const size = Math.min(cellWidth * 0.52, height * 0.17);
        for (const side of [-1, 1]) {
          box(diamond, (side * size) / 2, 0, 0, 0.019, size, 0.034, red);
          box(diamond, 0, (side * size) / 2, 0, size, 0.019, 0.034, red);
        }
      }
    }
  }

  function railing(
    parent: T.Object3D,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    color = stone,
  ) {
    const length = Math.hypot(x2 - x1, z2 - z1),
      g = new T.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    parent.add(g);
    const sections = Math.max(1, Math.round(length / 1.15));
    for (let i = 0; i <= sections; i++) {
      const z = -length / 2 + (i * length) / sections;
      box(g, 0, 0.62, z, 0.15, 0.84, 0.15, color);
      box(g, 0, 0.22, z, 0.24, 0.11, 0.24, color);
      const finial = mesh(
        new T.SphereGeometry(0.115, 12, 8),
        color,
        g,
        0,
        1.08,
        z,
      );
      finial.scale.y = 1.2;
    }
    box(g, 0, 0.93, 0, 0.16, 0.09, length, color);
    box(g, 0, 0.34, 0, 0.12, 0.09, length, color);
    for (let i = 0; i < sections; i++) {
      const z = -length / 2 + ((i + 0.5) * length) / sections;
      box(g, 0, 0.62, z, 0.085, 0.52, 0.09, color);
      for (const dz of [-0.2, 0.2])
        box(g, 0, 0.62, z + dz, 0.075, 0.52, 0.065, color);
    }
  }

  function pavedWalk(
    parent: T.Object3D,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    width = 2.65,
  ) {
    const length = Math.hypot(x2 - x1, z2 - z1),
      g = new T.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    parent.add(g);
    box(g, 0, 0.045, 0, width + 0.32, 0.15, length + 0.04, '#b7b5a5');
    const rows = Math.ceil(length / 0.86),
      size = length / rows,
      columns = Math.max(2, Math.round(width / 0.83));
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < columns; col++) {
        const tint = ['#ded8c8', '#e5dfcf', '#cfc9b9'][(row * 7 + col * 5) % 3];
        box(
          g,
          -width / 2 + ((col + 0.5) * width) / columns,
          0.126,
          -length / 2 + (row + 0.5) * size,
          width / columns - 0.017,
          0.045,
          size - 0.017,
          tint,
        );
      }
    for (const side of [-1, 1]) {
      box(g, side * (width / 2 + 0.075), 0.139, 0, 0.14, 0.055, length, stone);
      box(
        g,
        side * (width / 2 - 0.08),
        0.151,
        0,
        0.03,
        0.008,
        length,
        '#708076',
      );
    }
  }

  function landing(parent: T.Object3D, x: number, z: number, radius = 1.85) {
    cyl(parent, x, 0.085, z, radius, 0.17, stone, radius, 64);
    const rim = mesh(
      new T.RingGeometry(radius - 0.18, radius - 0.12, 64),
      '#738074',
      parent,
      x,
      0.177,
      z,
    );
    rim.rotation.x = -Math.PI / 2;
    const inset = mesh(
      new T.RingGeometry(0.47, 0.5, 48),
      '#87968a',
      parent,
      x,
      0.179,
      z,
    );
    inset.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        g = new T.Group();
      g.position.set(x, 0, z);
      g.rotation.y = a;
      parent.add(g);
      box(g, 0, 0.18, 1.09, 0.015, 0.006, 1.12, '#b2b1a0');
    }
  }

  function pondTerrace(parent: T.Object3D) {
    const base = mesh(
      new T.RingGeometry(2.05, 2.78, 96),
      stone,
      parent,
      0,
      0.17,
      -2,
    );
    base.rotation.x = -Math.PI / 2;
    for (const radius of [2.08, 2.72]) {
      const rim = mesh(
        new T.TorusGeometry(radius, 0.026, 8, 96),
        '#7f8b7b',
        parent,
        0,
        0.198,
        -2,
      );
      rim.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 40; i++) {
      const a = (i * Math.PI) / 20,
        g = new T.Group();
      g.position.set(0, 0, -2);
      g.rotation.y = a;
      parent.add(g);
      box(g, 0, 0.187, 2.4, 0.015, 0.008, 0.57, '#adaf9d');
    }
  }

  function gardenBed(
    parent: T.Object3D,
    x: number,
    z: number,
    width: number,
    depth: number,
  ) {
    box(parent, x, 0.1, z, width, 0.21, depth, '#71826b');
    for (const side of [-1, 1]) {
      box(
        parent,
        x + (side * width) / 2,
        0.18,
        z,
        0.14,
        0.3,
        depth + 0.14,
        stone,
      );
      box(parent, x, 0.18, z + (side * depth) / 2, width, 0.3, 0.14, stone);
    }
    const leaves = new T.MeshStandardMaterial({
      color: '#54744c',
      roughness: 0.9,
    });
    const shrubGeo = new T.SphereGeometry(0.12, 8, 6),
      shrubs = new T.InstancedMesh(shrubGeo, leaves, 100);
    const dummy = new T.Object3D();
    for (let i = 0; i < 100; i++) {
      const a = i * 2.39996,
        r = Math.sqrt((i + 0.5) / 100);
      dummy.position.set(
        x + Math.cos(a) * r * (width / 2 - 0.13),
        0.26 + Math.sin(i * 3.5) * 0.1,
        z + Math.sin(a) * r * (depth / 2 - 0.12),
      );
      dummy.scale.set(1.2, 0.65, 1.1);
      dummy.updateMatrix();
      shrubs.setMatrixAt(i, dummy.matrix);
    }
    shrubs.receiveShadow = true;
    shrubs.castShadow = true;
    shrubs.computeBoundingSphere();
    parent.add(shrubs);
  }

  function corridor(
    parent: T.Object3D,
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    makeRoof: (
      p: T.Object3D,
      y: number,
      w: number,
      d: number,
      h: number,
      c?: string,
    ) => T.Group,
  ) {
    const length = Math.hypot(x2 - x1, z2 - z1),
      g = new T.Group();
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    g.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    parent.add(g);
    const bays = Math.max(2, Math.round((length - 1.8) / 2.7));
    for (let i = 0; i <= bays; i++) {
      const z = -length / 2 + 0.95 + (i * (length - 1.9)) / bays;
      for (const x of [-1.3, 1.3]) column(g, x, z, 3.08, 0.095, green);
      beam(g, 0, 3.38, z, 2.88, 0.34);
      if (i < bays) {
        const mid = z + (length - 1.9) / bays / 2;
        const cross = new T.Group();
        cross.position.set(0, 0, mid);
        cross.rotation.y = Math.PI / 2;
        g.add(cross);
        for (const side of [-1, 1]) {
          beam(cross, 0, 3.31, side * 1.3, (length - 1.9) / bays + 0.1, 0.3);
          railing(
            g,
            side * 1.3,
            z + 0.13,
            side * 1.3,
            z + (length - 1.9) / bays - 0.13,
            red,
          );
        }
      }
    }
    // A narrow roof rotated along the promenade gives a continuous ridge overhead.
    const canopy = new T.Group();
    canopy.rotation.y = Math.PI / 2;
    g.add(canopy);
    box(g, 0, 3.56, 0, 2.9, 0.1, length, green);
    makeRoof(canopy, 3.6, length + 0.65, 3.5, 0.85, '#376758');
    return g;
  }

  function porch(parent: T.Object3D, width: number, depth: number) {
    box(parent, 0, 0.1, depth / 2 + 0.5, width + 0.52, 0.2, 1.35, stone);
    for (const x of [-width / 2 + 0.2, -1.8, 1.8, width / 2 - 0.2])
      column(parent, x, depth / 2 + 0.49, 3.75, 0.12);
    beam(parent, 0, 3.94, depth / 2 + 0.5, width + 0.1, 0.42);
    for (const side of [-1, 1])
      railing(
        parent,
        side * 1.9,
        depth / 2 + 1.08,
        side * (width / 2 - 0.1),
        depth / 2 + 1.08,
        red,
      );
  }

  return {
    ceiling,
    beam,
    column,
    lattice,
    railing,
    pavedWalk,
    landing,
    pondTerrace,
    gardenBed,
    corridor,
    porch,
  };
}
