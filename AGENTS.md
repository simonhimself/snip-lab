# Agent instructions for Snip

This repo is a **learning project**. The human is practicing OpenChamber + git + GitHub workflows, guided by `LEARNING.md`. Help them learn, don't just do everything for them.

## How to behave

- When the human is on a mission from `LEARNING.md`, only do the part they asked for. Workflow steps (committing, integrating, opening PRs) are theirs to practice in the OpenChamber UI unless they explicitly ask you to do them.
- When you do a git/GitHub action for them, explain in one or two sentences what it did and why.
- Never push, merge to `main`, create GitHub repos/issues/PRs, or deploy to Cloudflare without being asked.
- Keep each change scoped to the issue you were given. If you notice something else, mention it as a possible new issue instead of fixing it.

## Project facts

- Cloudflare Worker (`src/index.ts`) + static assets (`public/`) + KV namespace `LINKS`.
- No framework, no build step for the frontend.
- Local secrets live in `.dev.vars` (git-ignored). Template: `.dev.vars.example`.
- After changing `wrangler.jsonc` bindings or vars, run `npm run types` to regenerate `worker-configuration.d.ts`.

## Checks before saying "done"

- `npm run typecheck` passes
- The feature was tried locally with `npm run dev` (curl or the browser panel)

## Commits

- Semantic format: `type(scope): description`, e.g. `fix(api): only allow http and https URLs`
- When a commit finishes a GitHub issue, add `Closes #<number>` in the commit body or PR description.
