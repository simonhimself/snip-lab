---
title: "Feature: Let me choose a custom short code"
labels: [enhancement]
---

## Why

`/s/k3n9xa` is forgettable. `/s/my-talk` is not.

## What to build

- Add an optional **Custom code** input to the form in `public/index.html`.
- `POST /api/links` accepts an optional `code` field.
  - Allowed: 3–32 characters, `a-z`, `0-9`, `-`
  - If the code is already taken → `409` with `"That code is taken"`
  - If no code is given → generate one like today
- Show the error in the UI.

## Acceptance criteria

- [ ] Custom code works and redirects
- [ ] Taken code → friendly error
- [ ] Invalid code (e.g. `Hello World!`) → friendly error
- [ ] Leaving it empty still generates a random code
