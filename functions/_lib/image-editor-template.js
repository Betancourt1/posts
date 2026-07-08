function iconSvg(paths) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const ICONS = Object.freeze({
  back: iconSvg(`<path d="m15 18-6-6 6-6" />`),
  upload: iconSvg(`<path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />`),
  replace: iconSvg(`<path d="M21 12a9 9 0 0 0-15-6.7L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" /><path d="M21 21v-5h-5" />`),
  crop: iconSvg(`<path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" />`),
  rotate: iconSvg(`<path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />`),
  preview: iconSvg(`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />`),
});

export function imageEditorHtml({ siteOrigin = "", assetOrigin = "", apiBase = "/api" } = {}) {
  const SITE_ORIGIN = String(siteOrigin || "https://fbetancourt.work").replace(/\/+$/, "");
  const ASSET_ORIGIN = String(assetOrigin || SITE_ORIGIN).replace(/\/+$/, "");
  const API_BASE = String(apiBase || "/api").replace(/\/+$/, "");

  function siteAssetUrl(assetPath) {
    return `${ASSET_ORIGIN}/${String(assetPath).replace(/^\/+/, "")}`;
  }

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Image Post Editor</title>
  <link rel="apple-touch-icon" href="${siteAssetUrl("favicon-32.png")}" />
  <link rel="icon" type="image/png" sizes="32x32" href="${siteAssetUrl("favicon-32.png")}" />
  <link rel="icon" type="image/png" sizes="16x16" href="${siteAssetUrl("favicon-16.png")}" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #050506;
      --panel: #0d0e11;
      --panel-2: #12151a;
      --field: #08090b;
      --line: #252932;
      --line-soft: #171a20;
      --ink: #f1f2f3;
      --muted: #8f96a3;
      --dim: #bcc1c8;
      --accent: #4ecca3;
      --accent-ink: #07110e;
      --danger: #ff6b6b;
      --warning: #f2a93b;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body {
      min-height: 100%;
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--sans);
    }
    body {
      padding-bottom: calc(5.8rem + env(safe-area-inset-bottom));
    }
    button,
    input,
    select,
    textarea {
      font: inherit;
    }
    button {
      cursor: pointer;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 4.45rem;
      padding: 0.7rem clamp(1rem, 3vw, 2rem);
      border-bottom: 1px solid var(--line-soft);
      background: rgba(5, 5, 6, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .icon-button {
      width: 2.65rem;
      height: 2.65rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      color: var(--dim);
      padding: 0;
    }
    .icon-button svg,
    .tool-button svg,
    .upload-mark svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .icon-button:hover,
    .tool-button:hover {
      color: var(--accent);
    }
    .save-state {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 2.2rem;
      padding: 0 0.75rem;
      border: 1px solid var(--line);
      background: var(--panel-2);
      color: var(--dim);
      border-radius: 0.5rem;
      font-family: var(--mono);
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .save-state::before {
      content: "";
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 999px;
      background: var(--warning);
    }
    .save-state.is-saved::before {
      background: var(--accent);
    }
    .save-state.is-error::before {
      background: var(--danger);
    }
    .primary-button,
    .secondary-button {
      min-height: 3rem;
      border-radius: 0.45rem;
      padding: 0 1.1rem;
      font-weight: 800;
      border: 1px solid transparent;
    }
    .primary-button {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .secondary-button {
      background: var(--panel-2);
      color: var(--ink);
      border-color: var(--line);
    }
    .primary-button:disabled,
    .secondary-button:disabled,
    .tool-button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .shell {
      width: min(100%, 1180px);
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(19rem, 25rem);
      gap: clamp(1rem, 3vw, 2rem);
      padding: clamp(1.25rem, 4vw, 2.5rem);
    }
    .workspace,
    .panel {
      min-width: 0;
    }
    .workspace-head {
      display: grid;
      justify-items: center;
      gap: 0.35rem;
      margin-bottom: 1rem;
      text-align: center;
    }
    .eyebrow {
      margin: 0;
      font-family: var(--mono);
      color: var(--muted);
      font-size: 0.78rem;
    }
    h1,
    h2 {
      margin: 0;
      font-family: var(--mono);
      letter-spacing: 0;
    }
    h1 {
      font-size: clamp(2.1rem, 7vw, 3.3rem);
      line-height: 0.95;
      color: var(--accent);
    }
    h2 {
      font-size: 1rem;
      color: var(--ink);
    }
    .dropzone {
      min-height: min(72vh, 44rem);
      border: 1px dashed var(--line);
      border-radius: 0.75rem;
      background: linear-gradient(180deg, rgba(18, 21, 26, 0.9), rgba(9, 10, 12, 0.94));
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .dropzone.is-dragging {
      border-color: var(--accent);
      background: rgba(78, 204, 163, 0.06);
    }
    .empty-state {
      width: min(100%, 28rem);
      display: grid;
      justify-items: center;
      gap: 0.85rem;
      padding: 2rem;
      text-align: center;
    }
    .upload-mark {
      width: 5.5rem;
      height: 5.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
      border: 1px solid var(--line);
      background: var(--field);
      position: relative;
    }
    .pixel-image-mark {
      width: 3.4rem;
      height: 3.4rem;
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-template-rows: repeat(7, 1fr);
      gap: 2px;
    }
    .pixel-image-mark span {
      background: rgba(78, 204, 163, 0.16);
    }
    .pixel-image-mark span:nth-child(1),
    .pixel-image-mark span:nth-child(2),
    .pixel-image-mark span:nth-child(3),
    .pixel-image-mark span:nth-child(4),
    .pixel-image-mark span:nth-child(5),
    .pixel-image-mark span:nth-child(6),
    .pixel-image-mark span:nth-child(7),
    .pixel-image-mark span:nth-child(8),
    .pixel-image-mark span:nth-child(14),
    .pixel-image-mark span:nth-child(15),
    .pixel-image-mark span:nth-child(21),
    .pixel-image-mark span:nth-child(22),
    .pixel-image-mark span:nth-child(28),
    .pixel-image-mark span:nth-child(29),
    .pixel-image-mark span:nth-child(35),
    .pixel-image-mark span:nth-child(36),
    .pixel-image-mark span:nth-child(42),
    .pixel-image-mark span:nth-child(43),
    .pixel-image-mark span:nth-child(44),
    .pixel-image-mark span:nth-child(45),
    .pixel-image-mark span:nth-child(46),
    .pixel-image-mark span:nth-child(47),
    .pixel-image-mark span:nth-child(48),
    .pixel-image-mark span:nth-child(49),
    .pixel-image-mark span:nth-child(18),
    .pixel-image-mark span:nth-child(19),
    .pixel-image-mark span:nth-child(32),
    .pixel-image-mark span:nth-child(33),
    .pixel-image-mark span:nth-child(34),
    .pixel-image-mark span:nth-child(39),
    .pixel-image-mark span:nth-child(40),
    .pixel-image-mark span:nth-child(41) {
      background: var(--accent);
    }
    .empty-state h2 {
      font-size: 1.35rem;
    }
    .empty-state p {
      margin: 0;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.9rem;
      line-height: 1.6;
    }
    .helper-copy {
      font-size: 0.74rem !important;
      color: var(--dim) !important;
    }
    .preview-state {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: minmax(20rem, 1fr) auto;
    }
    .image-stage {
      min-height: min(60vh, 34rem);
      display: grid;
      place-items: center;
      background: #020203;
      overflow: hidden;
    }
    .image-stage img {
      display: block;
      max-width: 100%;
      max-height: min(70vh, 42rem);
      object-fit: contain;
      transition: transform 0.2s ease;
    }
    .image-stage.is-cropped {
      aspect-ratio: 1 / 1;
      min-height: auto;
    }
    .image-stage.is-cropped img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .image-tools {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      border-top: 1px solid var(--line-soft);
      background: var(--panel);
    }
    .tool-button {
      min-height: 3.7rem;
      border: 0;
      border-right: 1px solid var(--line-soft);
      background: transparent;
      color: var(--dim);
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      font-family: var(--mono);
      font-size: 0.78rem;
    }
    .tool-button:last-child {
      border-right: 0;
    }
    .tool-button.is-active {
      color: var(--accent);
      background: rgba(78, 204, 163, 0.07);
    }
    .inspector {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel {
      border: 1px solid var(--line-soft);
      background: var(--panel);
      padding: 1rem;
    }
    .panel h2 {
      margin-bottom: 0.9rem;
    }
    .preview-panel {
      display: grid;
      gap: 0.75rem;
    }
    .preview-box {
      min-height: 8rem;
      border: 1px dashed var(--line);
      border-radius: 0.55rem;
      background: var(--field);
      display: grid;
      place-items: center;
      overflow: hidden;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.8rem;
    }
    .preview-box img {
      width: 100%;
      height: 100%;
      max-height: 12rem;
      object-fit: cover;
      display: block;
    }
    .preview-meta {
      margin: 0;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.76rem;
      line-height: 1.45;
    }
    .field {
      display: grid;
      gap: 0.45rem;
      margin-bottom: 0.9rem;
    }
    .field:last-child {
      margin-bottom: 0;
    }
    .field span,
    .check span {
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 800;
    }
    input,
    select,
    textarea {
      width: 100%;
      min-height: 3rem;
      border: 1px solid var(--line);
      border-radius: 0.4rem;
      background: var(--field);
      color: var(--ink);
      padding: 0.75rem 0.85rem;
      outline: none;
    }
    textarea {
      min-height: 6rem;
      resize: vertical;
      line-height: 1.45;
    }
    input:focus,
    select:focus,
    textarea:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px rgba(78, 204, 163, 0.12);
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 2.3rem;
    }
    .check input {
      width: 1.15rem;
      height: 1.15rem;
      min-height: 0;
      accent-color: var(--accent);
    }
    .desktop-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .status-line {
      min-height: 1.4rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .status-line.is-error {
      color: var(--danger);
    }
    .saved-link {
      color: var(--accent);
      text-decoration: none;
      font-family: var(--mono);
      font-size: 0.82rem;
    }
    .saved-link[hidden],
    [hidden] {
      display: none !important;
    }
    .mobile-actions {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 30;
      display: none;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      padding: 0.85rem 1rem calc(0.85rem + env(safe-area-inset-bottom));
      border-top: 1px solid var(--line-soft);
      background: rgba(5, 5, 6, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    @media (max-width: 820px) {
      body {
        padding-bottom: calc(5.5rem + env(safe-area-inset-bottom));
      }
      .topbar {
        min-height: 4rem;
      }
      .shell {
        display: block;
        padding: 1.2rem 1rem 2rem;
      }
      .workspace-head {
        margin-bottom: 0.85rem;
      }
      .dropzone {
        min-height: 24rem;
      }
      .image-stage {
        min-height: 20rem;
      }
      .image-tools {
        grid-template-columns: repeat(4, 1fr);
      }
      .inspector {
        margin-top: 1rem;
      }
      .panel {
        padding: 0.9rem;
      }
      .desktop-actions {
        display: none;
      }
      .mobile-actions {
        display: grid;
      }
    }
    @media (max-width: 440px) {
      .save-state {
        max-width: 9.5rem;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .dropzone {
        min-height: 21rem;
      }
      .tool-button {
        min-height: 3.45rem;
        font-size: 0.68rem;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-left">
      <button type="button" class="icon-button" id="back" aria-label="Back" title="Back">${ICONS.back}</button>
      <span class="save-state" id="save-state">Unsaved</span>
    </div>
  </header>

  <main class="shell">
    <section class="workspace">
      <div class="workspace-head">
        <div>
          <p class="eyebrow">New image</p>
          <h1>Image post</h1>
        </div>
      </div>

      <div class="dropzone" id="dropzone" aria-label="Image upload area">
        <div class="empty-state" id="empty-state">
          <span class="upload-mark" aria-hidden="true">
            <span class="pixel-image-mark">
              ${Array.from({ length: 49 }, () => "<span></span>").join("")}
            </span>
          </span>
          <h2>Drop image here</h2>
          <p>Start with the image. Details come after the preview looks right.</p>
          <p class="helper-copy">JPG, PNG, GIF, WebP, or SVG. Max 12 MB.</p>
          <button type="button" class="primary-button" id="choose-image">Choose image</button>
        </div>

        <div class="preview-state" id="preview-state" hidden>
          <div class="image-stage" id="image-stage">
            <img id="image-preview" alt="" />
          </div>
          <div class="image-tools">
            <button type="button" class="tool-button" id="replace-image">${ICONS.replace}<span>Replace</span></button>
            <button type="button" class="tool-button" id="crop-image">${ICONS.crop}<span>Crop</span></button>
            <button type="button" class="tool-button" id="rotate-image">${ICONS.rotate}<span>Rotate</span></button>
            <button type="button" class="tool-button" id="preview-image">${ICONS.preview}<span>Preview</span></button>
          </div>
        </div>

        <input id="image-file" type="file" accept="image/*" hidden />
      </div>
    </section>

    <aside class="inspector">
      <section class="panel preview-panel">
        <h2>Image preview</h2>
        <div class="preview-box" id="preview-box">
          <span id="preview-empty">No image selected</span>
          <img id="preview-thumb" alt="" hidden />
        </div>
        <p class="preview-meta" id="preview-meta">Choose an image to see file details.</p>
      </section>

      <section class="panel">
        <h2>Details</h2>
        <label class="field">
          <span>Title</span>
          <input id="title" type="text" placeholder="Title" autocomplete="off" />
        </label>
        <label class="field">
          <span>Caption</span>
          <input id="caption" type="text" placeholder="Optional caption" />
        </label>
        <label class="field">
          <span>Alt text</span>
          <input id="alt" type="text" placeholder="Describe the image" />
        </label>
        <textarea id="body" hidden></textarea>
      </section>

      <section class="panel">
        <h2>Publishing</h2>
        <label class="field">
          <span>Notebook</span>
          <select id="notebook"></select>
        </label>
        <label class="field">
          <span>Date</span>
          <input id="date" type="date" />
        </label>
        <label class="field">
          <span>Tags</span>
          <input id="tags" type="text" placeholder="fotografia" />
        </label>
        <label class="check">
          <input id="draft" type="checkbox" checked />
          <span>Draft</span>
        </label>
      </section>

      <section class="panel desktop-actions">
        <button type="button" class="secondary-button" id="save-draft">Save draft</button>
        <button type="button" class="primary-button" id="publish">Publish</button>
      </section>

      <p class="status-line" id="status">Choose an image to start.</p>
      <a class="saved-link" id="saved-link" href="#" hidden>Open saved post</a>
    </aside>
  </main>

  <footer class="mobile-actions">
    <button type="button" class="secondary-button" id="mobile-save-draft">Save draft</button>
    <button type="button" class="primary-button" id="mobile-publish">Publish</button>
  </footer>

  <script>
    (function () {
      var apiBase = ${JSON.stringify(API_BASE)};
      var siteOrigin = ${JSON.stringify(SITE_ORIGIN)};
      var params = new URLSearchParams(window.location.search);
      var preferredNotebook = params.get("notebook") || "content_es/posts";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var imageFile = null;
      var previewUrl = "";
      var uploadedImageUrl = "";
      var savedPath = "";
      var savedUrl = "";
      var rotation = 0;
      var cropMode = false;
      var needsUpload = false;
      var saveBusy = false;

      var els = {
        back: document.getElementById("back"),
        saveState: document.getElementById("save-state"),
        saveDraft: document.getElementById("save-draft"),
        publish: document.getElementById("publish"),
        mobileSaveDraft: document.getElementById("mobile-save-draft"),
        mobilePublish: document.getElementById("mobile-publish"),
        dropzone: document.getElementById("dropzone"),
        emptyState: document.getElementById("empty-state"),
        previewState: document.getElementById("preview-state"),
        imageStage: document.getElementById("image-stage"),
        imagePreview: document.getElementById("image-preview"),
        previewBox: document.getElementById("preview-box"),
        previewEmpty: document.getElementById("preview-empty"),
        previewThumb: document.getElementById("preview-thumb"),
        previewMeta: document.getElementById("preview-meta"),
        imageFile: document.getElementById("image-file"),
        chooseImage: document.getElementById("choose-image"),
        replaceImage: document.getElementById("replace-image"),
        cropImage: document.getElementById("crop-image"),
        rotateImage: document.getElementById("rotate-image"),
        previewImage: document.getElementById("preview-image"),
        title: document.getElementById("title"),
        caption: document.getElementById("caption"),
        alt: document.getElementById("alt"),
        body: document.getElementById("body"),
        notebook: document.getElementById("notebook"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        draft: document.getElementById("draft"),
        status: document.getElementById("status"),
        savedLink: document.getElementById("saved-link"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        els.date.value = today();
        bind();
        loadNotebooks().catch(function (error) {
          setStatus(error.message, true);
        });
      }

      function bind() {
        els.back.addEventListener("click", function () {
          window.close();
          window.history.back();
        });
        els.chooseImage.addEventListener("click", chooseImage);
        els.replaceImage.addEventListener("click", chooseImage);
        els.imageFile.addEventListener("change", function () {
          var file = els.imageFile.files && els.imageFile.files[0];
          if (file) {
            setImageFile(file);
          }
        });
        els.dropzone.addEventListener("dragover", function (event) {
          event.preventDefault();
          els.dropzone.classList.add("is-dragging");
        });
        els.dropzone.addEventListener("dragleave", function () {
          els.dropzone.classList.remove("is-dragging");
        });
        els.dropzone.addEventListener("drop", function (event) {
          event.preventDefault();
          els.dropzone.classList.remove("is-dragging");
          var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
          if (file) {
            setImageFile(file);
          }
        });
        els.cropImage.addEventListener("click", function () {
          if (!imageFile) return;
          cropMode = !cropMode;
          needsUpload = true;
          syncPreview();
          markUnsaved(cropMode ? "Square crop enabled." : "Square crop disabled.");
        });
        els.rotateImage.addEventListener("click", function () {
          if (!imageFile) return;
          rotation = (rotation + 90) % 360;
          needsUpload = true;
          syncPreview();
          markUnsaved("Image rotated " + rotation + " degrees.");
        });
        els.previewImage.addEventListener("click", function () {
          var url = uploadedImageUrl ? siteUrl(uploadedImageUrl) : previewUrl;
          if (url) {
            window.open(url, "_blank", "noopener");
          }
        });
        els.notebook.addEventListener("change", function () {
          syncDefaultTags();
          markUnsaved();
        });
        [els.title, els.caption, els.alt, els.body, els.date, els.tags].forEach(function (input) {
          input.addEventListener("input", function () {
            markUnsaved();
          });
        });
        els.draft.addEventListener("change", function () {
          markUnsaved();
        });
        els.saveDraft.addEventListener("click", function () {
          savePost(true, false);
        });
        els.mobileSaveDraft.addEventListener("click", function () {
          savePost(true, false);
        });
        els.publish.addEventListener("click", function () {
          savePost(false, true);
        });
        els.mobilePublish.addEventListener("click", function () {
          savePost(false, true);
        });
      }

      function request(path, options) {
        return fetch(apiBase + path, options || {}).then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (payload) {
            if (!response.ok || payload.error) {
              throw new Error(payload.error || "Author API error.");
            }
            return payload;
          });
        });
      }

      function postJson(path, payload) {
        return request(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      function loadNotebooks() {
        return request("/notebooks").then(function (payload) {
          els.notebook.innerHTML = "";
          (payload.notebooks || []).forEach(function (notebook) {
            var option = document.createElement("option");
            option.value = notebook.path;
            option.textContent = notebook.title + " (" + notebook.lang + ")";
            if (notebook.path === preferredNotebook) {
              option.selected = true;
            }
            els.notebook.appendChild(option);
          });
          if (!els.notebook.value && els.notebook.options.length) {
            els.notebook.options[0].selected = true;
          }
          syncDefaultTags();
        });
      }

      function chooseImage() {
        els.imageFile.click();
      }

      function setImageFile(file) {
        if (!file.type || file.type.indexOf("image/") !== 0) {
          setStatus("Choose an image file.", true);
          return;
        }
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        imageFile = file;
        previewUrl = URL.createObjectURL(file);
        uploadedImageUrl = "";
        rotation = 0;
        cropMode = false;
        needsUpload = true;
        els.imagePreview.src = previewUrl;
        els.previewThumb.src = previewUrl;
        els.previewThumb.hidden = false;
        els.previewEmpty.hidden = true;
        els.previewMeta.textContent = file.name + " - " + (file.type || "image") + " - " + formatBytes(file.size);
        els.imagePreview.alt = els.alt.value || els.title.value || filenameTitle(file.name);
        els.previewThumb.alt = els.imagePreview.alt;
        if (!els.title.value.trim()) {
          els.title.value = filenameTitle(file.name);
        }
        if (!els.alt.value.trim()) {
          els.alt.value = filenameTitle(file.name);
        }
        syncPreview();
        markUnsaved("Image ready.");
      }

      function syncPreview() {
        var hasImage = Boolean(imageFile || uploadedImageUrl);
        els.emptyState.hidden = hasImage;
        els.previewState.hidden = !hasImage;
        els.imageStage.classList.toggle("is-cropped", cropMode);
        els.cropImage.classList.toggle("is-active", cropMode);
        els.imagePreview.style.transform = "rotate(" + rotation + "deg)";
      }

      function syncDefaultTags() {
        if (els.notebook.value === "content_es/fotografia" && !els.tags.value.trim()) {
          els.tags.value = "fotografia";
        }
      }

      function markUnsaved(message) {
        setSaveState("Unsaved", "");
        if (message) {
          setStatus(message, false);
        }
      }

      function setSaveState(text, state) {
        els.saveState.textContent = text;
        els.saveState.classList.toggle("is-saved", state === "saved");
        els.saveState.classList.toggle("is-error", state === "error");
      }

      function setStatus(message, isError) {
        els.status.textContent = message;
        els.status.classList.toggle("is-error", Boolean(isError));
        if (isError) {
          setSaveState("Needs fix", "error");
        }
      }

      function setBusy(isBusy) {
        saveBusy = isBusy;
        [els.saveDraft, els.publish, els.mobileSaveDraft, els.mobilePublish].forEach(function (button) {
          button.disabled = isBusy;
        });
      }

      function savePost(saveAsDraft, redirectAfterSave) {
        if (saveBusy) return;
        if (!validatePost()) return;
        setBusy(true);
        setSaveState("Saving", "");
        setStatus("Preparing image.", false);
        ensureUploadedImage().then(function (imageUrl) {
          var draft = saveAsDraft ? true : false;
          els.draft.checked = draft;
          var frontMatter = imageFrontMatter(imageUrl, draft);
          if (savedPath) {
            return postJson("/save-page", {
              path: savedPath,
              frontMatter: frontMatter,
              body: els.body.value,
            });
          }
          return postJson("/create-post", {
            notebook: els.notebook.value,
            title: frontMatter.title,
            date: frontMatter.date,
            tags: frontMatter.tags,
            summary: frontMatter.summary,
            draft: draft,
            image: frontMatter.image,
            imageAlt: frontMatter.image_alt,
            caption: frontMatter.caption || "",
            body: els.body.value,
          });
        }).then(function (result) {
          savedPath = result.path || savedPath;
          savedUrl = result.url || savedUrl;
          setSaveState("Saved", "saved");
          setStatus(redirectAfterSave ? "Published." : "Draft saved.", false);
          if (savedUrl) {
            els.savedLink.href = siteUrl(savedUrl);
            els.savedLink.hidden = false;
          }
          if (redirectAfterSave && savedUrl) {
            window.location.assign(siteUrl(savedUrl));
          }
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          setBusy(false);
        });
      }

      function validatePost() {
        if (!imageFile && !uploadedImageUrl) {
          setStatus("Choose an image before saving.", true);
          els.chooseImage.focus();
          return false;
        }
        if (!els.title.value.trim()) {
          setStatus("Add a title.", true);
          els.title.focus();
          return false;
        }
        if (!els.notebook.value) {
          setStatus("Choose a notebook.", true);
          els.notebook.focus();
          return false;
        }
        return true;
      }

      function imageFrontMatter(imageUrl, draft) {
        var caption = els.caption.value.trim();
        var summary = caption;
        return {
          title: els.title.value.trim(),
          date: els.date.value || today(),
          draft: draft,
          tags: splitTags(els.tags.value),
          summary: summary,
          image: imageUrl,
          image_alt: els.alt.value.trim() || els.title.value.trim(),
          caption: caption,
        };
      }

      function ensureUploadedImage() {
        if (uploadedImageUrl && !needsUpload) {
          return Promise.resolve(uploadedImageUrl);
        }
        setStatus("Uploading image.", false);
        return imagePayload().then(function (payload) {
          return postJson("/upload-image", payload);
        }).then(function (result) {
          uploadedImageUrl = result.url;
          needsUpload = false;
          return uploadedImageUrl;
        });
      }

      function imagePayload() {
        if (!imageFile) {
          return Promise.reject(new Error("Choose an image before saving."));
        }
        return transformedFile().then(function (fileLike) {
          return fileToDataUrl(fileLike.blob).then(function (data) {
            return {
              name: fileLike.name,
              alt: els.alt.value.trim() || els.title.value.trim() || filenameTitle(imageFile.name),
              caption: els.caption.value.trim(),
              data: data,
            };
          });
        });
      }

      function transformedFile() {
        var needsTransform = cropMode || rotation !== 0;
        if (!needsTransform) {
          return Promise.resolve({
            blob: imageFile,
            name: uniqueImageName(imageFile.name, imageFile.type),
          });
        }
        if (imageFile.type === "image/svg+xml" || imageFile.type === "image/gif") {
          return Promise.reject(new Error("Crop and rotate are only available for still raster images."));
        }
        return drawTransformedImage(imageFile, rotation, cropMode).then(function (blob) {
          return {
            blob: blob,
            name: uniqueImageName(imageFile.name, blob.type),
          };
        });
      }

      function drawTransformedImage(file, angle, cropSquare) {
        return loadImage(file).then(function (img) {
          var sourceWidth = img.naturalWidth || img.width;
          var sourceHeight = img.naturalHeight || img.height;
          var sx = 0;
          var sy = 0;
          var sw = sourceWidth;
          var sh = sourceHeight;
          if (cropSquare) {
            var side = Math.min(sourceWidth, sourceHeight);
            sx = Math.floor((sourceWidth - side) / 2);
            sy = Math.floor((sourceHeight - side) / 2);
            sw = side;
            sh = side;
          }
          var normalized = ((angle % 360) + 360) % 360;
          var swaps = normalized === 90 || normalized === 270;
          var canvas = document.createElement("canvas");
          canvas.width = swaps ? sh : sw;
          canvas.height = swaps ? sw : sh;
          var ctx = canvas.getContext("2d");
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(normalized * Math.PI / 180);
          ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
          URL.revokeObjectURL(img.src);
          return new Promise(function (resolve, reject) {
            var type = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
            canvas.toBlob(function (blob) {
              if (!blob) {
                reject(new Error("Could not prepare image."));
                return;
              }
              resolve(blob);
            }, type, 0.92);
          });
        });
      }

      function loadImage(file) {
        return new Promise(function (resolve, reject) {
          var img = new Image();
          img.onload = function () {
            resolve(img);
          };
          img.onerror = function () {
            URL.revokeObjectURL(img.src);
            reject(new Error("Could not read image."));
          };
          img.src = URL.createObjectURL(file);
        });
      }

      function fileToDataUrl(blob) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();
          reader.onload = function () {
            resolve(reader.result);
          };
          reader.onerror = function () {
            reject(new Error("Could not read image."));
          };
          reader.readAsDataURL(blob);
        });
      }

      function siteUrl(url) {
        if (!url) return "";
        if (/^https?:\\/\\//.test(url)) {
          return url;
        }
        return siteOrigin + (url.charAt(0) === "/" ? url : "/" + url);
      }

      function uniqueImageName(name, mime) {
        var ext = extensionFor(mime, name);
        var base = slugify(name.replace(/\\.[^.]+$/, "")) || "image";
        return base + "-" + Date.now() + ext;
      }

      function extensionFor(mime, fallbackName) {
        if (mime === "image/jpeg") return ".jpg";
        if (mime === "image/png") return ".png";
        if (mime === "image/webp") return ".webp";
        if (mime === "image/gif") return ".gif";
        if (mime === "image/svg+xml") return ".svg";
        var match = String(fallbackName || "").match(/\\.[a-z0-9]+$/i);
        return match ? match[0].toLowerCase() : ".jpg";
      }

      function splitTags(value) {
        return String(value || "")
          .split(",")
          .map(function (tag) { return tag.trim(); })
          .filter(Boolean);
      }

      function formatBytes(bytes) {
        var size = Number(bytes || 0);
        if (size >= 1024 * 1024) {
          return (size / (1024 * 1024)).toFixed(1) + " MB";
        }
        if (size >= 1024) {
          return Math.round(size / 1024) + " KB";
        }
        return size + " B";
      }

      function filenameTitle(name) {
        return String(name || "Image")
          .replace(/\\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .replace(/\\s+/g, " ")
          .trim() || "Image";
      }

      function slugify(value) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      function today() {
        var parts = new Intl.DateTimeFormat("en", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        var values = {};
        parts.forEach(function (part) {
          values[part.type] = part.value;
        });
        return values.year + "-" + values.month + "-" + values.day;
      }
    })();
  </script>
</body>
</html>`;
}
