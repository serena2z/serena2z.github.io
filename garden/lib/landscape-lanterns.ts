import * as T from 'three';

/** Shared silk, brass, ribs, and glow keep the richer lanterns inexpensive to draw. */
export function createLanterns() {
  const silk = new T.MeshStandardMaterial({
    color: '#e9b387',
    emissive: '#ffad55',
    emissiveIntensity: 0.08,
    roughness: 0.72,
  });
  const brass = new T.MeshStandardMaterial({
    color: '#bd9452',
    metalness: 0.55,
    roughness: 0.4,
  });
  const ribMaterial = new T.MeshStandardMaterial({
    color: '#976334',
    metalness: 0.2,
    roughness: 0.58,
  });
  const thread = new T.MeshStandardMaterial({
    color: '#a74034',
    roughness: 0.88,
  });
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) {
      const r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5),
        i = (y * 32 + x) * 4;
      pixels.set(
        [
          255,
          199,
          125,
          Math.round(
            120 *
              Math.exp(-r * r * 4) *
              (1 - T.MathUtils.smoothstep(r, 0.55, 1)),
          ),
        ],
        i,
      );
    }
  const glowTexture = new T.DataTexture(pixels, 32, 32);
  glowTexture.colorSpace = T.SRGBColorSpace;
  glowTexture.magFilter = glowTexture.minFilter = T.LinearFilter;
  glowTexture.needsUpdate = true;
  const glowMaterial = new T.SpriteMaterial({
    map: glowTexture,
    transparent: true,
    opacity: 0,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  const body = new T.SphereGeometry(1, 32, 16);
  body.scale(1, 1.22, 1);
  const cap = new T.CylinderGeometry(0.5, 0.63, 0.15, 20);
  const hanger = new T.TorusGeometry(0.13, 0.025, 6, 20);
  const cord = new T.CylinderGeometry(0.022, 0.022, 0.3, 6);
  const tassel = new T.CylinderGeometry(0.055, 0.028, 0.55, 6);
  const bead = new T.SphereGeometry(0.08, 8, 6);
  const ribs = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    const points = Array.from({ length: 13 }, (_, j) => {
      const t = Math.PI * (0.1 + (j / 12) * 0.8);
      return new T.Vector3(
        Math.sin(t) * Math.cos(a) * 1.028,
        Math.cos(t) * 1.24,
        Math.sin(t) * Math.sin(a) * 1.028,
      );
    });
    return new T.TubeGeometry(
      new T.CatmullRomCurve3(points),
      12,
      0.018,
      4,
      false,
    );
  });
  const groups: T.Group[] = [];
  const glows: T.Sprite[] = [];
  function add(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    size = 0.13,
  ) {
    const group = new T.Group();
    group.name = 'Silk lantern with brass ribs and tassels';
    group.position.set(x, y, z);
    group.scale.setScalar(size);
    parent.add(group);
    groups.push(group);
    function part(
      geometry: T.BufferGeometry,
      material: T.Material,
      height = 0,
    ) {
      const mesh = new T.Mesh(geometry, material);
      mesh.position.y = height;
      mesh.castShadow = material !== silk;
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    }
    part(body, silk);
    part(cap, brass, 1.13);
    part(cap, brass, -1.13).rotation.z = Math.PI;
    part(hanger, brass, 1.43);
    part(cord, brass, 1.66);
    for (const rib of ribs) part(rib, ribMaterial);
    part(bead, brass, -1.34);
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const silkThread = part(tassel, thread, -1.65);
      silkThread.position.x = Math.cos(angle) * 0.1;
      silkThread.position.z = Math.sin(angle) * 0.1;
    }
    const glow = new T.Sprite(glowMaterial);
    glow.scale.setScalar(4.8);
    glow.visible = false;
    glows.push(glow);
    group.add(glow);
    return group;
  }
  function setNight(amount: number) {
    silk.emissiveIntensity = T.MathUtils.lerp(0.08, 2.8, amount);
    glowMaterial.opacity = amount * 0.85;
    for (const glow of glows) glow.visible = amount > 0;
  }
  function dispose() {
    glowTexture.dispose();
  }
  return { add, groups, setNight, dispose };
}
