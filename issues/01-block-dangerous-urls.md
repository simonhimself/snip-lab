---
title: "Bug: Snip accepts javascript: and other non-web URLs"
labels: [bug, good first issue]
---

## What happens

`POST /api/links` accepts anything that `new URL()` can parse. That includes:

- `javascript:alert(document.cookie)`
- `data:text/html,<h1>hi</h1>`
- `mailto:someone@example.com`
- `ftp://example.com`

Anyone could turn a Snip link into a phishing or script link.

## Steps to reproduce

1. Run `npm run dev`
2. Paste `javascript:alert(1)` into the form and press **Snip it**
3. A short link is created ❌

## Expected

Only `http:` and `https:` URLs are accepted. Everything else returns `400` with a friendly error message.

## Acceptance criteria

- [ ] `isValidUrl` in `src/index.ts` only allows `http:` and `https:`
- [ ] Trying the 4 examples above shows the error in the UI
- [ ] A normal `https://` link still works
