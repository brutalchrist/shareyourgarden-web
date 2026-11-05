# ShareYourGarden Web

Web frontend for ShareYourGarden, built with Next.js, Tailwind CSS, shadcn/ui and MapLibre GL (with OpenFreeMap tiles).

## Setup

```bash
pnpm install
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` points to the ShareYourGarden backend (defaults to `http://localhost:1337`).

The map opens on the visitor's city, from their IP address, through a Netlify Edge Function (`netlify/edge-functions/geo.ts`, served at `/api/geo`). Locally there is no such endpoint and the map starts where it was last left, or on the whole world, unless `NEXT_PUBLIC_DEV_CENTER` sets a `lat,lng` to stand in for it. `netlify dev` runs the function too.

## Scripts

- `pnpm dev`: start the dev server at `http://localhost:3000`
- `pnpm build`: production build
- `pnpm lint` / `pnpm typecheck` / `pnpm format`
