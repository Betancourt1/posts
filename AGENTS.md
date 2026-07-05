# Repository Guidelines

## Project Structure & Module Organization
This repository is a bilingual Hugo static site. English content lives in `content_en/` and is served from `/`; Spanish content lives in `content_es/` and is served from `/es/`. Spanish posts live in `content_es/posts/<year>/<month>/` as Markdown files with front matter. Reusable page sections and templates are in `layouts/` (`_default/`, `partials/`, `archives/`). Static assets (CSS, icons, manifest, Pagefind backup files) live in `static/` and are copied to the final site at build time. Generated output is written to `public/`; treat it as build artifact content and avoid hand-editing files there.

## Build, Test, and Development Commands
- `npm run dev`: Run a local Hugo dev server.
- `npm run build`: Build the production site into `public/` and generate `public/pagefind/`.
- `npm run build:local`: Build production output and sync `public/pagefind/` into the versioned `static/pagefind/` backup.
- `hugo --gc --minify`: Hugo-only release check when Pagefind is not needed.

Run commands from the repository root where `hugo.toml` is located.

## Coding Style & Naming Conventions
Use UTF-8 Markdown with concise front matter and clear tags. Keep filenames lowercase with underscores, for example `politica_como_identidad.md`. Preserve the existing content hierarchy by language, section, year, and month. Prefer `hidden: true` in front matter for pages that should not appear in listings, search, archives, infrastructure mode, or the knowledge graph; `no_post*` filenames are still supported as a legacy convention. In templates and HTML, keep indentation consistent (2 spaces is preferred in this repo) and reuse partials in `layouts/partials/` instead of duplicating markup. Keep custom styles in `static/css/site.css`.

## Testing Guidelines
There is no automated test suite yet. Validate changes with a local build:
- `hugo server -D` for visual/content review.
- `npm run build` before opening a PR to catch Hugo and Pagefind regressions.
- `npm run build:local` when indexable content changes and `static/pagefind/` needs to be refreshed.

Check for broken internal links, missing front matter fields, and unintended generated diffs under `public/` or `static/pagefind/`.

## Commit & Pull Request Guidelines
Recent commits mix English and Spanish, but follow an imperative, scoped style (for example: `Add metadata to politica_como_identidad.md`, `Corrige faltas de ortografia en posts 2025`). Keep commit subjects short and action-oriented; include the affected path or post when relevant.

### Agent workflow rule
- Always create a git commit for completed requested changes unless the user explicitly asks not to commit.

For pull requests, include:
- A short summary of content/template changes.
- Linked issue (if applicable).
- Screenshots for layout or styling updates.
- Confirmation that `npm run build` completed successfully.
