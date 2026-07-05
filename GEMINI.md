# GEMINI.md - Project Context

This file provides context for Gemini CLI when working on the `fbetancourt.work` Hugo static site project.

## Project Overview
A personal static site built with [Hugo](https://gohugo.io/), featuring local search via [Pagefind](https://pagefind.app/) and deployed on Cloudflare Pages.

### Tech Stack
- **SSG:** Hugo (via PATH or the npm `hugo-extended` dependency).
- **Search:** Pagefind (indexing via `npx pagefind`).
- **Styling:** Custom CSS in `static/css/site.css`.
- **Deployment:** Cloudflare Pages (automated from `main` branch).

## Building and Running
The site can be built and run locally using the provided scripts or standard Hugo commands.

### Commands
- **Development Server:**
  - `npm run dev`
  - `hugo server -D` (if `hugo` is in PATH)
- **Production Build:**
  - `npm run build` (Hugo + Pagefind)
  - `hugo --gc --minify` (Hugo only)
- **Full Build (Hugo + Pagefind):**
  - `npm run build`
  - `npm run build:local` (also refreshes `static/pagefind/`)
- **Manual Search Indexing:**
  - `npx pagefind --site public`

### Directories
- `content_en/`: English Markdown content served from `/`.
- `content_es/`: Spanish Markdown content served from `/es/`.
  - `content_es/posts/<year>/<month>/`: Blog posts and writings.
  - `content_es/zettelkasten/`: Knowledge base/notes.
  - `content_es/lit/`: Reading notes and quotes.
- `layouts/`: Hugo templates (HTML + Go templates).
- `static/`: Static assets (CSS, icons, etc.) copied directly to `public/`.
- `public/`: Generated static site (build artifact).
- `archetypes/`: Templates for new content.
- `tools/`: Local Hugo binary and build scripts.

## Development Conventions

### Content Creation
- **New Spanish Post:** `hugo new content_es/posts/2026/febrero/mi_post.md`
- **New Spanish Zettel Note:** `hugo new --kind zettel content_es/zettelkasten/mi_nota.md`
- **Filenames:** Use lowercase with underscores (e.g., `politica_como_identidad.md`).
- **Front Matter:** Use clear `title`, `date`, `draft`, and `tags`; add `summary` when a custom listing or social preview is useful.
- **Hidden Pages:** Prefer `hidden: true` for pages that should be excluded from listings, archives, search, infrastructure mode, and the knowledge graph. Existing `no_post*` filenames still work as legacy hidden content.
- **Encoding:** UTF-8 Markdown.

### Coding Style
- **Templates:** Use 2-space indentation in HTML/Go templates.
- **CSS:** Add custom styles to `static/css/site.css`.
- **Organization:** Reuse partials in `layouts/partials/` instead of duplicating markup.

### Commit Guidelines
- Follow an imperative, scoped style (e.g., `Add metadata to post.md`).
- Use English or Spanish.
- **Mandatory:** Create a git commit for completed requested changes unless explicitly told not to.

## Key Files
- `hugo.toml`: Main site configuration.
- `AGENTS.md`: Specific guidelines for AI agents (take precedence).
- `tools/sync_pagefind_static.mjs`: Syncs the generated Pagefind index into `static/pagefind/`.
- `archetypes/post.md`: Standard post template.
- `static/css/site.css`: Primary stylesheet.
- `static/_headers`: Cloudflare Pages HTTP headers configuration.
