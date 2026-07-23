# Repository Guidelines

## Project Structure & Module Organization

The production site is the bilingual Astro SSR runtime in `edge/`, deployed as a Cloudflare Worker. English Markdown lives in `content_en/` and is served from `/`; Spanish Markdown lives in `content_es/` and is served from `/es/`. GitHub is the canonical content store, D1 is the runtime projection used by Astro, and R2 stores production media served from `/uploads/*`.

Production routes, layouts, views, components, and server libraries live in `edge/src/`; production client scripts live in `edge/client/`. Shared static sources live in `static/` and are copied into the edge build by `edge/scripts/prepare-public.mjs`. Shared editor handlers and services live in `functions/` and are adapted by the Astro routes under `/admin/`. D1 migrations live in `edge/db/migrations/`; seed and media utilities live in `edge/scripts/`.

## Build, Test, and Development Commands

- `cd edge && npm run db:seed:local`: Migrate and seed local D1 from the repository Markdown.
- `cd edge && npm run dev`: Run the production Astro runtime locally.
- `cd edge && npm test`: Run the edge runtime, projection, and D1 tests.
- `cd edge && npm run build`: Generate bindings, run Astro diagnostics, and build the Worker.
- `cd edge && npm run preview`: Preview the built Worker locally.
- `cd edge && npm run deploy`: Build and deploy the production Worker when deployment is explicitly in scope.
- `npm test`: Run the root editor and cross-runtime regression tests.
- `npm run test:editors`: Run the browser editor contract harness.
- `npm run author:api`: Run the standalone filesystem editor helper; it does not start Astro or update D1.
- `npm run site -- preflight`: Run the compact content/operator preflight.

Run production commands from `edge/`. Run root commands only for the shared editors, content helpers, tests, or operator tooling.

## Coding Style & Naming Conventions

Use UTF-8 Markdown with concise front matter and clear tags. Keep filenames lowercase with underscores, for example `politica_como_identidad.md`. Preserve the existing content hierarchy by language, section, year, and month. Prefer `hidden: true` in front matter for pages that should not appear in listings, search, archives, infrastructure mode, or the knowledge graph; `no_post*` filenames remain supported as a legacy convention.

Keep Astro, HTML, JavaScript, and CSS indentation consistent; 2 spaces is preferred. Reuse existing layouts, components, and helpers instead of duplicating rendering logic. Keep custom styles in `static/css/site.css`. Keep browser behavior in `edge/client/` or the appropriate existing shared `static/js/` module.

## Locked Design Decisions

### Production runtime source of truth

1. Start public UI and runtime work in `edge/src/` and `edge/client/`.
2. Treat GitHub Markdown as canonical content and D1 as its queryable runtime projection.
3. Validate production behavior with edge tests, the edge build, the built preview, and—after deployment—the public URL.
4. Search, graph, tags, backlinks, archives, and navigation must use the D1-backed runtime rather than a parallel generated content index.
5. A Git push does not deploy the Worker. Production code changes require `cd edge && npm run deploy` when deployment is in scope.
6. Ordinary content changes should be projected through the editor, signed webhook, or explicit D1 seed; they do not require an application rebuild.

### Editor save navigation

Do not change this client-visible flow unless the user explicitly replaces the decision:

1. Persist the content in GitHub.
2. Synchronize Are.na when selected, including disconnecting an existing mapping when the user disables it.
3. Redirect immediately to the selected Notebook.

The Astro admin adapter synchronizes successful content mutations into D1 as part of the server response. Do not insert Worker deployment waits, public-URL polling, cache verification, or `waitForPublicState(..., { exists: true })` between the Are.na step and `redirectToNotebook()`. Code deployment is unrelated to the content-save path.

Deletion is deliberately different: it may wait for the exact public URL to return 404 so the UI does not report a completed removal while stale content remains accessible.

The rationale and regression contract live in `docs/editor-architecture.md`. Preserve the negative assertions in `functions/_lib/editor-template.test.mjs` that reject deployment waits in save flows.

## Testing Guidelines

Validate production-facing changes with:

- `npm test` from the repository root for editor and cross-runtime contracts.
- `npm test` and `npm run build` from `edge/`.
- The built edge preview for rendered UI changes.
- The public URL after deploying a production change.

Check for broken internal links, missing front matter fields, relevant browser-console errors, and unintended generated diffs. For content projection work, cover both the Markdown projector and the D1 query or route behavior that consumes it.

## Mandatory Independent Agent Audit

Every repository mutation must be audited by at least one independent subagent. This includes code, content, configuration, migrations, Git history, pushes, deployments, and remote data changes. The auditor is read-only unless explicitly assigned separate file ownership, and must not be the author of the change it reviews.

Before editing, the primary agent must state an acceptance contract containing:

- The exact user-visible outcome.
- The affected route, interface, locale, viewport, and environment.
- The reference commit or working state when the user asks to restore previous behavior.
- What is in scope, what is out of scope, and which external mutations are authorized.

The auditor must review that contract and the relevant source or history before implementation. When restoring historical behavior, inspect the complete responsible implementation, including rendering, data selection, interaction, state, and styling. Do not combine parts from different revisions into a hybrid unless the user explicitly requests one.

The auditor must review the resulting diff and verification evidence before any commit, push, deployment, D1 write, or destructive Git operation. For destructive history requests, resolve the cutoff with an explicit date, time, and timezone; list every affected commit and ref; and audit the exact reset, deletion, and preservation plan before executing it. Never infer an exception to a destructive instruction from a later ambiguous request. Stop and ask the user when instructions conflict.

Production verification must exercise the exact route and interface reported by the user. Tests, hashes, deployment IDs, DOM checks, and animation counters are supporting evidence, not substitutes for confirming the requested visible behavior. If authentication or another constraint prevents checking the reported surface, state that limitation and do not claim the issue is fixed.

If the user changes or cancels the request while a mutation is running, stop that operation first and verify whether it terminated or completed before starting another mutation. Reconcile any partial external state before proceeding.

The primary agent may not claim completion until the auditor returns a pass. Findings must be fixed and re-audited. If no subagent is available, pause before mutation and tell the user; only the user may explicitly waive the audit.

## Commit & Pull Request Guidelines

Recent commits mix English and Spanish, but follow an imperative, scoped style, for example `Add metadata to politica_como_identidad.md` or `Corrige faltas de ortografia en posts 2025`. Keep commit subjects short and action-oriented; include the affected path or post when relevant.

### Agent workflow rule

- Always create a git commit for completed requested changes unless the user explicitly asks not to commit.

For pull requests, include:

- A short summary of content, runtime, or UI changes.
- A linked issue when applicable.
- Screenshots for layout or styling updates.
- Confirmation that `npm test` and `npm run build` completed successfully from `edge/`.
