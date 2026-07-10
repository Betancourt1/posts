import assert from "node:assert/strict";
import test from "node:test";
import { authorEditorHtml } from "./editor-template.js";
import { imageEditorHtml } from "./image-editor-template.js";

test("notebook editor clears stale private flags and exposes verified publication states", () => {
  const html = authorEditorHtml({ siteOrigin: "https://example.com/admin" });
  assert.match(html, /nextFrontMatter\.draft = null/);
  assert.match(html, /nextFrontMatter\.hidden = null/);
  assert.match(html, /Guardado en GitHub/);
  assert.match(html, /Disponible en el blog/);
  assert.match(html, /Crear channel desde notebook/);
  assert.match(html, /assertPersistedState/);
  assert.match(html, /apiBase \+ path\.slice\(4\)/);
  assert.match(html, /grid-template-columns: 2\.75rem minmax\(0, 1fr\);/);
  assert.match(html, /\.top-actions \{\s+grid-column: 1 \/ -1;\s+grid-row: 2;/);
  assert.match(html, /class="editor-identity"/);
  assert.match(html, /@media \(max-width: 380px\)/);
  assert.match(html, /id="mobile-view-markdown"/);
  assert.match(html, /\[els\.viewMarkdown, els\.mobileViewMarkdown\]/);
});

test("text editor injects its API base and cannot save before content hydration", () => {
  const html = authorEditorHtml({ apiBase: "/admin/api" });
  assert.match(html, /var apiBase = "\/admin\/api";/);
  assert.match(html, /id="saved-pill" data-state="loading"[^>]*>Cargando<\/span>/);
  assert.match(html, /id="save" disabled/);
  assert.match(html, /id="retry-load"[^>]*hidden/);
  assert.match(html, /function loadEditor\(\)/);
  assert.match(html, /els\.save\.disabled = false;/);
  assert.match(html, /els\.retryLoad\.hidden = false;/);
  assert.match(html, /notebooksPromise\.catch\(function \(\) \{ return \[\]; \}\);/);
  assert.match(html, /contentPromise = loadExisting\(\);/);
  assert.doesNotMatch(html, /Promise\.all\(\[notebooksPromise, contentPromise\]\)/);
  assert.doesNotMatch(html, /content: ">";/);
  assert.match(html, /\.reference-theme \.saved-pill \{[\s\S]*?background: transparent !important;/);
  assert.match(html, /\.reference-theme \.top-actions button \{[\s\S]*?background: transparent !important;/);
});

test("image editor uses one explicit save action and lightweight previews", () => {
  const html = imageEditorHtml({ siteOrigin: "https://example.com/admin" });
  assert.match(html, /id="published"/);
  assert.match(html, /id="visible"/);
  assert.match(html, /Preview ligera · 640 px/);
  assert.match(html, /isPreview \? "image\/webp"/);
  assert.match(html, /Guardar y verificar/);
  assert.match(html, /assertPersistedState/);
  assert.doesNotMatch(html, />Publicar ↑</);
  assert.match(html, /\.property-action \{[\s\S]*?min-height: 2\.75rem;/);
  assert.match(html, /\.status-visible \{[\s\S]*?grid-row: 4;[\s\S]*?min-height: 2\.75rem;/);
  assert.match(html, /class="check property-value status-visible"/);
  assert.doesNotMatch(html, /content: ">";/);
});
