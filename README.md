# ShareYourGarden Web

Web frontend for ShareYourGarden, built with Next.js, Tailwind CSS, shadcn/ui and MapLibre GL (with OpenFreeMap tiles).

## Setup

```bash
pnpm install
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` points to the ShareYourGarden backend (defaults to `http://localhost:1337`).

The map opens on the visitor's city, from their IP address, through a Netlify Edge Function (`netlify/edge-functions/geo.ts`, served at `/api/geo`). Locally there is no such endpoint and the map starts where it was last left, or on the whole world, unless `NEXT_PUBLIC_DEV_CENTER` sets a `lat,lng` to stand in for it. `netlify dev` runs the function too.

## Analytics

The beta feedback and contact links write to `NEXT_PUBLIC_FEEDBACK_EMAIL`, set as a variable of the `production` environment on GitHub (read by `.github/workflows/deploy.yml`) so the address stays out of this repository. Without it, those links are left out.

Product analytics go to [PostHog](https://posthog.com) (US Cloud), and are off unless `NEXT_PUBLIC_POSTHOG_KEY` holds the project's API key. That key is not secret: it ships in the page's JavaScript. Set it in Netlify's environment variables.

- **Setup:** `instrumentation-client.ts` sets PostHog up. Events go through Netlify to `/ingest` (`public/_redirects`), so ad blockers don't drop them.
- **Events:** `lib/analytics.ts` lists the app's own events and their properties. Add new ones there, and send them with `track()`.
- **Consent:** a banner asks for consent (`components/analytics.tsx`). Accepting measures with cookies; rejecting, or not answering yet, measures anonymously without cookies or storage. Signed-in users who accept are identified by their internal id, never their email.
- **Required in PostHog's project settings:** turn on **cookieless mode**, or PostHog drops the anonymous events.
- **Privacy:** session recordings mask what users type. Private text on screen (conversations, the owner's garden location, the account menu) is blocked with the `ph-no-capture` class. Keep it on any new screen that shows private data.

## Scripts

- `pnpm dev`: start the dev server at `http://localhost:3000`
- `pnpm build`: production build
- `pnpm lint` / `pnpm typecheck` / `pnpm format`

## Deploys

Netlify builds a deploy preview for every pull request, but it no longer publishes `master` on its own (`[context.production]` in `netlify.toml`). Production changes only with a release tag:

```bash
git switch master && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

The tag runs `.github/workflows/deploy.yml`, which checks that the tagged commit is on `master`, builds it with Netlify's production environment variables and publishes it. Tags follow [Semantic Versioning](https://semver.org) with a `v` prefix (the old `20.x` tags are from the 2020 version of the site).

- **Going back:** in Netlify, open an earlier deploy (each is named after its tag) and choose **Publish deploy**. Or run the **Deploy** workflow by hand with an earlier tag.
- **Required in GitHub:** the `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) and `NETLIFY_SITE_ID` secrets, in the `production` environment or the repository.
- **Required in Netlify:** keep **auto publishing** on. A locked production deploy makes the workflow fail.
