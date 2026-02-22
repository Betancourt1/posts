# Repository Guidelines

## Project Structure & Module Organization
This repository is a Hugo-based static site. Author content lives in `content/posts/<year>/<month>/` as Markdown files with front matter. Reusable page sections and templates are in `layouts/` (`_default/`, `partials/`, `archives/`). Static assets (CSS, icons, manifest) live in `static/` and are copied to the final site at build time. Generated output is written to `public/`; treat it as build artifact content and avoid hand-editing files there.

## Build, Test, and Development Commands
- `hugo server -D`: Run a local dev server and include draft content.
- `hugo`: Build the production site into `public/`.
- `hugo --gc --minify`: Build with cleanup and minification for release checks.

Run commands from the repository root where `hugo.toml` is located.

## Coding Style & Naming Conventions
Use UTF-8 Markdown with concise front matter and clear tags. Keep filenames lowercase with underscores, for example `politica_como_identidad.md`. Preserve the existing content hierarchy by year/month paths. In templates and HTML, keep indentation consistent (2 spaces is preferred in this repo) and reuse partials in `layouts/partials/` instead of duplicating markup. Keep custom styles in `static/css/site.css`.

## Testing Guidelines
There is no automated test suite yet. Validate changes with a local build:
- `hugo server -D` for visual/content review.
- `hugo --gc --minify` before opening a PR to catch build regressions.

Check for broken internal links, missing front matter fields, and unintended generated diffs under `public/`.

## Commit & Pull Request Guidelines
Recent commits mix English and Spanish, but follow an imperative, scoped style (for example: `Add metadata to politica_como_identidad.md`, `Corrige faltas de ortografia en posts 2025`). Keep commit subjects short and action-oriented; include the affected path or post when relevant.

### Agent workflow rule
- Always create a git commit for completed requested changes unless the user explicitly asks not to commit.

For pull requests, include:
- A short summary of content/template changes.
- Linked issue (if applicable).
- Screenshots for layout or styling updates.
- Confirmation that `hugo --gc --minify` completed successfully.
