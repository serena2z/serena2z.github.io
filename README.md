# Serena — A place to wander

A full-screen Chinese period-drama landscape in Three.js. Visitors arrive at eye level on a stone bridge over a jade lake, look around in 360 degrees, walk freely through the garden, enter furnished rooms, and open each collection by clicking its central book or scroll. The garden is lit by bright summer sunshine, with beds of pink, cream, and lilac flowers. Aerial mode reveals the estate and provides room destinations. The interface stays at the edges of the landscape as a single family of soft cream pill buttons; there is no compass or motion-pause control.

## Getting started

Requires Node.js 22.13 or newer. Install the locked dependencies with `npm ci`, then run `npm run dev -- --port 3002` and open http://localhost:3002.

- `npm test` runs the navigation, scrolling, roof geometry, batching, rendering budget, and water material regression checks.
- `npm run typecheck` checks TypeScript.
- `npm run lint` checks the source.
- `npm run build` exports the complete static website to `dist/client` for GitHub Pages. `npm start` serves the generated production build locally.

## Exploring

- Hold ↑ / ↓ to walk forward and backward, and ← / → to turn. W / S are equivalent forward/backward shortcuts. Walking speed is 4 world units per second. Movement follows the current viewing direction, keeps your camera orientation, and respects walls, furnishings, the pond, and the shoreline.
- Drag to look around; scroll to look up and down. The + / − controls and pinching zoom without changing viewing modes.
- Use the Day / Night button for sunny daylight or a moonlit sky with stars and warm silk lanterns. The transition reuses the existing lights and shadow map.
- Press M or use “View from above” to see the whole estate. Returning restores the exact walking position and viewing direction.
- Floating blossom petals are decorative and never block movement. They share one instanced draw, including the blossom that starts just ahead of the entrance bridge.
- Ground markers are optional guided routes from the current position. Pressing a movement key cancels the route immediately. Room selections use a brief 0.4-second fade directly to the room, facing its central book or scroll. Reduced-motion mode arrives instantly.
- Click a room's central glowing book or scroll, or press Enter, to open its collection. Opening from a doorway uses the same quick room transition. The Rooms directory provides direct collection access and a “Visit room” option.
- Escape closes a reading panel. Navigation landmarks use `#at/…` links and browser history; free walking updates the current landmark without adding a history entry for every step.
- Motion respects the system reduced-motion preference. If 3D is unavailable, the Rooms directory opens every collection directly.

## Rooms and content

`lib/landscape-config.ts` contains the five rooms, names, positions, entrances, and connected walking viewpoints. The workroom holds work & code, the writing pavilion holds essays, the library holds research, the gallery holds creative work, and the tea house holds things from others.

`lib/personal-content.ts` contains projects, essays, papers, photographs, drawings, videos, and shared links. Add original photos under `public/photos`; include their path, title, alt text, and pixel width and height in the photos collection. Optional location and year appear in the gallery. Drawings include dimensions; videos include a WebVTT captions path. Photos open at their original aspect ratio.

The confirmed initial content is Serena’s engineering affiliation at Phylo, this website, and the reference video she shared. Personal writing, research, and photography collections remain empty until supplied. The generated environment artwork is scenery, never presented as Serena’s photography.

## Furnished interiors and flowers

Painted ceiling panels sit 3.5 cm below their wooden backing to prevent depth flicker. Lanterns share silk, brass, ribs, tassels, and glow materials; their light comes from the existing room fixtures, so nighttime adds no point lights or shadow passes.

`lib/landscape-interiors.ts` gives every room a central reading desk and a distinct collection object. Each room is also decorated with canvas-painted textures generated in the browser: a framed ink-wash landscape and two bamboo hanging scrolls above the collection object, a woven rug with a key-fret border and lotus medallion in the room's accent color, ink-painted folding screens, wood wainscoting with a gilt rule, and two hanging lanterns with warm point lights. The ceiling is a painted coffer grid (`coffer` in the same module) framed by beams in `lib/landscape-world.ts`. All of this artwork is generated scenery, not Serena's own work. The workroom has an abacus and brass armillary, the writing pavilion has brushes and rolled papers, the library has full bookcases and reading tables, the gallery has easels and art supplies, and the tea house has tea service and a folding screen. Carved chairs, bordered rugs, cabinets, book stacks, porcelain, and flower arrangements fill the surrounding space. Gallery easels display the first two supplied photos at their correct proportions; until then their canvases remain blank.

Object positions, names, and action labels live with each room in `lib/landscape-config.ts`; `roomAt` resolves the room a visitor is inside of or standing at the doorway of. Only the central object opens the collection. Each one carries a warm reading-lamp glow (an additive sprite and a small point light) that brightens on hover. Hovering other furniture keeps the look-around cursor.

Collection dialogs use simple note-style pages with plain headings, readable paragraphs, underlined links, and named navigation between the five collections. Each page scrolls independently and returns to the same room when closed. Photographs preserve their original proportions and open full size; drawings and captioned videos appear alongside plain captions. Empty collections display a short note. The Rooms directory uses a simple list of subjects and a separate “Visit room” option. Inter is used for the reading pages; the landscape retains Cormorant Garamond and Inter, imported from Google Fonts at the top of `app/landscape.css`.

`lib/landscape-flowers.ts` adds layered petal flowers, stems, and leaves in the grassy spaces and indoor vases. Planting excludes buildings, the pond, and walking routes. Indoor arrangements and outdoor flowers share six instanced batches to limit the added rendering cost.

## Palace architecture and garden paths

The buildings and streets are inspired by the [Summer Palace](https://whc.unesco.org/en/list/880/) rather than a literal reconstruction. The architecture combines green glazed roofs, an amber double roof on the main hall, lacquered vermilion columns, painted beams, layered brackets, lattice windows, and raised porches. Three covered promenades connect the garden and rooms; individual pale stone pavers, circular landings, planting beds, and a stone pond terrace define the outdoor space. The eastern waypoint is moved slightly outward to keep the widened path clear of the pond.

`lib/palace-architecture.ts` models the porches, columns, decorated beams, lattice, railings, walks, and garden borders. Shared geometric primitives live in `lib/landscape-geometry.ts`. The original lotus frieze at `public/materials/palace/painted-frieze.png` (served as a smaller WebP copy) was generated once with the built-in image generation tool at 2172 × 724. Its exact prompt is recorded in `assets/references/palace-frieze.json`.

## Realistic rendering and assets

The landscape uses photographed color, normal, and roughness maps on rounded timber, plaster, paving, bark, and forest ground. Roofs have curved, overlapping barrel tiles and exposed rafters. Trees use branched trunks and instanced leaves and blossoms rather than polygonal crowns. The lake reflects the actual scene. AgX tone mapping, environment lighting, contact shading, high-resolution shadows, and multisample antialiasing finish the image.

The background uses Three.js's analytic daylight sky, which stays sharp at any zoom. `lib/landscape-terrain.ts` supplies a continuous green shoreline and rolling hills with denser geometry around the estate. The same modeled landscape is visible from the path and from above. Twelve additional trees soften the garden's edges. The aerial camera frames the estate more closely, scales its distance for portrait screens, and limits low viewing angles that obscure the rooms. The lake has a brighter jade base and subtle sun glints.

The compact `public/environment/sunny-lake-light.hdr` from [Lakeside](https://polyhaven.com/a/lakeside), by Greg Zaal (CC0), provides natural surface lighting. The photographic panoramas that were previously archived in `public/environment` have been removed, since they were no longer loaded as scenery; their sources remain recorded in `assets/references`.

The timber, stone, plaster, and bark materials are from Poly Haven and licensed [CC0](https://polyhaven.com/license):

- `wood`: [Wood Planks](https://polyhaven.com/a/wood_planks), by Amal Kumar.
- `stone`: [Floor Tiles 04](https://polyhaven.com/a/floor_tiles_04), by Rob Tuytel.
- `plaster`: [White Plaster Rough 01](https://polyhaven.com/a/white_plaster_rough_01), by Rob Tuytel.
- `bark`: [Chinese Cedar Bark](https://polyhaven.com/a/chinese_cedar_bark).

These material sets include 1024 × 1024 color, OpenGL normal, and roughness maps, with texture filtering for close-up and angled views. The ground now uses 2048 × 2048 [ambientCG Grass005](https://ambientcg.com/a/Grass005), licensed [CC0](https://docs.ambientcg.com/license/), in `public/materials/grass`. A three-metre visual tile scale keeps individual blades in proportion; the provider does not specify a physical scale. Its verified source and package hashes are recorded in `assets/references/grass-sources.json`. The old brown forest-floor material has been removed; its source is still recorded in `assets/references/ground-bark-sources.json`. These are scenery assets, not Serena’s personal photographs.

An early generated concept panorama was not used and has been deleted; its exact generation prompt, original asset paths, source URLs, dimensions, and licensing details remain recorded in `assets/references/scenery-sources.json` and `assets/references/ground-bark-sources.json`.

## Rendering and performance

Scenery textures are served as WebP copies at the same dimensions as the originals. The 16 images total 7.73 MB instead of 19.35 MB, a 60% reduction; the HDR lighting file is unchanged. The original JPG/PNG files are retained, and encoding settings, dimensions, sizes, and hashes are recorded in `assets/references/web-textures.json`. Grass color and the painted frieze start downloading from the initial HTML, before scene initialization.

The loading screen reports actual asset completion, then switches to “Opening the garden” during scene preparation. The Rooms directory can open the portfolio notes immediately while the 3D garden is still loading.

Static geometry is batched by material and location, with vertex indices preserved. This allows rooms outside the camera view to be culled and avoids duplicating vertices. Lantern components are batched within each moving lantern; collection objects remain individually clickable. Empty construction groups are pruned and static transforms are cached.

The current estate's geometry buffers use approximately 60 MB, down from 158 MB before these optimizations, with the same modeled triangle count. This is geometry storage, not total browser memory or a measured frame-rate guarantee.

- The fixed sun uses a cached 2048-pixel shadow map rather than rebuilding a 4096-pixel map every frame. Small swaying decorations retain their initial shadow pose.
- Reflections use a 1024-pixel buffer, update at most about 15 times per second while moving, and more slowly for idle scenery.
- Display buffers are capped at 2.5 million pixels and a 1.5 device-pixel ratio. Multisample edge smoothing stays enabled. Sustained slow interaction automatically lowers resolution in bounded steps.
- Contact shading runs at half the display-buffer resolution.
- Interaction targets 30 frames per second; idle scenery runs at 12. Hidden tabs and open reading/menu dialogs skip scene rendering. A paused, unchanged view does not redraw.

The daylight scene and full room contents remain intact. Actual speed depends on the visitor's device and viewport; browser GPU profiling is still useful before a public launch.

## Repository and publishing

Source lives at [serena2z/serena2z.github.io](https://github.com/serena2z/serena2z.github.io). The public website is [serena2z.github.io](https://serena2z.github.io/).

Pushing to `main` runs `.github/workflows/pages.yml`: install the locked dependencies, check types and lint, run the regression tests, build the static export, and publish only `dist/client` to GitHub Pages. The workflow can also be run manually from the repository’s Actions tab. GitHub Pages uses GitHub Actions as its publishing source. No server or runtime secrets are needed for the website.

The repository includes site source, the dependency lockfile, tests, public scenery assets, and their attribution records. Generated builds, dependencies, TypeScript caches, local environment files, and local preview state are ignored. The previous website remains in Git history, and its `gh-pages` branch is preserved.
