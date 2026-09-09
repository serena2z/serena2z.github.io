import * as T from 'three';
import {
  createGeometryTools,
  type MaterialFactory,
} from './landscape-geometry';
import type { Room } from './landscape-config';
import { personalContent } from './personal-content';

type SignMaker = (
  title: string,
  kicker: string,
  lines: string[],
  aspect?: number,
) => T.Texture;
type Bouquet = (
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  scale?: number,
) => void;
type Lantern = (
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  size?: number,
) => void;

/** Deterministic pseudo-random numbers so each painting is stable between reloads. */
function seeded(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function createInteriors(
  material: MaterialFactory,
  sign: SignMaker,
  bouquet: Bouquet,
  lantern: Lantern,
) {
  const { mesh, box, cyl, line } = createGeometryTools(material);
  const wood = '#604238',
    gold = '#c9aa69',
    cream = '#eee4cc',
    jade = '#376758';
  const bookColors = ['#6d8576', '#a87967', '#c1a474', '#778f9d', '#a48b9e'];
  const textures: T.Texture[] = [];
  function canvasTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas painting is unavailable');
    draw(ctx, width, height);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = 8;
    textures.push(texture);
    return texture;
  }
  function mix(a: string, b: string, t: number) {
    return `#${new T.Color(a).lerp(new T.Color(b), t).getHexString()}`;
  }
  function paper(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rnd: () => number,
  ) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#efe7d3');
    g.addColorStop(1, '#e3d8bf');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(90, 70, 40, 0.05)';
    for (let i = 0; i < (w * h) / 900; i++)
      ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  function seal(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    s: number,
  ) {
    ctx.fillStyle = '#b4442d';
    ctx.fillRect(x, y, s, s);
    ctx.strokeStyle = '#f2e2c8';
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.strokeRect(x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.68);
    ctx.fillStyle = '#f2e2c8';
    ctx.fillRect(x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.09);
    ctx.fillRect(x + s * 0.455, y + s * 0.3, s * 0.09, s * 0.4);
    ctx.fillRect(x + s * 0.3, y + s * 0.61, s * 0.4, s * 0.09);
  }
  /** An ink-wash landscape: layered misted mountains, water, and a pine shore. */
  function inkLandscape(seed: number, aspect = 2.1) {
    return canvasTexture(1024, Math.round(1024 / aspect), (ctx, w, h) => {
      const rnd = seeded(seed);
      paper(ctx, w, h, rnd);
      const horizon = h * (0.62 + rnd() * 0.08);
      for (let layer = 0; layer < 5; layer++) {
        const depth = layer / 4,
          base = horizon - (1 - depth) * h * 0.05,
          peakHeight = h * (0.36 - depth * 0.22) * (0.8 + rnd() * 0.4);
        const shade = 34 + depth * 78,
          alpha = 0.22 + (1 - depth) * 0.5;
        ctx.fillStyle = `rgba(${shade}, ${shade + 8}, ${shade + 10}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(-10, h);
        ctx.lineTo(-10, base);
        const peaks = 3 + Math.floor(rnd() * 4),
          shift = rnd() * w * 0.5 - w * 0.25;
        for (let i = 0; i <= peaks * 12; i++) {
          const t = i / (peaks * 12),
            x = t * (w + 20) - 10,
            ridge =
              Math.pow(
                Math.abs(Math.sin(t * Math.PI * peaks + shift * 0.01)),
                1.7,
              ) *
                peakHeight +
              Math.sin(t * 41 + seed) * peakHeight * 0.08 +
              Math.sin(t * 7 + seed * 2) * peakHeight * 0.15;
          ctx.lineTo(x, base - ridge);
        }
        ctx.lineTo(w + 10, base);
        ctx.lineTo(w + 10, h);
        ctx.closePath();
        ctx.fill();
        // Mist softens the foot of each range.
        const mist = ctx.createLinearGradient(
          0,
          base - h * 0.16,
          0,
          base + h * 0.02,
        );
        mist.addColorStop(0, 'rgba(236, 228, 210, 0)');
        mist.addColorStop(1, 'rgba(236, 228, 210, 0.85)');
        ctx.fillStyle = mist;
        ctx.fillRect(0, base - h * 0.16, w, h * 0.18);
      }
      // Still water with a few reflected strokes.
      const water = ctx.createLinearGradient(0, horizon, 0, h);
      water.addColorStop(0, 'rgba(120, 140, 140, 0.16)');
      water.addColorStop(1, 'rgba(120, 140, 140, 0)');
      ctx.fillStyle = water;
      ctx.fillRect(0, horizon, w, h - horizon);
      ctx.strokeStyle = 'rgba(50, 60, 62, 0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 9; i++) {
        const y = horizon + h * 0.06 + rnd() * (h - horizon) * 0.7,
          x = rnd() * w * 0.8,
          len = w * (0.05 + rnd() * 0.16);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y + rnd() * 1.5);
        ctx.stroke();
      }
      // A rocky shore with pines in the foreground corner.
      const side = rnd() > 0.5 ? 1 : -1,
        shoreX = side > 0 ? w * 0.78 : w * 0.22;
      ctx.fillStyle = 'rgba(30, 36, 38, 0.82)';
      ctx.beginPath();
      ctx.moveTo(shoreX - w * 0.26 * side, h);
      ctx.quadraticCurveTo(
        shoreX - w * 0.1 * side,
        h * 0.72,
        shoreX + w * 0.05 * side,
        h * 0.8,
      );
      ctx.quadraticCurveTo(
        shoreX + w * 0.2 * side,
        h * 0.7,
        shoreX + w * 0.3 * side,
        h,
      );
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const x = shoreX + (i - 1) * w * 0.045 * side + rnd() * w * 0.02,
          top = h * (0.52 + rnd() * 0.1),
          foot = h * 0.78;
        ctx.strokeStyle = 'rgba(28, 32, 34, 0.9)';
        ctx.lineWidth = 3.5 - i * 0.6;
        ctx.beginPath();
        ctx.moveTo(x, foot);
        ctx.bezierCurveTo(x + 10, foot - 40, x - 14, top + 50, x + 4, top);
        ctx.stroke();
        for (let k = 0; k < 6; k++) {
          const y = top + k * (foot - top) * 0.11,
            span = 26 + k * 7;
          ctx.lineWidth = 1.4;
          for (let n = -span; n <= span; n += 4) {
            ctx.beginPath();
            ctx.moveTo(x + n * 0.3, y);
            ctx.lineTo(x + n, y + 10 + rnd() * 6);
            ctx.stroke();
          }
        }
      }
      seal(ctx, side > 0 ? w * 0.06 : w * 0.88, h * 0.1, h * 0.075);
    });
  }
  /** A vertical bamboo study for narrow hanging scrolls. */
  function inkBamboo(seed: number) {
    return canvasTexture(384, 1024, (ctx, w, h) => {
      const rnd = seeded(seed);
      paper(ctx, w, h, rnd);
      ctx.lineCap = 'round';
      for (let stalk = 0; stalk < 3; stalk++) {
        const x0 = w * (0.25 + stalk * 0.24) + rnd() * 18,
          lean = (rnd() - 0.5) * 0.12,
          shade = 40 + stalk * 30;
        const ink = `rgba(${shade}, ${shade + 16}, ${shade + 6}, ${0.9 - stalk * 0.2})`;
        ctx.strokeStyle = ink;
        let y = h * 0.96;
        while (y > h * 0.06) {
          const seg = 78 + rnd() * 40,
            x = x0 + (h - y) * lean;
          ctx.lineWidth = 9 - stalk * 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + seg * lean, y - seg + 6);
          ctx.stroke();
          y -= seg;
        }
        for (let leaf = 0; leaf < 9; leaf++) {
          const ly = h * (0.1 + rnd() * 0.7),
            lx = x0 + (h - ly) * lean,
            dir = rnd() > 0.5 ? 1 : -1;
          for (let n = 0; n < 3; n++) {
            const a = -0.9 + n * 0.55 + rnd() * 0.3,
              len = 60 + rnd() * 50;
            ctx.lineWidth = 7;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.quadraticCurveTo(
              lx + Math.cos(a) * len * 0.5 * dir,
              ly + Math.sin(a) * len * 0.5 - 8,
              lx + Math.cos(a) * len * dir,
              ly + Math.sin(a) * len,
            );
            ctx.stroke();
          }
        }
      }
      seal(ctx, w * 0.72, h * 0.9, w * 0.11);
    });
  }
  /** A painted ceiling coffer: deep lacquer field, gold rule, and a lotus medallion. */
  function coffer(accent: string) {
    return canvasTexture(512, 512, (ctx, w, h) => {
      const field = mix(accent, '#1c332d', 0.72),
        edge = mix(accent, '#0f1f1b', 0.85);
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = edge;
      ctx.lineWidth = 22;
      ctx.strokeRect(0, 0, w, h);
      ctx.strokeStyle = '#c9aa69';
      ctx.lineWidth = 4;
      ctx.strokeRect(34, 34, w - 68, h - 68);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(50, 50, w - 100, h - 100);
      // Corner clouds.
      ctx.strokeStyle = 'rgba(201, 170, 105, 0.7)';
      ctx.lineWidth = 3;
      for (const [cx, cy] of [
        [70, 70],
        [w - 70, 70],
        [70, h - 70],
        [w - 70, h - 70],
      ]) {
        for (let r = 12; r <= 34; r += 11) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Lotus medallion.
      ctx.save();
      ctx.translate(w / 2, h / 2);
      for (let ring = 0; ring < 2; ring++) {
        const petals = 8,
          radius = 92 - ring * 34;
        for (let i = 0; i < petals; i++) {
          ctx.save();
          ctx.rotate((i / petals) * Math.PI * 2 + ring * (Math.PI / petals));
          ctx.beginPath();
          ctx.ellipse(
            0,
            -radius * 0.62,
            radius * 0.24,
            radius * 0.5,
            0,
            0,
            Math.PI * 2,
          );
          ctx.fillStyle = ring
            ? 'rgba(236, 214, 190, 0.85)'
            : mix(accent, '#e9cfc2', 0.55);
          ctx.fill();
          ctx.strokeStyle = 'rgba(201, 170, 105, 0.8)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#c9aa69';
      ctx.fill();
      ctx.restore();
    });
  }
  /** A woven rug with a key-fret border and central medallion. */
  function rugPattern(accent: string, aspect: number) {
    return canvasTexture(1024, Math.round(1024 / aspect), (ctx, w, h) => {
      const rnd = seeded(7),
        field = mix(accent, '#6b5a4e', 0.45),
        border = mix(accent, '#2f2a26', 0.55),
        pale = '#e8dcc3';
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, w, h);
      // Woven grain.
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let y = 0; y < h; y += 3) if (rnd() > 0.5) ctx.fillRect(0, y, w, 1);
      const m = 70;
      ctx.fillStyle = border;
      ctx.fillRect(0, 0, w, m);
      ctx.fillRect(0, h - m, w, m);
      ctx.fillRect(0, 0, m, h);
      ctx.fillRect(w - m, 0, m, h);
      ctx.strokeStyle = pale;
      ctx.lineWidth = 3;
      ctx.strokeRect(m - 12, m - 12, w - 2 * m + 24, h - 2 * m + 24);
      ctx.strokeRect(14, 14, w - 28, h - 28);
      // Key-fret meander along the border.
      const step = 34;
      for (const [x0, y0, dx, dy, count] of [
        [m + 6, m / 2, 1, 0, Math.floor((w - 2 * m) / step)],
        [m + 6, h - m / 2, 1, 0, Math.floor((w - 2 * m) / step)],
        [m / 2, m + 6, 0, 1, Math.floor((h - 2 * m) / step)],
        [w - m / 2, m + 6, 0, 1, Math.floor((h - 2 * m) / step)],
      ]) {
        for (let i = 0; i < count; i++) {
          const x = x0 + dx * i * step,
            y = y0 + dy * i * step;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + dx * 24 + dy * 12, y + dy * 24 + dx * 12);
          ctx.lineTo(x + dx * 24 - dy * 12, y + dy * 24 - dx * 12);
          ctx.lineTo(x + dx * 12, y + dy * 12);
          ctx.stroke();
        }
      }
      // Subtle diamond lattice in the field.
      ctx.strokeStyle = 'rgba(232, 220, 195, 0.14)';
      ctx.lineWidth = 1.5;
      for (let x = m; x < w - m; x += 64) {
        for (let y = m; y < h - m; y += 64) {
          ctx.beginPath();
          ctx.moveTo(x + 32, y);
          ctx.lineTo(x + 64, y + 32);
          ctx.lineTo(x + 32, y + 64);
          ctx.lineTo(x, y + 32);
          ctx.closePath();
          ctx.stroke();
        }
      }
      // Central medallion.
      ctx.save();
      ctx.translate(w / 2, h / 2);
      const radius = Math.min(w, h) * 0.26;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = border;
      ctx.fill();
      ctx.strokeStyle = pale;
      ctx.lineWidth = 4;
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        ctx.save();
        ctx.rotate((i / 12) * Math.PI * 2);
        ctx.beginPath();
        ctx.ellipse(
          0,
          -radius * 0.58,
          radius * 0.16,
          radius * 0.36,
          0,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = i % 2 ? pale : mix(accent, '#e8dcc3', 0.35);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#c9aa69';
      ctx.fill();
      ctx.restore();
    });
  }
  function picture(
    parent: T.Object3D,
    texture: T.Texture,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    box(g, 0, 0, -0.02, w + 0.1, h + 0.1, 0.035, wood);
    box(g, 0, 0, -0.003, w + 0.02, h + 0.02, 0.012, gold);
    const art = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshStandardMaterial({ map: texture, roughness: 0.95 }),
    );
    art.position.z = 0.008;
    art.receiveShadow = true;
    g.add(art);
    return g;
  }
  /** A hanging scroll: paper on wooden rollers with a silk border. */
  function hangingScroll(
    parent: T.Object3D,
    texture: T.Texture,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    accent: string,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    const silk = mix(accent, '#8c7d68', 0.5);
    box(g, 0, 0, -0.008, w + 0.12, h + 0.36, 0.012, silk);
    const art = new T.Mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshStandardMaterial({ map: texture, roughness: 0.95 }),
    );
    art.position.z = 0.002;
    g.add(art);
    for (const end of [-1, 1]) {
      const roller = cyl(
        g,
        0,
        end * (h / 2 + 0.2),
        0.012,
        0.028,
        w + 0.22,
        wood,
      );
      roller.rotation.z = Math.PI / 2;
    }
    cyl(g, 0, h / 2 + 0.29, -0.004, 0.006, 0.16, gold);
  }
  function group(parent: T.Object3D, x: number, z: number, rotation = 0) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotation;
    parent.add(g);
    return g;
  }
  function table(
    parent: T.Object3D,
    x: number,
    z: number,
    w: number,
    d: number,
    height = 1.04,
  ) {
    const g = group(parent, x, z);
    box(g, 0, height, 0, w, 0.12, d, wood);
    box(g, 0, height + 0.065, 0, w - 0.14, 0.018, d - 0.14, '#8b7054');
    for (const side of [-1, 1]) {
      box(
        g,
        0,
        height - 0.16,
        side * (d / 2 - 0.12),
        w - 0.18,
        0.23,
        0.055,
        wood,
      );
      box(
        g,
        0,
        height - 0.09,
        side * (d / 2 - 0.08),
        w - 0.28,
        0.015,
        0.016,
        gold,
      );
      for (const end of [-1, 1]) {
        const px = end * (w / 2 - 0.18),
          pz = side * (d / 2 - 0.15);
        line(
          g,
          [
            new T.Vector3(px, height - 0.08, pz),
            new T.Vector3(px * 0.93, height * 0.48, pz),
            new T.Vector3(px * 1.04, 0.23, pz * 1.04),
          ],
          wood,
          0.055,
        );
        cyl(g, px * 1.04, 0.25, pz * 1.04, 0.066, 0.09, gold);
      }
    }
    return g;
  }
  function chair(
    parent: T.Object3D,
    x: number,
    z: number,
    rotation = 0,
    color = '#7c9686',
  ) {
    const g = group(parent, x, z, rotation);
    box(g, 0, 0.68, 0, 0.91, 0.12, 0.84, wood);
    box(g, 0, 0.77, 0, 0.77, 0.13, 0.69, color);
    for (const px of [-0.36, 0.36])
      for (const pz of [-0.31, 0.31]) {
        box(g, px, 0.43, pz, 0.07, 0.46, 0.07, wood);
        if (pz < 0) cyl(g, px, 1.04, pz, 0.035, 0.74, wood);
      }
    line(
      g,
      [
        new T.Vector3(-0.46, 1.13, 0.21),
        new T.Vector3(-0.45, 1.45, -0.3),
        new T.Vector3(0, 1.53, -0.44),
        new T.Vector3(0.45, 1.45, -0.3),
        new T.Vector3(0.46, 1.13, 0.21),
      ],
      wood,
      0.04,
    );
    box(g, 0, 1.19, -0.36, 0.21, 0.48, 0.045, wood);
    box(g, 0, 1.3, -0.329, 0.12, 0.16, 0.008, gold);
  }
  function vase(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    size = 0.55,
    flowers = false,
  ) {
    const profile = [
      [0.18, 0],
      [0.21, 0.05],
      [0.19, 0.12],
      [0.33, 0.38],
      [0.34, 0.56],
      [0.22, 0.76],
      [0.12, 0.85],
      [0.12, 0.98],
      [0.16, 1.04],
      [0.12, 1.05],
      [0.1, 0.9],
    ];
    const geo = new T.LatheGeometry(
      profile.map(([r, h]) => new T.Vector2(r * size, h * size)),
      32,
    );
    mesh(geo, '#e6e6d5', parent, x, y, z);
    for (const [height, radius] of [
      [0.13, 0.195],
      [0.77, 0.22],
      [1.015, 0.15],
    ]) {
      const ring = mesh(
        new T.TorusGeometry(radius * size, 0.014 * size, 6, 32),
        '#1f4358',
        parent,
        x,
        y + height * size,
        z,
      );
      ring.rotation.x = Math.PI / 2;
    }
    if (flowers) bouquet(parent, x, y + size * 0.88, z, size * 1.15);
  }
  function bookStack(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    count = 4,
  ) {
    for (let i = 0; i < count; i++) {
      const g = group(
        parent,
        x + Math.sin(i * 4) * 0.035,
        z,
        Math.sin(i) * 0.08,
      );
      const h = y + i * 0.105;
      box(g, 0, h + 0.048, 0, 0.68, 0.075, 0.48, cream);
      for (const yy of [h, h + 0.092])
        box(g, 0, yy, 0, 0.72, 0.018, 0.52, bookColors[i % bookColors.length]);
      box(
        g,
        -0.35,
        h + 0.045,
        0,
        0.025,
        0.08,
        0.52,
        bookColors[i % bookColors.length],
      );
    }
  }
  function cabinet(
    parent: T.Object3D,
    x: number,
    z: number,
    w: number,
    height: number,
    shelves: boolean,
    rotation = 0,
  ) {
    const g = group(parent, x, z, rotation),
      depth = 0.65;
    box(g, 0, height / 2 + 0.22, -0.29, w, height, 0.07, wood);
    for (const side of [-1, 1]) {
      box(
        g,
        side * (w / 2 - 0.04),
        height / 2 + 0.22,
        0,
        0.09,
        height,
        depth,
        wood,
      );
      box(g, side * (w / 2 - 0.14), 0.26, 0.17, 0.12, 0.25, 0.12, wood);
    }
    for (const y of [0.33, height + 0.24])
      box(g, 0, y, 0, w + 0.12, 0.11, depth + 0.08, wood);
    if (shelves) {
      const rows = Math.floor(height / 0.6);
      for (let row = 0; row < rows; row++) {
        const y = 0.4 + row * 0.59;
        box(g, 0, y, 0.015, w, 0.055, depth, wood);
        for (let i = 0; i < Math.floor(w / 0.19) - 1; i++) {
          const xx = -w / 2 + 0.18 + i * 0.19,
            h = 0.32 + ((i * 3 + row) % 4) * 0.04;
          box(
            g,
            xx,
            y + h / 2 + 0.035,
            0.04,
            0.135,
            h,
            0.43,
            bookColors[(i + row) % 5],
          );
          for (const by of [0.09, h - 0.07])
            box(g, xx, y + by, 0.263, 0.12, 0.013, 0.012, gold);
        }
      }
    } else {
      for (const side of [-1, 1]) {
        box(
          g,
          (side * w) / 4,
          height / 2 + 0.26,
          0.335,
          w / 2 - 0.07,
          height - 0.16,
          0.07,
          '#8b7054',
        );
        box(
          g,
          (side * w) / 4,
          height / 2 + 0.26,
          0.377,
          w / 2 - 0.25,
          height - 0.36,
          0.012,
          wood,
        );
        const pull = mesh(
          new T.TorusGeometry(0.047, 0.011, 6, 16),
          gold,
          g,
          side * 0.075,
          height * 0.55 + 0.2,
          0.425,
          0.65,
        );
        pull.rotation.x = 0.16;
      }
    }
    return g;
  }
  function screen(
    parent: T.Object3D,
    x: number,
    z: number,
    rotation: number,
    seed = 3,
  ) {
    const g = group(parent, x, z, rotation);
    const painting = inkLandscape(seed, 0.85);
    for (let i = -1; i <= 1; i++) {
      const leaf = group(g, i * 0.64, Math.abs(i) * 0.14, i * -0.22);
      box(leaf, 0, 1.28, 0, 0.63, 2.1, 0.065, wood);
      box(leaf, 0, 1.28, 0.04, 0.51, 1.84, 0.025, '#d9cfb8');
      const slice = painting.clone();
      slice.repeat.set(1 / 3, 1);
      slice.offset.set((i + 1) / 3, 0);
      slice.needsUpdate = true;
      textures.push(slice);
      const panel = new T.Mesh(
        new T.PlaneGeometry(0.47, 1.62),
        new T.MeshStandardMaterial({ map: slice, roughness: 0.95 }),
      );
      panel.position.set(0, 1.3, 0.054);
      leaf.add(panel);
      for (const y of [0.42, 2.19])
        box(leaf, 0, y, 0.075, 0.51, 0.025, 0.02, gold);
      for (const side of [-1, 1])
        box(leaf, side * 0.27, 0.25, 0, 0.055, 0.26, 0.21, wood);
    }
  }
  function brushes(parent: T.Object3D, x: number, y: number, z: number) {
    cyl(parent, x, y + 0.13, z, 0.1, 0.26, jade, 0.12);
    for (let i = 0; i < 5; i++) {
      const g = group(
        parent,
        x + Math.sin(i * 2.4) * 0.055,
        z + Math.cos(i * 2.4) * 0.055,
      );
      g.position.y = y + 0.22;
      g.rotation.z = (i - 2) * 0.08;
      cyl(g, 0, 0.13, 0, 0.011, 0.43, wood);
      cyl(g, 0, 0.37, 0, 0.021, 0.09, '#d9cfb8', 0.002);
    }
  }
  function teaSet(parent: T.Object3D, x: number, y: number, z: number) {
    box(parent, x, y, z, 0.95, 0.045, 0.62, wood);
    const pot = mesh(
      new T.SphereGeometry(0.17, 24, 16),
      jade,
      parent,
      x,
      y + 0.2,
      z,
    );
    pot.scale.y = 0.78;
    cyl(parent, x, y + 0.34, z, 0.105, 0.025, jade);
    cyl(parent, x, y + 0.375, z, 0.032, 0.05, gold);
    const handle = mesh(
      new T.TorusGeometry(0.115, 0.021, 8, 20),
      jade,
      parent,
      x - 0.17,
      y + 0.22,
      z,
    );
    handle.rotation.y = Math.PI / 2;
    line(
      parent,
      [
        new T.Vector3(x + 0.1, y + 0.2, z),
        new T.Vector3(x + 0.22, y + 0.23, z),
        new T.Vector3(x + 0.28, y + 0.31, z),
      ],
      jade,
      0.028,
    );
    for (const side of [-1, 1]) {
      cyl(parent, x + side * 0.32, y + 0.04, z + 0.12, 0.12, 0.025, cream);
      cyl(parent, x + side * 0.32, y + 0.1, z + 0.12, 0.067, 0.1, cream, 0.085);
      cyl(parent, x + side * 0.32, y + 0.154, z + 0.12, 0.07, 0.005, '#785338');
    }
  }
  function armillary(parent: T.Object3D, x: number, y: number, z: number) {
    cyl(parent, x, y + 0.06, z, 0.3, 0.1, wood);
    cyl(parent, x, y + 0.25, z, 0.055, 0.32, gold, 0.04, 20, 0.7);
    for (let i = 0; i < 3; i++) {
      const ring = mesh(
        new T.TorusGeometry(0.4 - i * 0.045, 0.014, 8, 64),
        gold,
        parent,
        x,
        y + 0.66,
        z,
        0.65,
      );
      ring.rotation.set(i === 0 ? 0.35 : Math.PI / 2, i * 1.1, i * 0.4);
    }
    mesh(new T.SphereGeometry(0.085, 24, 16), jade, parent, x, y + 0.66, z);
  }
  function easel(
    parent: T.Object3D,
    x: number,
    z: number,
    rotation: number,
    photoIndex: number,
  ) {
    const g = group(parent, x, z, rotation);
    for (const side of [-1, 1])
      line(
        g,
        [
          new T.Vector3(side * 0.57, 0.23, 0.12),
          new T.Vector3(side * 0.26, 2.55, -0.2),
        ],
        wood,
        0.035,
      );
    line(
      g,
      [new T.Vector3(0, 2.32, -0.2), new T.Vector3(0, 0.23, -0.87)],
      wood,
      0.038,
    );
    box(g, 0, 1.05, 0.04, 1.4, 0.09, 0.21, wood);
    box(g, 0, 1.74, -0.12, 1.23, 1.45, 0.09, gold);
    box(g, 0, 1.74, -0.06, 1.1, 1.32, 0.055, cream);
    const photo = personalContent.photos[photoIndex];
    if (photo) {
      const texture = new T.TextureLoader().load(photo.src);
      texture.colorSpace = T.SRGBColorSpace;
      const ratio = photo.width / photo.height;
      const w = Math.min(1.04, 1.26 * ratio),
        h = w / ratio;
      const print = new T.Mesh(
        new T.PlaneGeometry(w, h),
        new T.MeshStandardMaterial({ map: texture, roughness: 0.85 }),
      );
      print.position.set(0, 1.74, -0.027);
      g.add(print);
    }
  }

  function furnish(parent: T.Group, room: Room) {
    const compact = room.depth === 7,
      z = compact ? -1.6 : -1.85;
    const height = room.id === 'inspiration' ? 0.8 : 1.04;
    const seed = room.number.charCodeAt(1) * 13 + 5;
    const rugW = room.width - 1.7,
      rugD = room.depth - 1.4;
    const carpet = new T.Mesh(
      new T.PlaneGeometry(rugW, rugD),
      new T.MeshStandardMaterial({
        map: rugPattern(room.accent, rugW / rugD),
        roughness: 1,
      }),
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.236, -0.1);
    carpet.receiveShadow = true;
    parent.add(carpet);
    box(
      parent,
      0,
      0.225,
      -0.1,
      rugW,
      0.018,
      rugD,
      mix(room.accent, '#2f2a26', 0.55),
    );
    // Art above the collection object: a wide ink landscape flanked by bamboo scrolls.
    const backWall = -room.depth / 2 + 0.11;
    picture(parent, inkLandscape(seed, 2.1), 0, 3.02, backWall, 2.15, 1.02);
    for (const side of [-1, 1])
      hangingScroll(
        parent,
        inkBamboo(seed + side),
        side * 1.36,
        2.55,
        backWall,
        0.4,
        1.7,
        room.accent,
      );
    // Wainscot along the back wall, with a gilt rule at its top edge.
    box(parent, 0, 0.72, backWall + 0.01, room.width - 0.5, 1.02, 0.05, wood);
    box(parent, 0, 1.235, backWall + 0.02, room.width - 0.5, 0.03, 0.06, gold);
    // Lanterns hang from the beams, each lighting its own corner.
    const lanternZ = compact ? 0.9 : 1.2;
    for (const side of [-1, 1]) {
      lantern(parent, side * (room.width / 2 - 1.1), 3.28, lanternZ, 0.17);
      const light = new T.PointLight(
        mix(room.accent, '#ffd9a6', 0.8),
        4.5,
        6.5,
        2,
      );
      light.position.set(side * (room.width / 2 - 1.1), 3.0, lanternZ);
      parent.add(light);
    }
    table(parent, 0, z, room.id === 'research' ? 3.25 : 2.7, 1.35, height);
    chair(parent, 0, z - 1.12, 0, room.accent);
    for (const side of [-1, 1]) {
      const x = side * (room.width / 2 - 1.05);
      chair(
        parent,
        x,
        compact ? 1.0 : 1.65,
        (-side * Math.PI) / 2,
        room.accent,
      );
      const sideTable = table(
        parent,
        x,
        compact ? -0.2 : 0.3,
        0.83,
        0.78,
        0.82,
      );
      vase(sideTable, 0, 0.9, 0, 0.38, true);
    }
    // Low sideboards, floor porcelain, and screens frame the single focal object.
    const back = -room.depth / 2 + 0.63;
    for (const side of [-1, 1]) {
      const x = side * (room.width / 2 - 1.42);
      const isLibrary = room.id === 'research';
      const cabinetHeight = isLibrary ? 2.75 : 1.12;
      const c = cabinet(
        parent,
        x,
        back,
        isLibrary ? 2.35 : 1.7,
        cabinetHeight,
        isLibrary,
      );
      if (!isLibrary) {
        vase(c, -0.43, cabinetHeight + 0.3, 0, 0.52, side < 0);
        bookStack(c, 0.36, cabinetHeight + 0.3, 0.07, 3);
      }
      vase(
        parent,
        side * (room.width / 2 - 0.56),
        0.23,
        compact ? 2.15 : 2.8,
        0.9,
        true,
      );
    }
    if (room.id === 'work') {
      const bench = table(parent, -2.72, -0.95, 1.5, 0.85);
      const abacus = group(bench, 0, 0);
      abacus.position.y = 1.18;
      abacus.rotation.x = -0.2;
      for (const x of [-0.57, 0.57])
        box(abacus, x, 0.13, 0, 0.065, 0.36, 0.075, wood);
      for (const y of [-0.05, 0.3])
        box(abacus, 0, y, 0, 1.2, 0.06, 0.075, wood);
      for (let i = 0; i < 8; i++) {
        const x = -0.47 + i * 0.135;
        cyl(abacus, x, 0.12, 0, 0.007, 0.32, gold);
        for (let j = 0; j < 4; j++) {
          const bead = mesh(
            new T.SphereGeometry(0.042, 12, 8),
            '#694d3a',
            abacus,
            x,
            0.015 + j * 0.055,
            0,
          );
          bead.scale.y = 0.65;
        }
      }
      const stand = table(parent, 2.75, -0.95, 1.4, 0.85);
      armillary(stand, 0, 1.12, 0);
      bookStack(parent, -0.93, height + 0.09, z - 0.2, 3);
      brushes(parent, 1.04, height + 0.09, z - 0.15);
    } else if (room.id === 'writing') {
      screen(parent, -2.45, -1.35, 0.36, 21);
      brushes(parent, 0.94, height + 0.09, z - 0.23);
      box(parent, 0.92, height + 0.105, z + 0.22, 0.42, 0.04, 0.22, '#34403b');
      bookStack(parent, -0.97, height + 0.09, z, 2);
      for (let i = 0; i < 4; i++) {
        const roll = cyl(
          parent,
          2.32 + i * 0.11,
          1.48,
          back + 0.05,
          0.05,
          0.58,
          cream,
        );
        roll.rotation.z = 0.1 + i * 0.12;
      }
    } else if (room.id === 'research') {
      for (const side of [-1, 1])
        cabinet(
          parent,
          side * 5.42,
          -0.6,
          2.5,
          2.7,
          true,
          (-side * Math.PI) / 2,
        );
      armillary(parent, 1.05, height + 0.09, z - 0.15);
      bookStack(parent, -1.1, height + 0.09, z - 0.12, 4);
      const readingTable = table(parent, -3.65, -1.05, 1.8, 0.9);
      bookStack(readingTable, -0.35, 1.13, 0, 2);
      vase(readingTable, 0.52, 1.13, 0, 0.4, true);
    } else if (room.id === 'creative') {
      easel(parent, -2.55, -1.2, 0.32, 0);
      easel(parent, 2.55, -1.2, -0.32, 1);
      brushes(parent, 1.04, height + 0.09, z - 0.12);
      for (let i = 0; i < 4; i++)
        cyl(
          parent,
          -1.04 + i * 0.13,
          height + 0.17,
          z,
          0.05,
          0.16,
          bookColors[i],
          0.037,
        );
      const bench = table(parent, 2.95, 1.1, 1.65, 0.75, 0.54);
      box(bench, 0, 0.65, 0, 1.5, 0.12, 0.65, '#a48b9e');
    } else {
      teaSet(parent, 0.85, height + 0.09, z - 0.03);
      vase(parent, -1, height + 0.09, z - 0.18, 0.37, true);
      screen(parent, 2.5, -1.28, -0.38, 34);
      const teaCabinet = cabinet(
        parent,
        -3.4,
        -0.9,
        1.25,
        1.8,
        false,
        Math.PI / 2,
      );
      teaSet(teaCabinet, 0, 2.1, 0);
    }

    const object = new T.Group();
    const worldPoint = new T.Vector3(...room.object);
    parent.updateWorldMatrix(true, false);
    object.position.copy(parent.worldToLocal(worldPoint));
    object.rotation.x = -Math.PI * 0.29;
    object.userData.room = room.id;
    object.name = room.objectName;
    parent.add(object);
    // The display cradle supports the book or scroll above the desk.
    box(parent, 0, height + 0.13, z - 0.04, 1.48, 0.1, 0.68, wood);
    box(parent, 0, height + 0.29, z - 0.31, 1.28, 0.28, 0.08, wood);
    if (room.id === 'writing') {
      box(object, 0, 0, 0, 1.62, 0.95, 0.018, cream);
      for (const side of [-1, 1]) {
        const roller = cyl(object, 0, side * 0.5, 0.025, 0.055, 1.8, wood);
        roller.rotation.z = Math.PI / 2;
        for (const end of [-1, 1]) {
          const finial = cyl(
            object,
            end * 0.94,
            side * 0.5,
            0.025,
            0.065,
            0.08,
            gold,
          );
          finial.rotation.z = Math.PI / 2;
        }
      }
      const page = new T.Mesh(
        new T.PlaneGeometry(1.5, 0.87),
        new T.MeshStandardMaterial({
          map: sign(
            'Writing',
            'THE WRITING SCROLL',
            ['Essays & observations'],
            1.72,
          ),
          roughness: 0.92,
        }),
      );
      page.position.z = 0.013;
      object.add(page);
    } else {
      for (const side of [-1, 1]) {
        const page = new T.Group();
        page.position.x = side * 0.43;
        page.rotation.y = side * 0.1;
        object.add(page);
        box(page, 0, 0, -0.045, 0.88, 1.12, 0.05, room.accent);
        box(page, 0, 0, -0.004, 0.82, 1.05, 0.055, cream);
        for (const y of [-0.49, -0.47, 0.47, 0.49])
          box(page, 0, y, 0.004, 0.81, 0.006, 0.018, '#c7b897');
        const map = sign(
          side < 0 ? room.subject : 'Explore',
          side < 0 ? room.objectName.toUpperCase() : 'OPEN THE COLLECTION',
          side < 0
            ? []
            : [
                room.id === 'creative'
                  ? 'Photos, drawings & films'
                  : room.id === 'work'
                    ? 'Work & projects'
                    : room.id === 'research'
                      ? 'Papers & reading notes'
                      : 'Things worth sharing',
              ],
          0.79,
        );
        const paper = new T.Mesh(
          new T.PlaneGeometry(0.79, 1.01),
          new T.MeshStandardMaterial({ map, roughness: 0.9 }),
        );
        paper.position.z = 0.027;
        page.add(paper);
      }
      box(object, 0, -0.06, 0.055, 0.033, 1.2, 0.014, '#a94737');
    }
    return object;
  }
  function dispose() {
    textures.forEach((texture) => texture.dispose());
  }
  return { furnish, coffer, dispose };
}
