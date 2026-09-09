import * as T from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { architecturalUVs } from './landscape-materials';
import type { BufferGeometry, Material, Object3D } from 'three';

export type MaterialFactory = (
  color: string,
  metal?: number,
  glow?: boolean,
) => T.MeshStandardMaterial;

export function createGeometryTools(material: MaterialFactory) {
  function mesh(
    geo: BufferGeometry,
    color: string,
    parent: Object3D,
    x = 0,
    y = 0,
    z = 0,
    metal = 0,
    glow = false,
  ) {
    const m = new T.Mesh<BufferGeometry, Material>(
      geo,
      material(color, metal, glow),
    );
    m.position.set(x, y, z);
    m.castShadow = !glow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    p: Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    c: string,
    m = 0,
  ) {
    const radius = Math.min(w, h, d) * 0.12;
    const geometry =
      radius > 0.006
        ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, 0.035))
        : new T.BoxGeometry(w, h, d);
    return mesh(architecturalUVs(geometry), c, p, x, y, z, m);
  }
  function cyl(
    p: Object3D,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    c: string,
    top = r,
    n = 20,
    m = 0,
  ) {
    return mesh(
      new T.CylinderGeometry(top, r, h, Math.max(n, 20)),
      c,
      p,
      x,
      y,
      z,
      m,
    );
  }
  function line(
    p: Object3D,
    points: InstanceType<typeof T.Vector3>[],
    c: string,
    r = 0.018,
  ) {
    return mesh(
      new T.TubeGeometry(new T.CatmullRomCurve3(points), 24, r, 8, false),
      c,
      p,
    );
  }
  return { mesh, box, cyl, line };
}
