# snip.

A tiny URL shortener on **Cloudflare Workers + KV**. Paste a long link and get a short one back.

It's also a practice project: **[LEARNING.md](LEARNING.md)** walks through OpenChamber, git, worktrees, GitHub issues and pull requests, and deploying to Cloudflare, one mission at a time.

## Run it

```sh
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

Open http://localhost:8787.

## API

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/links` | `{ "url": "https://..." }` → `{ code, shortUrl }` |
| `GET` | `/s/:code` | Redirects to the original URL |
| `GET` | `/api/health` | Status check |

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server (local KV, nothing touches Cloudflare) |
| `npm run typecheck` | TypeScript check |
| `npm run types` | Regenerate `worker-configuration.d.ts` after changing `wrangler.jsonc` |
| `npm run deploy` | Deploy to Cloudflare |
