import assert from "node:assert/strict";
import test from "node:test";
import { imageEditorHtml } from "./image-editor-template.js";
import { notebookEditorHtml } from "./notebook-editor-template.js";
import { postEditorHtml } from "./post-editor-template.js";
import { onRequestGet as getEditor } from "../admin/editor.js";

test("notebook editor clears stale private flags and exposes verified publication states", () => {
  const html = notebookEditorHtml({ siteOrigin: "https://example.com/admin" });
  assert.match(html, /nextFrontMatter\.draft = null/);
  assert.match(html, /nextFrontMatter\.hidden = null/);
  assert.match(html, /Guardado en GitHub/);
  assert.match(html, /Disponible en el blog/);
  assert.match(html, /Crear channel desde notebook/);
  assert.match(html, /assertPersistedState/);
  assert.match(html, /\/editor-core/);
  assert.doesNotMatch(html, /\/editor-core\.js/);
  assert.match(html, /window\.EditorCore\.create/);
  assert.match(html, /grid-template-columns: 2\.75rem minmax\(0, 1fr\) auto;/);
  assert.match(html, /\.top-actions \{\s+grid-column: 3;\s+grid-row: 1;/);
  assert.match(html, /class="editor-identity"/);
  assert.match(html, /@media \(max-width: 380px\)/);
  assert.match(html, /id="mobile-view-markdown"/);
  assert.match(html, /\[els\.viewMarkdown, els\.mobileViewMarkdown\]/);
  assert.match(html, /function isHomeEditor\(\)/);
  assert.match(html, /els\.notebookChannelSection\.hidden = !notebook \|\| home/);
  assert.match(html, /Boolean\(sourcePath\) && !isHomeEditor\(\)/);
});

test("text editor injects its API base and cannot save before content hydration", () => {
  const html = postEditorHtml({ apiBase: "/admin/api" });
  assert.match(html, /var apiBase = "\/admin\/api";/);
  assert.match(html, /src="\/admin\/editor-core"/);
  assert.match(html, /request\("\/api\/notebooks"\)/);
  assert.doesNotMatch(html, /request\("\/admin\/api\/notebooks"\)/);
  assert.match(html, /id="saved-pill" data-state="loading"[^>]*>Cargando<\/span>/);
  assert.match(html, /id="save" disabled/);
  assert.match(html, /id="retry-load"[^>]*hidden/);
  assert.match(html, /function loadEditor\(\)/);
  assert.match(html, /els\.save\.disabled = false;/);
  assert.match(html, /els\.retryLoad\.hidden = false;/);
  assert.doesNotMatch(html, /id="open-site"/);
  assert.doesNotMatch(html, /ICONS\.preview/);
  assert.match(html, /notebooksPromise\.catch\(function \(\) \{ return \[\]; \}\);/);
  assert.match(html, /contentPromise = loadExisting\(\);/);
  assert.doesNotMatch(html, /Promise\.all\(\[notebooksPromise, contentPromise\]\)/);
  assert.doesNotMatch(html, /content: ">";/);
  assert.match(html, /\.reference-theme \.saved-pill \{[\s\S]*?background: transparent !important;/);
  assert.match(html, /\.saved-pill,[\s\S]*?\.reference-theme \.saved-pill \{\s+display: none;/);
  assert.match(html, /\.reference-theme \.top-actions button \{[\s\S]*?background: transparent !important;/);
  assert.match(html, /id="save" disabled>[\s\S]*?Publicar/);
  assert.doesNotMatch(html, /<span class="check-label">Publicado<\/span>/);
  assert.doesNotMatch(html, /<span class="check-label">Publicar<\/span>/);
  assert.match(html, /<span class="check-label">Copiar a Are\.na<\/span>[\s\S]*?id="arena-enabled"/);
  assert.match(html, /addEventListener\("beforeunload"/);
  assert.match(html, /Hay cambios sin guardar\. ¿Quieres salir y descartarlos\?/);
  assert.match(html, /id="editor-notice"/);
  assert.match(html, /id="draft-restore"/);
  assert.match(html, />Restaurar</);
  assert.match(html, />Descartar</);
  assert.match(html, /function syncSaveButtonLabel\(\)/);
  assert.match(html, /draftStorageKey/);
  assert.match(html, /function notify\(message, kind\)/);
  assert.match(html, /overscroll-behavior: contain/);
  assert.match(html, /html\.sheet-open,/);
  assert.match(html, /function syncSheetLock\(\)/);
  assert.match(html, /max\(1rem, var\(--editor-body-size\)\)/);
  assert.doesNotMatch(html, /button\[data-format="(?:bold|italic|strike|code|heading|ol)"\][\s\S]{0,80}display: none/);
  assert.match(html, /id="settings-backdrop"[^>]*><\/button>\s*<button[^>]*id="arena-details-backdrop"[^>]*><\/button>\s*<main class="shell">/);
  assert.match(html, /<main class="shell">\s*<section class="writer">[\s\S]*?<\/section>\s*<\/main>\s*<aside class="settings"/);
  assert.match(html, /<\/aside>\s*<aside class="arena-details"/);
  assert.match(html, /els\.arenaChannel\.value = preferredId \|\| String\(arenaChannels\[0\]\.id\)/);
  assert.match(html, /function redirectToNotebook\(\)/);
  assert.match(html, /return syncArenaAfterSave\(\);[\s\S]{0,500}redirectToNotebook\(\);/);
  assert.doesNotMatch(html, /function verifySavedPublication|exists: true/);
  assert.match(html, /waitForPublicState\(publicUrl, \{ exists: false \}\)/);
  assert.match(html, /result\.deletedUrl/);
});

test("new text posts start hidden until visibility is explicitly enabled", () => {
  const html = postEditorHtml();

  assert.match(html, /els\.draft\.checked = true;\s*els\.hidden\.checked = false;/);
  assert.match(html, /draft: !els\.hidden\.checked,\s*hidden: !els\.hidden\.checked,/);
  assert.match(html, /els\.hidden\.checked = frontMatter\.draft !== true && frontMatter\.hidden !== true;/);
});

test("text editor inserts margin note samples and tones directly", () => {
  const html = postEditorHtml();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  assert.doesNotThrow(() => new Function(script));
  assert.match(html, /id="toolbar-sidenote"/);
  assert.doesNotMatch(html, /sidenote-composer|sidenote-text|data-note-wrap|data-note-tone/);
  assert.match(html, /data-sidenote-tone="green"/);
  assert.match(html, /data-sidenote-tone="blue"/);
  assert.match(html, /data-sidenote-tone="amber"/);
  assert.match(html, /els\.toolbarSidenote\.addEventListener\("click", insertSidenoteSample\)/);
  assert.match(html, /function insertSidenoteSample\(\)[\s\S]*?var target = activeTextArea\(\);/);
  assert.match(html, /target\.selectionEnd \|\| 0/);
  assert.match(html, /var reference = "\[\^" \+ id \+ "\]";/);
  assert.match(html, /var sample = "\*\*Human judgment\*\* can be _situated_ and \{\{green\|visible\}\}, \{\{blue\|linked\}\}, or \{\{amber\|contested\}\}\.";/);
  assert.match(html, /"\[\^" \+ id \+ "\]: " \+ sample/);
  assert.match(html, /target\.selectionStart = target\.selectionEnd = nextCursor/);
  assert.match(html, /function insertSidenoteTone\(tone\)[\s\S]*?\["green", "blue", "amber"\]\.includes\(tone\)[\s\S]*?wrapSelection\("\{\{" \+ tone \+ "\|", "\}\}"\)/);
  assert.match(html, /function wrapSelection\(before, after\)[\s\S]*?var selected = textarea\.value\.slice\(start, end\) \|\| "text";[\s\S]*?syncFieldsFromMarkdown\(\)[\s\S]*?recordBodyHistory\(\)/);
  assert.doesNotMatch(html, /showModal\(\)|innerHTML\s*=\s*sample|insertAdjacentHTML\([^)]*sample/);
});

test("text editor reuses Markdown mode for book templates", () => {
  const html = postEditorHtml();
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  assert.doesNotThrow(() => new Function(script));
  assert.match(html, /var editorTemplate = params\.get\("template"\) \|\| "";/);
  assert.match(html, /editorTemplate === "book" \? "markdown" : readViewMode\(\)/);
  assert.match(html, /"\*\*Progress:\*\* 0%"/);
  assert.match(html, /"\*\*Progreso:\*\* 0%"/);
  assert.match(html, /bookBodyWithProgressSyntax/);
  assert.match(html, /english \? "not set" : "sin registrar"/);
});

test("image editor uses one explicit save action and lightweight previews", () => {
  const html = imageEditorHtml({
    siteOrigin: "https://example.com/admin",
    assetOrigin: "https://example.com",
  });
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
  assert.doesNotMatch(html, /id="published"/);
  assert.match(html, /id="visible"/);
  assert.match(html, /Preview ligera · 640 px/);
  assert.match(html, /isPreview \? "image\/webp"/);
  assert.match(html, /id="publish" aria-describedby="status" disabled>Publicar<\/button>/);
  assert.match(html, /id="mobile-publish" aria-describedby="status" disabled>Publicar<\/button>/);
  assert.match(html, /publishDisabled = saveBusy \|\| images\.length === 0/);
  assert.match(html, /Hay cambios sin guardar/);
  assert.match(html, /beforeunload/);
  assert.match(html, /Falta texto alt/);
  assert.match(html, /Sin pie \(opcional\)/);
  assert.match(html, /aria-label="Carga de imágenes"/);
  assert.doesNotMatch(html, /Guardar y verificar/);
  assert.match(html, /assertPersistedState/);
  assert.doesNotMatch(html, />Publicar ↑</);
  assert.match(html, /\.property-action \{[\s\S]*?min-height: 2\.75rem;/);
  assert.match(html, /\.status-visible \{[\s\S]*?grid-row: 4;[\s\S]*?min-height: 2\.75rem;/);
  assert.match(html, /\.panel \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) auto;[\s\S]*?column-gap: 0\.75rem;[\s\S]*?row-gap: 0\.15rem;/);
  assert.doesNotMatch(html, /\.panel:not\(\.desktop-actions\)::before/);
  assert.match(html, /\.publication-steps \{[\s\S]*?grid-column: 1 \/ -1;[\s\S]*?grid-row: 2;/);
  assert.match(html, /overflow-x: hidden;[\s\S]*?overflow-y: auto;/);
  assert.match(html, /id="properties-backdrop" aria-label="Cerrar propiedades" hidden/);
  assert.match(html, /els\.propertiesBackdrop\.addEventListener\("click", closeProperties\)/);
  assert.match(html, /els\.propertiesBackdrop\.hidden = false;/);
  assert.match(html, /els\.propertiesBackdrop\.hidden = true;/);
  assert.match(html, /body\.mode-lightbox\.properties-open \.inspector,[\s\S]*?body\.mode-review\.properties-open \.inspector \{\s+display: flex;/);
  assert.match(html, /class="check property-value status-visible publication-target"/);
  assert.match(html, /id="arena-enabled" type="checkbox" \/>[\s\S]*?<span>Copiar a Are\.na<\/span>/);
  assert.doesNotMatch(html, /id="save-draft"/);
  assert.doesNotMatch(html, /mobile-save-draft/);
  assert.doesNotMatch(html, /panel-save-draft/);
  assert.match(html, /Guardar borrador/);
  assert.match(html, /id="editor-notice"/);
  assert.match(html, /overscroll-behavior: contain/);
  assert.match(html, /body\.properties-open \{\s+overflow: hidden;/);
  assert.match(html, /\.inline-date,[\s\S]*?font-size: 1rem;/);
  assert.match(html, /id="arena-channel-field" hidden/);
  assert.match(html, /\? preferredId : String\(arenaChannels\[0\]\.id\)/);
  assert.match(html, /function redirectToNotebook\(\)/);
  assert.match(html, /return syncArenaAfterSave\(els\.draft\.checked\);[\s\S]{0,500}redirectToNotebook\(\);/);
  assert.doesNotMatch(html, /function verifySavedPublication|waitForPublicState/);
  assert.doesNotMatch(html, /content: ">";/);
  assert.match(html, /function loadExistingPhoto\(\)/);
  assert.match(html, /request\("\/page\?path=" \+ encodeURIComponent\(sourcePath\)\)/);
  assert.match(html, /loadExistingPhoto\(\)\.then\(loadArenaStatus\)/);
  assert.match(html, /params\.get\("arena_channel"\) \|\| els\.arenaChannel\.value \|\| ""/);
  assert.match(html, /request\("\/arena-status\?path=" \+ encodeURIComponent\(savedPath\)\)/);
  assert.match(html, /imagen copiada · actualización pendiente/);
  assert.match(html, /setStatus\(images\.length \? "Publicación cargada\."/);
  assert.match(html, /return images\.reduce\(function \(chain, image, index\)/);
  assert.doesNotMatch(html, /Math\.min\(2, images\.length\)/);
  assert.match(html, /return image\.previewUrl \|\| \(image\.uploadedUrl \? siteUrl\(image\.uploadedUrl\) : ""\)/);
  assert.match(html, /var assetOrigin = "https:\/\/example\.com";/);
  assert.match(html, /return assetOrigin \+ \(url\.charAt\(0\) === "\/" \? url : "\/" \+ url\)/);
});

test("photography paths use the specialized image editor", async () => {
  const response = await getEditor({
    request: new Request("https://example.com/admin/editor?mode=edit&path=content_es%2Ffotografia%2Fzmg.md&kind=post"),
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/admin/image-editor?mode=edit&path=content_es%2Ffotografia%2Fzmg.md&kind=post",
  );
});

test("photography notebook paths stay in the notebook editor", async () => {
  const response = await getEditor({
    request: new Request("https://example.com/admin/editor?mode=edit&path=content_es%2Ffotografia%2F_index.md&kind=notebook"),
  });

  assert.equal(response.status, 302);
  assert.equal(
    response.headers.get("location"),
    "https://example.com/admin/notebook-editor?mode=edit&path=content_es%2Ffotografia%2F_index.md&kind=notebook",
  );
});

test("explicit editor templates lock their content kind", () => {
  const notebookHtml = notebookEditorHtml();
  const postHtml = postEditorHtml();

  assert.match(notebookHtml, /var editorController = \{"kind":"notebook"/);
  assert.match(postHtml, /var editorController = \{"kind":"post"/);
  assert.doesNotMatch(notebookHtml, /params\.get\("kind"\)/);
  assert.doesNotMatch(postHtml, /params\.get\("kind"\)/);
});
