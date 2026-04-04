# sand-box

Interactive falling sand simulation built with TypeScript and the Canvas API. Click or drag to drop sand grains and watch them pile up with simple physics.

[Live demo](https://akli.dev/apps/sand-box)

## How it works

A grid-based particle simulation where each cell is either empty or sand. On each frame:

1. Sand falls straight down if the cell below is empty
2. If blocked, it slides diagonally (randomised left/right)
3. It comes to rest on the floor or other sand

The engine only processes the active region of the grid, so it sleeps when nothing is moving.

## Stack

- TypeScript
- Canvas 2D (300x400px, 6px cell size, pixelated rendering)
- Vite 5
- pnpm

## Getting started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server |
| `pnpm build` | TypeScript compile + Vite build |
| `pnpm preview` | Preview production build |

## Deployment

Deployed to AWS S3 at `/apps/sand-box/` under the same CloudFront distribution as [akli.dev](https://akli.dev). CI/CD runs via GitHub Actions on push to `main`.
