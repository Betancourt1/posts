# Repository Guidelines

## Project Structure & Module Organization
The production site is the bilingual Astro SSR runtime in `edge/`, deployed as a Cloudflare Worker. English content lives in `content_en/` and is served from `/`; Spanish content lives in `content_es/` and is served from `/es/`. Git is the canonical content store and D1 is the runtime projection used by Astro. Production layouts and components live in `edge/src/`; production client scripts live in `edge/client/`. Shared static assets live in `static/` and are copied into the edge build by `edge/scripts/prepare-public.mjs`.

The Hugo files in `layouts/`, `hugo.toml`, and the root Hugo build commands are legacy/reference surfaces. They are not the production runtime and must not be used as proof that a public-site change is complete.

## Build, Test, and Development Commands
- `cd edge && npm run dev`: Run the production Astro runtime locally.
- `cd edge && npm test`: Run the edge runtime and D1 tests.
- `cd edge && npm run build`: Run Astro diagnostics and build the Worker.
- `cd edge && npm run preview`: Preview the built Worker locally.
- `cd edge && npm run deploy`: Build and deploy the production Worker when deployment is explicitly in scope.
- `npm test`: Run the root editor and cross-runtime regression tests.

Run production commands from `edge/`. Use root Hugo commands only when the user explicitly requests Hugo maintenance or legacy parity work.

## Coding Style & Naming Conventions
Use UTF-8 Markdown with concise front matter and clear tags. Keep filenames lowercase with underscores, for example `politica_como_identidad.md`. Preserve the existing content hierarchy by language, section, year, and month. Prefer `hidden: true` in front matter for pages that should not appear in listings, search, archives, infrastructure mode, or the knowledge graph; `no_post*` filenames are still supported as a legacy convention. In templates and HTML, keep indentation consistent (2 spaces is preferred in this repo) and reuse partials in `layouts/partials/` instead of duplicating markup. Keep custom styles in `static/css/site.css`.

## Locked Design Decisions

### Production runtime source of truth

Do not confuse the Hugo implementation with the live site:

1. Start public UI and runtime work in `edge/src/` and `edge/client/`.
2. Validate production behavior with the edge tests, edge build, built preview, and—after deployment—the public URL.
3. Never report a public fix as complete because a Hugo template or Hugo dev server looks correct.
4. Touch Hugo only when the user explicitly asks for it or when a shared/legacy parity change is intentionally required; the corresponding edge path remains mandatory.
5. A Git push does not deploy the Worker. Production changes require `cd edge && npm run deploy` when deployment is in scope.

### Editor save navigation

Do not change this flow unless the user explicitly replaces the decision:

1. Persist the content in GitHub.
2. Synchronize Are.na when selected, including disconnecting an existing mapping when the user disables it.
3. Redirect immediately to the selected Notebook.

Cloudflare Pages deployment is asynchronous and must never block the editor redirect. Do not insert public-URL polling, deployment polling, cache verification, or `waitForPublicState(..., { exists: true })` between the Are.na step and `redirectToNotebook()`.

Deletion is deliberately different: it may wait for the exact public URL to return 404 so the UI does not report a completed removal while stale content remains accessible.

The rationale and regression contract live in `docs/editor-architecture.md`. Preserve the negative assertions in `functions/_lib/editor-template.test.mjs` that reject deployment waits in save flows.

## Testing Guidelines
Validate production-facing changes with:
- `npm test` from the repository root for editor and parity contracts.
- `npm test` and `npm run build` from `edge/`.
- The built edge preview for rendered UI changes.
- The public URL after deploying a production change.

Check for broken internal links, missing front matter fields, relevant browser-console errors, and unintended generated diffs. Do not substitute a Hugo render for edge-runtime verification.

## Commit & Pull Request Guidelines
Recent commits mix English and Spanish, but follow an imperative, scoped style (for example: `Add metadata to politica_como_identidad.md`, `Corrige faltas de ortografia en posts 2025`). Keep commit subjects short and action-oriented; include the affected path or post when relevant.

### Agent workflow rule
- Always create a git commit for completed requested changes unless the user explicitly asks not to commit.

For pull requests, include:
- A short summary of content/template changes.
- Linked issue (if applicable).
- Screenshots for layout or styling updates.
- Confirmation that `npm run build` completed successfully.
