---
title: "Feature: Links that expire"
labels: [enhancement]
---

## Why

Some links are temporary (an event, a one-off share). They should clean themselves up.

## What to build

- Add an **Expires** dropdown to the form in `public/index.html`: Never / 1 hour / 1 day / 7 days.
- `POST /api/links` accepts an optional `expiresIn` field (seconds).
- Use KV's built-in `expirationTtl` option on `put()` so Cloudflare deletes the key automatically.
- Return `expiresAt` (ISO date or `null`) in the response and show "Expires in …" in the UI.

## Notes

- KV's minimum `expirationTtl` is 60 seconds.
- An expired link should give the normal "not found" response.

## Acceptance criteria

- [ ] "Never" behaves like today
- [ ] "1 hour" stores the link with a TTL and shows the expiry time in the UI
- [ ] `npm run typecheck` passes
