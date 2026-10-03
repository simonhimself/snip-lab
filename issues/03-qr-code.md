---
title: "Feature: Show a QR code for every new short link"
labels: [enhancement]
---

## Why

So I can put a Snip link on a slide or poster and people can scan it.

## What to build

- After a link is created, show a QR code under the short URL.
- Add a **Download PNG** button for the QR code.
- Frontend only (`public/index.html`). Don't touch `src/index.ts`, which another issue is changing at the same time.

## Notes

- No build step in this project. A small QR library loaded from a CDN (pinned version) or a self-contained inline script are both fine. Explain the choice in the PR/commit.
- Keep the existing look (cream card, black border, orange button).

## Acceptance criteria

- [ ] QR code appears for each new link and scans correctly with a phone
- [ ] Download PNG works
- [ ] Nothing else in the UI broke
