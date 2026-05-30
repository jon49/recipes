# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal recipe website (https://recipes.jnyman.com), built as a Hugo static
site. ~400 recipes live as Markdown files in `content/`. The site is enhanced
with a small client-side app for search/filtering and an optional
PocketBase-backed editor for adding/editing recipes from the browser.

## Commands

- `tasks/start.sh` — full local dev environment: runs `hugo server` (live-reload
  preview at http://localhost:1313/) **and** PocketBase (auth + editor API). Use
  this when working on the editor. The editor lives at `/editor/`, logging in
  with the dev superuser `a@b.c` / `asdfasdfasdf` (auto-created by the script).
  PocketBase admin UI is at http://127.0.0.1:8090/_/.
- `hugo server` — preview the static site alone (no editor backend).
- `tasks/build.sh` (just runs `hugo`) — build into `public/`.
- `rebuild.sh` — **production-only** rebuild script run on the server (a
  Raspberry Pi). Do not run locally; its `SRC`/`DEST` paths are hardcoded to the
  Pi's deploy directories.

There is no test suite, linter, or package manager — this is a Hugo site plus
vanilla-JS static assets. The frontend JS uses `// @ts-check` JSDoc-style typing
but has no build step; files in `static/js/` are served as-is.

## Theme submodule

The theme `themes/hugo-bearcub` is a git submodule. After cloning, run
`git submodule update --init`. The site overrides specific theme templates via
`layouts/` rather than editing the submodule.

## Content model

Each recipe is a Markdown file in `content/` with TOML/YAML front matter:

```yaml
---
title: Chili
description: Recipe for Chili.
tags:
  - dinner
---
```

Conventions that the templates and editor depend on:
- **`tags`** drive the on-site tag filter (taxonomy). Used lowercased.
- **`link`** front-matter param (optional): if present, the recipe list links
  out to that external URL (with a ↪ marker) instead of rendering a page.
- Ingredient blocks are conventionally written inside fenced code blocks
  (```` ``` ````) so quantities render monospaced; instructions are plain text
  between them. See `content/chili.md` for the canonical shape.
- Slugs must match `^[a-z0-9-]+$` (enforced by the editor and the API).

## Styling

Do not style buttons unless explicitly asked. No Pico variant classes
(`secondary`, `outline`, etc.) and no custom CSS (width, padding, font, color,
margin) targeting buttons — leave them with the site's default Pico appearance.

## Architecture

### Static site (Hugo)

- `layouts/index.html` overrides the home page: renders the full recipe list as
  a plain `<ul>` (works with no JS / for SEO) plus mount points for the JS app,
  and registers the service worker.
- `layouts/index.json` (enabled via `[outputs] home = ["HTML","RSS","JSON"]` in
  `hugo.toml`) emits `/index.json` — an array of `{title, slug, tags}` for
  every recipe. This is consumed **only by the editor** (to
  populate its recipe dropdown). The client-side search does *not* use it — it
  works directly off the rendered HTML list (see below).
- `static/sw.js` is a service worker (offline caching); it has an explicit
  `cacheVersion` constant — bump it when changing cached assets.

### Client app (`static/js/`, vanilla + VanJS)

Built on [VanJS](https://vanjs.org) (`van-1.5.3.js`) for reactive state, with no
bundler. Modules communicate via a tiny custom-event pub/sub layer
(`messaging.js` — `publish`/`subscribe`). Fuzzy search uses `uFuzzy`. State like
the search term and selected tags persists to `localStorage`.

- `filter.js` — search box + fuzzy filtering. Builds its search haystack
  directly from the rendered `ul#recipes > li` rows (their `data-title` /
  `data-tags` attributes), so search needs no separate index fetch.
- `tag-filter.js` — the tag toggle UI.
- `random-recipe.js` — "Pick Random" feature with a saved-picks dialog.
- `recipe-dropdown.js` — shared `<details>`-based component.

### Editor (PocketBase)

The Markdown files in this repo are the **canonical source of truth**.
PocketBase only provides authentication and a thin save API; it does not store
recipe content.

- `static/editor/index.html` — self-contained editor page. Lists recipes from
  `/index.json`, loads/saves raw Markdown via the API. In dev (port 1313) it
  talks cross-origin to PocketBase on `:8090`; in production nginx proxies
  `/api` to PocketBase.
- `cms/pb_hooks/recipes.pb.js` — defines `GET /api/recipes/{slug}` (read
  markdown) and `POST /api/recipes/{slug}` (write file → `git commit` →
  `rebuild.sh`). Both require superuser auth.
  - **Critical constraint:** PocketBase runs each route handler in a separate
    pooled JSVM, so handlers **cannot** reference file-scope variables/functions
    — only injected globals (`$os`, `$apis`, …) survive. Everything a handler
    needs (config paths, helpers) must be declared *inside* the handler. Do not
    hoist them.
  - Behavior is configured via env vars: `RECIPES_SRC`, `RECIPES_CONTENT`,
    `RECIPES_REBUILD`, and `RECIPES_NO_COMMIT` (set in dev to avoid creating
    commits — `hugo server` handles rebuilds, so the rebuild trigger is a no-op).
- `cms/pb_data/` is gitignored (local PocketBase database).

### Production deploy flow

Editor save → PocketBase hook writes the `.md` file and commits it to the repo
on the Pi → calls `rebuild.sh`, which detaches itself (`setsid`) so the HTTP
request returns immediately, then runs `hugo --gc --minify` under `flock` so
overlapping saves coalesce instead of running Hugo concurrently.
