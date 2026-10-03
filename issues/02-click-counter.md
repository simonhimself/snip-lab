---
title: "Feature: Count clicks on each short link"
labels: [enhancement]
---

## Why

I want to know if anyone actually uses my short links.

## What to build

- Each time `/s/:code` redirects someone, add 1 to that link's click count.
- New endpoint `GET /api/links/:code` returns `{ code, url, clicks, createdAt }` (or `404`).
- Change the KV value from a plain URL string to JSON: `{ "url": "...", "clicks": 0, "createdAt": "<ISO date>" }`.

## Notes

- KV is "eventually consistent", so two clicks at the same moment may be counted as one. That's fine for this project. Leave a short code comment explaining the trade-off.
- Backend only (`src/index.ts`). Don't touch `public/index.html`, which another issue is changing at the same time.

## Acceptance criteria

- [ ] Clicking a short link 3 times → `GET /api/links/<code>` shows `clicks: 3`
- [ ] Redirects still work
- [ ] `npm run typecheck` passes
