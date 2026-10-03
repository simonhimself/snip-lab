---
title: "Feature: Private admin page listing all links"
labels: [enhancement]
---

## Why

I want to see every link I've created, how often it was clicked, and delete the bad ones.

## What to build

- New page `public/admin.html`.
- New endpoints (both require header `Authorization: Bearer <ADMIN_TOKEN>`):
  - `GET /api/admin/links`: list all links with url, clicks, createdAt (use `env.LINKS.list()`)
  - `DELETE /api/admin/links/:code`: delete a link
- Wrong or missing token → `401`.
- The admin page asks for the token once and keeps it in `sessionStorage`.
- Put the admin routes in a new file `src/admin.ts` to keep `src/index.ts` small.

## Notes

- Locally the token comes from `.dev.vars` (see `.dev.vars.example`).
- In production it must be set with `npx wrangler secret put ADMIN_TOKEN`. **Never** commit the real token.
- Compare tokens in a timing-safe way (ask the agent why that matters).

## Acceptance criteria

- [ ] Without the token: `401`
- [ ] With the token: table of all links with click counts
- [ ] Delete works and the link stops redirecting
- [ ] Opened as a **pull request**, not merged directly
