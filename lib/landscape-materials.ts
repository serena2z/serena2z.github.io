import * as T from 'three';

export type SurfaceMaps = {
  color: T.Texture;
  normal: T.Texture;
  roughness: T.Texture;
};
export type LandscapeSurfaces = Record<
  'wood' | 'stone' | 'plaster' | 'ground' | 'bark',
  SurfaceMaps
>;

export async function loadLandscapeSurfaces(
  anisotropy: number,
  manager: T.LoadingManager,
) {
  const loader = new T.TextureLoader(manager);
  async function surface(name: keyof LandscapeSurfaces): Promise<SurfaceMaps> {
    const folder = name === 'ground' ? 'grass' : name;
    const [color, normal, roughness] = await Promise.all(
      ['color', 'normal', 'roughness'].map((channel) =>
        loader.loadAsync(`/materials/${folder}/${channel}.webp`),
      ),
    );
    color.colorSpace = T.SRGBColorSpace;
    for (const texture of [color, normal, roughness]) {
      texture.wrapS = texture.wrapT = T.RepeatWrapping;
      texture.anisotropy = anisotropy;
    }
    return { color, normal, roughness };
  }
  const [wood, stone, plaster, ground, bark] = await Promise.all([
    surface('wood'),
    surface('stone'),
    surface('plaster'),
    surface('ground'),
    surface('bark'),
  ]);
  return { wood, stone, plaster, ground, bark };
}

const surfaceColors: Record<string, keyof LandscapeSurfaces> = {};
for (const color of [
  '#604238',
  '#873f37',
  '#665039',
  '#8b7054',
  '#705940',
  '#805f46',
  '#694d3a',
])
  surfaceColors[color] = 'wood';
for (const color of [
  '#c0b7a0',
  '#b9b49d',
  '#c0b9a4',
  '#bcb29a',
  '#afa88e',
  '#929c86',
  '#969b88',
  '#657267',
  '#a7996f',
  '#3e625b',
  '#7e9383',
])
  surfaceColors[color] = 'stone';
for (const color of [
  '#e4dbc3',
  '#d9cfb8',
  '#d6cbb2',
  '#d8ceb6',
  '#d8ceb5',
  '#d2c9b2',
])
  surfaceColors[color] = 'plaster';

surfaceColors['#71826b'] = 'ground';
surfaceColors['#795a44'] = 'bark';

const lacquer = new Set(['#a94737', '#275c4d', '#1f4358']);
const dressedStone = new Set(['#ded8c8', '#e5dfcf', '#cfc9b9', '#f0e8d7']);
const glazedTiles = new Set(['#376758', '#b8954e']);
const porcelain = '#e6e6d5';

export function createMaterialPalette(surfaces: LandscapeSurfaces) {
  const materials = new Map<string, T.MeshStandardMaterial>();
  return (color: string, metal = 0, glow = false) => {
    const key = `${color}/${metal}/${glow}`;
    let result = materials.get(key);
    if (
      !result &&
      (lacquer.has(color) ||
        dressedStone.has(color) ||
        glazedTiles.has(color) ||
        color === porcelain)
    ) {
      const stone = dressedStone.has(color),
        tile = glazedTiles.has(color),
        ceramic = color === porcelain;
      result = new T.MeshPhysicalMaterial({
        color,
        roughness: stone ? 0.82 : ceramic ? 0.22 : tile ? 0.34 : 0.42,
        metalness: 0,
        clearcoat: stone ? 0 : ceramic ? 0.7 : tile ? 0.45 : 0.25,
        clearcoatRoughness: 0.38,
        normalMap: ceramic
          ? null
          : stone || tile
            ? surfaces.stone.normal
            : surfaces.wood.normal,
        normalScale: new T.Vector2(stone ? 0.14 : 0.045, stone ? 0.14 : 0.045),
      });
      materials.set(key, result);
    }
    if (!result) {
      const kind = surfaceColors[color];
      const maps = kind && !metal && !glow ? surfaces[kind] : null;
      const tint = new T.Color(color);
      if (maps)
        tint.lerp(
          new T.Color('#ffffff'),
          kind === 'plaster' || kind === 'ground'
            ? 0.88
            : kind === 'wood' || kind === 'bark'
              ? 0.34
              : 0.52,
        );
      if (color === '#3e625b' || color === '#7e9383') tint.set('#424d4b');
      result = new T.MeshStandardMaterial({
        color: tint,
        roughness: metal ? 0.32 : kind === 'wood' ? 0.68 : 0.91,
        metalness: metal,
        ...(maps
          ? {
              map: kind === 'plaster' ? null : maps.color,
              normalMap: maps.normal,
              roughnessMap: maps.roughness,
              normalScale: new T.Vector2(
                kind === 'plaster' ? 0.28 : 0.55,
                kind === 'plaster' ? 0.28 : 0.55,
              ),
            }
          : {}),
        ...(glow ? { emissive: color, emissiveIntensity: 0.65 } : {}),
      });
      materials.set(key, result);
    }
    return result;
  };
}

// Keep texture grain at a consistent physical size on both furniture and buildings.
export function architecturalUVs(geometry: T.BufferGeometry) {
  const p = geometry.getAttribute('position'),
    n = geometry.getAttribute('normal');
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)),
      ny = Math.abs(n.getY(i)),
      nz = Math.abs(n.getZ(i));
    uv[i * 2] = (nx > ny && nx > nz ? p.getZ(i) : p.getX(i)) * 0.65;
    uv[i * 2 + 1] = (ny > nx && ny > nz ? p.getZ(i) : p.getY(i)) * 0.65;
  }
  geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
  return geometry;
}
