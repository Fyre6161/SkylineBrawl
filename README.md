# Skyline Brawl

A fast-paced 2D Smash-style platform fighter built with React, TypeScript, Tailwind CSS, Canvas2D, and WebRTC P2P online multiplayer.

## Folder Layout for GitHub Pages (`github.io`)

- `docs/` — Pre-built static site (`index.html`, `.nojekyll`, and `assets/`) formatted to run directly on GitHub Pages with zero build step.
- `src/` — Source code for the game engine, fighters, dynamic stages, netcode, and UI.
- `.github/workflows/deploy.yml` — Optional GitHub Actions workflow that automatically rebuilds and publishes on every push to `main`.

## Run on `github.io`

1. Upload this repository to GitHub.
2. Open **Settings → Pages** in your repository.
3. Choose either:
   - **Deploy from a branch** → Branch `main` → Folder **`/docs`** (instant static hosting from the `docs/` folder), **or**
   - **GitHub Actions** (auto-builds from `src/` on every push to `main`).

## Local Development

```bash
npm install
npm run dev
```

To rebuild both `dist/` and `docs/` after editing source files:

```bash
npm run build
```
