# ShareYourGarden Web

Web frontend for ShareYourGarden, built with Next.js, Tailwind CSS, shadcn/ui and Leaflet.

## Setup

```bash
pnpm install
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` points to the ShareYourGarden backend (defaults to `http://localhost:1337`).

## Scripts

- `pnpm dev`: start the dev server at `http://localhost:3000`
- `pnpm build`: production build
- `pnpm lint` / `pnpm typecheck` / `pnpm format`
