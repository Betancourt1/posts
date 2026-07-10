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
});
