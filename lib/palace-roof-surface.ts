import {
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  Vector3,
} from 'three';

export function roofPoint(
  side: number,
  t: number,
  u: number,
  width: number,
  depth: number,
  height: number,
) {
  const ridge = Math.max(width * 0.24, (width - depth) * 0.5);
  const span = ridge + (width * 0.5 - ridge) * t;
  const slope =
    height * Math.pow(1 - t, 1.65) +
    0.14 * Math.pow(t, 7) +
    0.3 * Math.pow(Math.abs(u), 7) * Math.pow(t, 5);
  const panelWidth = side % 2 === 0 ? width : depth;
  const tiles = Math.ceil(panelWidth / 0.24);
  // Tile channels meet a smooth ridge instead of folding into overlapping slivers at its ends.
  const corrugation =
    Math.pow(Math.sin((u + 1) * 0.5 * tiles * Math.PI), 2) *
    0.034 *
    MathUtils.smoothstep(t, 0, 0.16);
  const y = slope + corrugation;
  switch (side) {
    case 0:
      return new Vector3(u * span, y, -depth * 0.5 * t);
    case 1:
      return new Vector3(span, y, u * depth * 0.5 * t);
    case 2:
      return new Vector3(-u * span, y, depth * 0.5 * t);
    default:
      return new Vector3(-span, y, -u * depth * 0.5 * t);
  }
}

export function createRoofPanel(
  side: number,
  width: number,
  depth: number,
  height: number,
) {
  const panelWidth = side % 2 === 0 ? width : depth;
  const across = Math.ceil(panelWidth / 0.24) * 6,
    down = 30;
  const vertices: number[] = [],
    indices: number[] = [],
    uv: number[] = [];
  for (let j = 0; j <= down; j++)
    for (let k = 0; k <= across; k++) {
      const t = j / down,
        u = (k / across) * 2 - 1;
      const p = roofPoint(side, t, u, width, depth, height);
      vertices.push(p.x, p.y, p.z);
      uv.push(u * panelWidth * 0.4, t * panelWidth * 0.4);
    }
  for (let j = 0; j < down; j++)
    for (let k = 0; k < across; k++) {
      const a = j * (across + 1) + k;
      // Outward winding keeps lighting and shadow bias on the upper side of the roof.
      // The triangular hips start at one point, so their first row has one triangle per cell.
      if (side % 2 === 0 || j > 0) indices.push(a, a + 1, a + across + 1);
      indices.push(a + 1, a + across + 2, a + across + 1);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
