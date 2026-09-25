# serena2z.github.io

My personal website, set like a paper.

- **`site/`** is the live website. It's plain HTML, CSS, and JS, so there's no build step. Edit `site/index.html` to add work, research, or writing. Each section has a comment showing how to add an entry.
- **`garden/`** is the archived 3D garden (Three.js + vinext). To run it locally: `cd garden && npm ci && npm run dev`. See `garden/README.md`.

## Preview locally

```sh
cd site && python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing

Every push to `main` publishes `site/` to GitHub Pages (`.github/workflows/pages.yml`).
