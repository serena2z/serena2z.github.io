# serena2z.github.io

My personal website, set like a paper.

`site/` is the whole website: plain HTML, CSS, and JS, with no build step. To add work, research, or writing, edit `site/index.html`. Each section has a comment showing how to add an entry.

## Preview locally

```sh
cd site && python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing

Every push to `main` publishes `site/` to GitHub Pages (`.github/workflows/pages.yml`).
