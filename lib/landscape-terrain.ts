import * as T from 'three';
import type { LandscapeSurfaces } from './landscape-materials';

// A single continuous shore makes ground-level and aerial views share the same world.
export function shoreLine(x: number) {
  return 14 + Math.cos(x * 0.1) * 2 - Math.exp(-((x / 9) ** 2)) * 8.2;
}

export function terrainHeight(x: number, z: number) {
  const inland = shoreLine(x) - z;
  const shore = -0.08 - 3.8 * (1 - T.MathUtils.smoothstep(inland, -12, 2));
  const garden = T.MathUtils.smoothstep(Math.hypot(x, z + 4), 32, 76);
  const coast = T.MathUtils.smoothstep(inland, 7, 48);
  const hills = [
    [-76, -83, 18, 53, 44],
    [85, -93, 23, 58, 48],
    [-174, -182, 72, 77, 65],
    [-66, -246, 87, 73, 63],
    [65, -245, 70, 64, 70],
    [189, -179, 81, 81, 61],
    [-295, -215, 70, 85, 83],
    [308, -273, 85, 95, 82],
  ];
  let height = 0;
  for (const [cx, cz, peak, rx, rz] of hills)
    height += peak * Math.exp(-(((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2));
  const rolls = 1.6 + Math.sin(x * 0.067) * Math.cos(z * 0.056) * 1.2;
  return shore + garden * coast * (height + rolls);
}

export function createTerrain(surfaces: LandscapeSurfaces) {
  function coordinates(
    min: number,
    max: number,
    nearMin: number,
    nearMax: number,
  ) {
    const values: number[] = [];
    for (let n = min; n < max; n += n >= nearMin && n < nearMax ? 1 : 7.5)
      values.push(n);
    values.push(max);
    return values;
  }
  const xs = coordinates(-600, 600, -80, 80),
    zs = coordinates(-830, 270, -70, 35);
  const geometry = new T.PlaneGeometry(1, 1, xs.length - 1, zs.length - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3),
    uvs = new Float32Array(positions.count * 2);
  const grass = new T.Color('#c4d69d'),
    sand = new T.Color('#e8d9b5'),
    color = new T.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = xs[i % xs.length],
      z = zs[Math.floor(i / xs.length)],
      y = terrainHeight(x, z);
    positions.setXYZ(i, x, y, z);
    const inland = shoreLine(x) - z;
    color.copy(sand).lerp(grass, T.MathUtils.smoothstep(inland, 0, 3));
    const variation = 0.94 + 0.06 * Math.sin(x * 0.07) * Math.cos(z * 0.065);
    color.multiplyScalar(variation).toArray(colors, i * 3);
    uvs[i * 2] = x / 3;
    uvs[i * 2 + 1] = z / 3;
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new T.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  const terrain = new T.Mesh(
    geometry,
    new T.MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      map: surfaces.ground.color,
      normalMap: surfaces.ground.normal,
      roughnessMap: surfaces.ground.roughness,
      normalScale: new T.Vector2(0.24, 0.24),
      roughness: 0.9,
    }),
  );
  terrain.name = 'Continuous garden shoreline and green hills';
  terrain.receiveShadow = true;
  // The terrain never casts a large artificial shadow over the estate.
  terrain.castShadow = false;
  return terrain;
}
