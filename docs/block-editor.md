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

The title and summary remain metadata fields above the body. Markdown view
changes the body's presentation; it no longer constructs a second document from
title, summary, and body. This preserves exact source and one undo history.

### One view switcher

The topbar has one segmented control, `Escribir | Markdown | Vista previa`
(`#view-render`, `#view-markdown`, `#view-preview`). At 900px and below it becomes
one view button (`#view-menu-button`) whose menu also contains Deshacer/Rehacer.
`Ctrl/Cmd+Alt+P` cycles views (matched by `event.code`, so macOS Option+P works).

- Escribir/Markdown is the persisted `authorEditorViewMode`. Preview is a separate,
  transient overlay flag: it is never stored and never becomes `activeViewMode`,
  so saving from Preview uses the same document path as before.
- Preview renders inline (`#preview-pane`) through `/api/preview`, restores the
  proportional scroll position, and returns focus and caret to the editor.
- `Renderizado | HTML` switches between the rendered iframe and the article's
  rendered HTML. The HTML is assigned with `textContent`, so it is never injected.
- At 1280px and above, “Lado a lado” shows editor and preview together and
  refreshes 700ms after typing stops (`authorEditorPreviewSplit`).
- Notebooks keep their previous rule: no preview. The book template still forces
  Markdown. Per-block “Vista previa del bloque” keeps the modal preview dialog.

### Fewer duplicate controls and less status noise

- The Properties panel no longer repeats Markdown/Preview/Undo/Redo.
- Desktop inserts use the gutter plus/grip and `/`. The floating dock is
  mobile-only.
- The textarea fallback and the block editor share `functions/_lib/insert-templates.js`,
  so both insert the same locale-aware samples.
- Are.na has one status chip in its section, which opens the details dialog. The
  topbar Are.na button and “Ver detalle” were removed.
- The saved pill is the only persistent save status. A retry icon appears next to
  it after a failed save. Idle/saved publication text is visually hidden; errors and
  deletion states remain visible. Toasts still go through `#editor-notice`.
- The save action is always “Guardar”. Visibility (Borrador/Público) is an adjacent
  menu that drives the existing hidden `#hidden` checkbox, so payload semantics
  are unchanged.
- Properties are grouped into Publicación, Metadatos, and a collapsed Avanzado
  (font size, Are.na, notebook channel, danger zone). Avanzado shows an Are.na badge
  when copying is enabled.
- The writing hint shows during the first three editor loads (a localStorage counter
  `authorEditorHintSessions`) and afterwards only while the body is empty.

### Contextual interactions

On desktop the block and insert menus are anchored, non-modal popovers that close
on Escape or an outside click; on mobile they remain bottom sheets. “Convertir en”
is an icon row with the current type pressed. Move up/down keeps the menu open, and
`Alt+↑/↓` moves the current block directly (this replaces CodeMirror's line move).
The selection toolbar shows three inline color dots, and its collapse button was
removed (Escape dismisses it).

Typing `/` on an empty line opens an inline list while focus stays in the editor.
Type to filter (word-prefix matches first), use ↑/↓, apply with Enter or Tab, and
close with Escape or a space. Tab applies an item only while the list is open. Items
are grouped Texto / Medios / Técnico, as in the Plus menu. Inserted, converted,
duplicated and moved blocks flash briefly, and switching views fades subtly. Both
effects are disabled under `prefers-reduced-motion`.

Code language and image URL/alt/caption controls are in the active block's menu.
Technical output is not rendered on every keystroke except in the opt-in split
view. Reordering works on touch and keyboard. No drag interaction is required.

## Use and verification

- Select text for the format bar; Escape dismisses it.
- Use the gutter handle or mobile block button for conversion, duplication,
  deletion, code language, image editing and block preview.
- Type `/` on an empty line for inline insertion, or use Plus for the searchable menu.
- `Alt+↑/↓` moves the current block. `Ctrl/Cmd+Alt+P` cycles views.
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
