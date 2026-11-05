<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commits and pull requests

Commit messages and pull request titles follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`. Pull requests are squash-merged, so the title becomes the commit on `master`.

- **Types**: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `style`, `build`, `ci`, `chore`.
- **Scope** (optional): the area changed, such as `map`, `gardens`, `messages`, `pwa` or `header`.
- **Summary**: imperative, lowercase, no final period, e.g. `feat(map): open the map where the visitor is`.
- Breaking changes add `!` after the type or scope and a `BREAKING CHANGE:` footer.
