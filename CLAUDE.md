# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local dev server (includes drafts)
hugo server -D

# Production build
hugo --gc --minify

# Full production build with search index (use before committing)
npm run build

# Full build and refresh the committed Pagefind backup
npm run build:local

# Regenerate Pagefind search index only
npx pagefind --site public
```

Run all commands from the repo root where `hugo.toml` is located. `hugo` must be in PATH.

## Creating content

```bash
# New post (Spanish; English content lives under content_en/)
hugo new content_es/posts/2026/julio/mi_post.md

# New zettelkasten note
hugo new --kind zettel content_es/zettelkasten/mi_nota.md
```

Filenames use lowercase with underscores. Use clear `title`, `date`, `draft`, and `tags`; add `summary` when a custom listing or social preview is useful. Prefer `hidden: true` for pages that should be excluded from listings, archives, search, infrastructure mode, and the knowledge graph. Existing `no_post*` filenames still work as legacy hidden content.

## Architecture

**Bilingual Hugo site** with separate content directories per language:
- `content_en/` — English, default language served at `/`
- `content_es/` — Spanish, served at `/es/`

Language routing is configured in `hugo.toml` via `[languages.en]` and `[languages.es]` blocks with their own `contentDir`, menus, and params. UI strings (button labels, section headings) are localized in `i18n/en.toml` and `i18n/es.toml`.

**Content sections** (Spanish has more sections than English):
- `posts/<year>/<month>/` — blog posts
- `zettelkasten/` — atomic notes (ES only)
- `lit/` — readings/literature notes (ES only)
- `proyectos-profesionales/` and `proyectos-academicos/` — portfolio (both languages)

**Knowledge graph** (`layouts/partials/knowledge-graph.html`): a client-side force-directed graph that connects pages by shared tags. At build time the template collects all non-draft pages with tags, serializes them as JSON into a `<script>` block, and the browser renders the graph via D3. The `knowledge-graph` partial appears on the home page and in the sidebar.

**Backlinks** (`layouts/partials/backlinks.html`): scans all site pages at build time looking for references to the current page (by URL or filename), then renders a list at the bottom of any page that has inbound links.

**Search**: Pagefind runs after Hugo generates `public/`. The `static/pagefind/` directory is committed as a fallback so that search works in production even if the deploy command only runs `hugo`. Refresh this backup with `npm run build:local` before committing when indexable content changes.

**Deployment**: Cloudflare Pages deploys from `main` with build command `npm run build` and output directory `public`. HTTP headers for caching are in `static/_headers`.

## Workflow rule

Always create a git commit for completed requested changes unless the user explicitly says not to.
