<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI components

This project uses [shadcn/ui](https://ui.shadcn.com) on Base UI (`components.json`). Before writing or changing UI under `components/` or `app/`, load the `shadcn` skill in `.claude/skills/` and follow its rules:

- Use the installed components in `components/ui/` before writing custom markup: `Item` for rows and cards, `Badge` for labels, `Alert` for notices, `Empty` for empty states.
- Add a missing component with the shadcn CLI (`pnpm dlx shadcn@latest add <component>`), not by hand.
- Use the components' variants and sizes, and semantic color tokens such as `text-muted-foreground` or `bg-brand`. No raw colors like `amber-500` and no `dark:` overrides.

## Commits, branches and pull requests

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`. Pull requests are squash-merged, so the title becomes the commit on `master`.

- **Types**: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `style`, `build`, `ci`, `chore`.
- **Scope** (optional): the area changed, such as `map`, `gardens`, `messages`, `pwa` or `header`.
- **Summary**: imperative, lowercase, no final period, e.g. `feat(map): open the map where the visitor is`.
- Breaking changes add `!` after the type or scope and a `BREAKING CHANGE:` footer.

Branch names start with the same type: `type/short-summary`, in lowercase kebab-case, e.g. `feat/garden-form-steps`, `fix/map-initial-view` or `style/heading-font`.
