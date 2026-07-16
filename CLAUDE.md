# CLAUDE.md

This file guides Claude Code when working in this repository. `AGENTS.md` is authoritative when the instructions differ.

## Commands

Run production-runtime commands from `edge/`:

```bash
cd edge

# Initialize or refresh local D1 from the repository Markdown
npm run db:seed:local

# Local Astro server
npm run dev

# Tests, production build, and built preview
npm test
npm run build
npm run preview

# Deploy code only when deployment is explicitly requested
npm run deploy
```

Bulk data and media operations also run from `edge/`:

```bash
npm run db:seed:remote
npm run media:sync:dry-run
npm run media:sync
```

Run authoring and cross-runtime utilities from the repository root:

```bash
npm run author:api        # standalone filesystem editor; does not run Astro or update D1
npm run new:post -- "Post title"
npm run new:zettel -- "Concrete idea"
npm run new:page -- "Page title" --lang es
npm run site -- preflight
npm test
npm run test:editors
```

The production editor lives under the Cloudflare Access-protected `/admin/` routes. After changing local files with `author:api`, reseed local D1 before reviewing them in Astro.

## Architecture

The production application is a bilingual Astro SSR runtime deployed as a Cloudflare Worker:

- `content_en/` contains canonical English Markdown served from `/`.
- `content_es/` contains canonical Spanish Markdown served from `/es/`.
- GitHub is the canonical content store.
- D1 is the runtime projection used for routes, rendered documents, navigation, tags, backlinks, graph data, archives, and search.
- R2 stores production uploads served through `/uploads/*`.
- `edge/src/` contains the production routes, layouts, views, components, and server libraries.
- `edge/client/` contains production browser behavior.
- `functions/` contains the shared editor handlers and services used by the Astro admin adapters.
- `static/` contains shared assets copied by `edge/scripts/prepare-public.mjs`.

The main public request path is:

`edge/src/pages/*` -> `edge/src/lib/public-page.mjs` -> D1 queries -> `edge/src/views/PublicPage.astro` -> layout and components.

The content write path is:

GitHub Markdown -> projector -> D1, triggered by an admin mutation, the signed GitHub webhook, or an explicit seed. Search is served by `edge/src/pages/api/search.ts` from D1; it does not use a generated static index.

Code and content have separate lifecycles. A content commit can be reconciled into D1 without rebuilding Astro. A code push does not deploy the Worker; use `npm run deploy` from `edge/` when production deployment is in scope.

## Creating content

Use the root helpers instead of constructing paths by hand:

```bash
npm run new:post -- "Mi post"
npm run new:zettel -- "Mi nota"
npm run new:page -- "Mi pagina" --lang es
```

Use lowercase filenames with underscores. Keep front matter concise and use clear `title`, `date`, `draft`, and `tags`; add `summary` when a custom listing or social preview is useful.

Prefer `hidden: true` for pages that should remain directly accessible but stay out of listings, archives, search, infrastructure mode, and the knowledge graph. Existing `no_post*` filenames remain supported.

## Editor contract

Notebook, Post, and Image are separate editor entries described in `docs/editor-architecture.md`. The user-visible save order is locked:

1. Persist content in GitHub.
2. Finish optional Are.na synchronization, including disconnecting an existing mapping when disabled.
3. Return immediately to the selected Notebook.

The edge adapter projects successful content mutations into D1. Do not insert Worker deployment waits, cache polling, or public-URL polling before the redirect. Deletion is the deliberate exception and may wait for the exact public URL to return 404.

## Verification

For production-facing work, run the relevant root tests and then:

```bash
cd edge
npm test
npm run build
```

Use the built preview and, after an authorized deployment, the public URL as the final rendered truth surfaces. Check browser-console errors, broken internal links, front matter, and unintended generated diffs.

## Workflow rule

Always create a git commit for completed requested changes unless the user explicitly says not to.
