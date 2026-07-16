# GEMINI.md - Project Context

This file provides context for Gemini CLI when working on `fbetancourt.work`.

## Project overview

This is a bilingual Astro SSR site deployed as a Cloudflare Worker.

- **Runtime:** Astro with the Cloudflare adapter in `edge/`.
- **Canonical content:** Markdown in `content_en/` and `content_es/`, stored in GitHub.
- **Runtime content:** A D1 projection containing documents, routes, tags, links, and searchable text.
- **Media:** R2, exposed by the Worker at `/uploads/*`.
- **Styling:** Custom CSS in `static/css/site.css`.
- **Authoring:** Protected `/admin/` routes backed by the shared handlers in `functions/`.

English is served from `/`; Spanish is served from `/es/`.

## Runtime flow

1. The projector in `edge/src/lib/content-projector.mjs` converts Markdown and front matter into normalized records and rendered HTML.
2. The admin mutation sync, GitHub webhook reconciler, or bulk seed writes those records to D1.
3. Public Astro routes build a page model with `edge/src/lib/public-page.mjs` and D1 queries from `content-queries.mjs`.
4. `edge/src/views/PublicPage.astro` selects the appropriate component inside the shared site layout.
5. Search and graph APIs query the same D1 projection; uploaded media comes from R2.

Content updates and code deployments are separate. Ordinary content changes update D1 without rebuilding the Worker. Code, component, and asset changes require an edge build and deployment.

## Commands

Run production-runtime commands from `edge/`:

```bash
cd edge
npm run db:seed:local   # initialize or rebuild local D1 from repository Markdown
npm run dev             # local Astro server
npm test                # edge, D1, projection, and route tests
npm run build           # type generation, Astro diagnostics, and Worker build
npm run preview         # preview the built Worker
npm run deploy          # build and deploy when deployment is explicitly in scope
```

Useful data operations from `edge/`:

```bash
npm run db:seed:remote
npm run media:sync:dry-run
npm run media:sync
```

Run editor and content utilities from the repository root:

```bash
npm run author:api        # standalone filesystem editor helper; does not run Astro or update D1
npm run new:post -- "Post title"
npm run new:zettel -- "Concrete idea"
npm run new:page -- "Page title" --lang es
npm run site -- preflight
npm test
npm run test:editors
```

Production authoring lives under the Cloudflare Access-protected `/admin/` routes. The standalone `author:api` helper is for direct local-file editor work; reseed local D1 before reviewing those edits in the edge runtime.

## Important directories

- `edge/src/pages/`: public pages, `/admin/` pages, and APIs.
- `edge/src/components/`, `edge/src/layouts/`, `edge/src/views/`: production UI.
- `edge/src/lib/`: content projection, D1 access, reconciliation, page models, and media access.
- `edge/client/`: browser-side production code.
- `edge/db/migrations/`: D1 schema.
- `edge/scripts/`: D1 seeds, asset preparation, media sync, and content normalization.
- `content_en/`: English Markdown content.
- `content_es/`: Spanish Markdown content.
- `functions/`: editor handlers and shared authoring services adapted by Astro.
- `static/`: shared CSS, fonts, icons, scripts, and local upload sources.
- `tools/`: local authoring, content, testing, and QA utilities.

## Development conventions

- Use UTF-8 Markdown with clear `title`, `date`, `draft`, and `tags`; add `summary` when a listing or social preview needs custom text.
- Use lowercase filenames with underscores, for example `politica_como_identidad.md`.
- Preserve the existing language, section, year, and month hierarchy.
- Prefer `hidden: true` for pages excluded from listings, archives, search, infrastructure mode, and the knowledge graph. Existing `no_post*` filenames remain supported.
- Keep production UI work in `edge/src/` and browser behavior in `edge/client/` or the existing shared `static/js/` module.
- Use 2-space indentation in Astro, HTML, JavaScript, and CSS where the surrounding file does.
- Keep custom styling in `static/css/site.css`.
- Avoid duplicating layout logic; reuse the existing Astro components and helpers.

## Editor contract

Saving must preserve this user-visible order: persist to GitHub, finish optional Are.na synchronization or disconnection, then return immediately to the selected Notebook. The edge adapter synchronizes the successful mutation into D1. Never add Worker deployment waits or public-URL polling to the save path. Deletion may still wait for the exact public URL to return 404.

See `docs/editor-architecture.md` for the editor boundaries and regression contract.

## Commit guidelines

- Use a short, imperative, scoped subject.
- Create a commit after every completed requested change unless the user explicitly says not to.
- For production-facing changes, run the relevant root tests plus `npm test` and `npm run build` from `edge/`.

`AGENTS.md` contains the repository rules and takes precedence.
