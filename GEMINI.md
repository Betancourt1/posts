# GEMINI.md - Project Context

This file provides context for Gemini CLI when working on the `fbetancourt.work` Hugo static site project.

## Project Overview
A personal static site built with [Hugo](https://gohugo.io/), featuring local search via [Pagefind](https://pagefind.app/) and deployed on Cloudflare Pages.

### Tech Stack
- **SSG:** Hugo (v0.141.0-DEV or similar, binary included in `tools/hugo/`).
- **Search:** Pagefind (indexing via `npx pagefind`).
- **Styling:** Custom CSS in `static/css/site.css`.
- **Deployment:** Cloudflare Pages (automated from `main` branch).

## Building and Running
The site can be built and run locally using the provided scripts or standard Hugo commands.

### Commands
- **Development Server:**
  - `.\tools\hugo\hugo.exe server -D` (includes drafts)
  - `hugo server -D` (if `hugo` is in PATH)
- **Production Build:**
  - `.\tools\hugo\hugo.exe --gc --minify`
  - `hugo --gc --minify` (if `hugo` is in PATH)
- **Full Build (Hugo + Pagefind):**
  - `powershell.exe -File tools\build_with_pagefind.ps1 -Minify`
- **Manual Search Indexing:**
  - `npx pagefind --site public`

### Directories
- `content/`: Markdown content.
  - `content/posts/<year>/<month>/`: Blog posts and writings.
  - `content/zettelkasten/`: Knowledge base/notes.
- `layouts/`: Hugo templates (HTML + Go templates).
- `static/`: Static assets (CSS, icons, etc.) copied directly to `public/`.
- `public/`: Generated static site (build artifact).
- `archetypes/`: Templates for new content.
- `tools/`: Local Hugo binary and build scripts.

## Development Conventions

### Content Creation
- **New Post:** `hugo new posts/2026/febrero/mi_post.md`
- **New Zettel Note:** `hugo new --kind zettel zettelkasten/mi_nota.md`
- **Filenames:** Use lowercase with underscores (e.g., `politica_como_identidad.md`).
- **Front Matter:** Must include `title`, `date`, `draft`, `tags`, and `summary`.
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
- `tools/build_with_pagefind.ps1`: Orchestrated build process including search indexing.
- `archetypes/post.md`: Standard post template.
- `static/css/site.css`: Primary stylesheet.
- `static/_headers`: Cloudflare Pages HTTP headers configuration.
