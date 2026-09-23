# Contextual Markdown editor

## Acceptance contract

Reference: concept 04, “Contextual writing tools,” and repository revision
`842c7d06671208be459dc3b127540f36d4d9f3d4`.

The Post and Notebook interfaces at `/admin/post-editor` and
`/admin/notebook-editor` use a single Markdown body with contextual formatting,
block actions, searchable insertion, and compact mobile controls. Validate English
and Spanish at desktop 1280px and mobile 320px, 390px, and 768px widths, including a
short viewport. The image-only editor and published content are outside this change.

Untouched Markdown body bytes, metadata, local recovery, uploads, technical
rendering, and the GitHub → Are.na → Notebook save sequence are preserved. Raw mode
must retain the same document, selection, and undo history. Authorized mutations
are local code, dependencies, tests, documentation, and a reviewed commit. No push,
deployment, production data change, or content-file edit is included.

## Implementation

- `edge/client/block-editor/index.js` owns the CodeMirror view, contextual tools,
  insertion and block menus. It uses locally bundled Tabler SVGs.
- `markdown.js` derives top-level block ranges with Lezer; actions change source
  ranges without serializing an AST. Lists, quotes, and fences move as whole blocks.
- `styles.css` keeps controls out of the document flow. Mobile menus become sheets;
  the selection toolbar accounts for `visualViewport` and can collapse.
- `writing-editor-template.js` adapts the exact loaded body to CodeMirror. Hidden
  textarea values support the existing fallback only; save/draft payloads read the
  CodeMirror document. This avoids textarea CRLF normalization.
- `prepare-public.mjs` bundles the browser module with esbuild. No runtime CDN is
  used. The original textarea editor remains available if the bundle cannot load.

## Deliberate product choices

The title and summary remain metadata fields above the body. The Markdown toggle
changes the body's presentation; it no longer constructs a second document from
title, summary, and body. This preserves exact source and one undo history.

Code language and image URL/alt/caption controls are in the active block's menu.
Block previews reuse the existing safe preview dialog and renderer on request.
Technical output is not rendered on every keystroke. Reordering uses Move up/down,
which works on touch and keyboard. No drag interaction is required.

Formatting buttons have SVG icons, tooltips and accessible names. Insert and block
menus use text labels for recognition on touch devices. Save status and the site's
existing Are.na integration stay in the shell. At small widths, preview, Markdown,
undo and redo are available in the properties menu. The save button retains its
complete accessible name while “Guardar borrador” is shortened visually on mobile.

## Use and verification

- Select text for the format bar; Escape dismisses it.
- Use the gutter handle or mobile block button for conversion, duplication,
  deletion, code language, image editing and block preview.
- Type `/` on an empty line or use Plus for searchable insertion.
- `Cmd/Ctrl+Shift+Enter` opens insertion while preserving a selection.
- `Cmd/Ctrl+Shift+.` opens block actions. Standard bold, italic, link and undo keys
  work. Tab moves out of the writing surface normally.

`npm run test:block-editor` checks the CodeMirror interactions with isolated API
fixtures. `npm run test:editors` also retains the full textarea fallback suite.
`npm run test:technical-editor` covers its technical fallback. To test the built
admin pages, start `npm --prefix edge run preview`, then run:

```sh
BLOCK_EDITOR_RUNTIME_ORIGIN=http://127.0.0.1:4321 node tools/block_editor_harness.mjs
```

Only API calls are fulfilled by isolated fixtures in this mode; the admin page and
browser assets come from the built Worker. This does not verify authenticated
production services.

`npm run preview:block-editor` provides a repeatable local preview with two real
writing samples and a technical sample. Save requests remain in memory; files and
production are untouched. Stop it with Ctrl+C. No new skill is necessary: the
existing editor harness plus this small command cover future design iterations.
