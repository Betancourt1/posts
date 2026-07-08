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
      --bg: #000000;
      --field: #050607;
      --line: #24272e;
      --line-soft: #14161a;
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
      padding-bottom: 0;
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
      gap: 1rem;
      min-height: 4.1rem;
      padding: 0.75rem clamp(1.2rem, 3vw, 2.4rem);
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      min-width: 0;
    }
    .brand {
      display: grid;
      gap: 0.05rem;
      text-decoration: none;
    }
    .brand strong {
      color: var(--accent);
      font-family: var(--mono);
      font-size: 1.2rem;
      line-height: 1;
    }
    .brand span {
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.68rem;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: clamp(0.95rem, 2.4vw, 2rem);
      min-width: 0;
    }
    .icon-button {
      width: 2rem;
      height: 2rem;
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
    .text-action svg,
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
    .tool-button:hover,
    .text-action:hover {
      color: var(--accent);
    }
    .save-state {
      display: none;
      align-items: center;
      gap: 0.4rem;
      color: var(--dim);
      font-family: var(--mono);
      font-size: 0.74rem;
      white-space: nowrap;
    }
    .save-state::before {
      content: "";
      width: 0.42rem;
      height: 0.42rem;
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
    .secondary-button,
    .text-action {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      border: 0;
      background: transparent;
      color: var(--dim);
      padding: 0;
      font-family: var(--mono);
      font-size: 0.82rem;
      line-height: 1.2;
    }
    .primary-button,
    .text-action.is-primary {
      color: var(--accent);
      font-weight: 800;
    }
    .topbar-actions .secondary-button {
      color: var(--muted);
      font-size: 0.74rem;
    }
    .primary-button:disabled,
    .secondary-button:disabled,
    .tool-button:disabled,
    .text-action:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }
    .shell {
      width: min(100%, 1440px);
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr) minmax(14rem, 22rem);
      gap: clamp(1.2rem, 3vw, 3.2rem);
      padding: clamp(1.2rem, 3vw, 2.4rem);
    }
    .workspace,
    .inspector,
    .editor-rail {
      min-width: 0;
    }
    .editor-rail {
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
      padding-top: 3.5rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.82rem;
    }
    .rail-group {
      display: grid;
      gap: 0.9rem;
    }
    .rail-heading {
      margin: 0;
      color: var(--dim);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .rail-link {
      color: var(--muted);
      text-decoration: none;
    }
    .rail-link.is-active {
      color: var(--accent);
    }
    .rail-link.is-active::before {
      content: "";
      display: inline-block;
      width: 0.42rem;
      height: 0.42rem;
      margin-right: 0.55rem;
      border-radius: 999px;
      background: var(--accent);
      vertical-align: 0.05em;
    }
    .workspace {
      padding-top: 2.6rem;
    }
    .post-head {
      display: grid;
      gap: 0.7rem;
      margin: 0 0 1.35rem;
    }
    .post-kicker {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.78rem;
    }
    .inline-date {
      width: auto;
      min-height: 0;
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 0;
      font-family: var(--mono);
      font-size: inherit;
    }
    .title-line,
    .tags-line,
    .caption-line {
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--ink);
      outline: none;
      font-family: var(--mono);
      padding: 0;
    }
    .title-line {
      min-height: 2.4rem;
      font-size: clamp(1.45rem, 3vw, 2rem);
      font-weight: 800;
      line-height: 1.2;
    }
    .tags-line,
    .caption-line {
      min-height: 1.8rem;
      font-size: 0.86rem;
      line-height: 1.5;
    }
    .tags-line {
      color: var(--accent);
    }
    .caption-line {
      margin-top: 1rem;
      color: var(--ink);
      border-bottom: 1px solid var(--line);
      padding-bottom: 0.45rem;
    }
    .title-line:focus,
    .tags-line:focus,
    .caption-line:focus,
    .property-control:focus {
      border-color: var(--accent);
      box-shadow: none;
    }
    h1,
    h2 {
      margin: 0;
      font-family: var(--mono);
      letter-spacing: 0;
    }
    h2 {
      font-size: 1rem;
      color: var(--ink);
    }
    .dropzone {
      min-height: min(66vh, 45rem);
      overflow: hidden;
      position: relative;
    }
    .dropzone.is-dragging {
      outline: 1px dashed var(--accent);
      outline-offset: 0.7rem;
    }
    .empty-state {
      width: 100%;
      min-height: min(58vh, 38rem);
      display: grid;
      justify-items: center;
      align-content: center;
      gap: 0.85rem;
      padding: 2rem;
      text-align: center;
      background: #020203;
    }
    .upload-mark {
      width: 7rem;
      height: 7rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
      background: var(--field);
      position: relative;
    }
    .pixel-image-mark {
      width: 4.5rem;
      height: 4.5rem;
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
      display: block;
    }
    .image-object {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: stretch;
      gap: 1rem;
      width: 100%;
    }
    .image-surface {
      min-height: min(58vh, 38rem);
      display: grid;
    }
    .image-stage {
      min-height: min(58vh, 38rem);
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .image-stage img {
      display: block;
      max-width: 100%;
      max-height: min(68vh, 44rem);
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
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.15rem;
      align-items: flex-start;
    }
    .tool-button {
      border: 0;
      background: transparent;
      color: var(--dim);
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      font-family: var(--mono);
      font-size: 0.72rem;
      padding: 0;
    }
    .tool-button.is-active {
      color: var(--accent);
    }
    .inspector {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-top: 5.9rem;
      border-left: 1px solid var(--line-soft);
      padding-left: clamp(0.8rem, 2vw, 1.35rem);
      opacity: 0.88;
    }
    .panel {
      display: grid;
      gap: 1.35rem;
    }
    .panel h2 {
      color: var(--muted);
      font-size: 0.74rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .preview-panel {
      display: grid;
      gap: 0.8rem;
    }
    .preview-box {
      display: none;
    }
    .property-row {
      min-height: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.55rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.8rem;
    }
    .preview-box img {
      width: 2.5rem;
      height: 2.5rem;
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
    .property-row,
    .field {
      display: grid;
      gap: 0.35rem;
    }
    .property-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
    }
    .property-label,
    .field span,
    .check span {
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.74rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .property-value {
      color: var(--ink);
      font-family: var(--mono);
      font-size: 0.82rem;
      line-height: 1.5;
    }
    .property-action {
      border: 0;
      background: transparent;
      color: var(--accent);
      padding: 0;
      font-family: var(--mono);
      font-size: 0.78rem;
      white-space: nowrap;
    }
    .property-editor {
      display: none;
      margin-top: -0.5rem;
    }
    .panel.is-editing .property-editor {
      display: grid;
    }
    .panel.is-editing .property-row {
      align-items: center;
    }
    input,
    select,
    textarea {
      width: 100%;
      min-height: 2rem;
      border: 0;
      border-bottom: 1px solid var(--line-soft);
      border-radius: 0;
      background: transparent;
      color: var(--ink);
      padding: 0 0 0.35rem;
      outline: none;
      font-family: var(--mono);
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
      box-shadow: none;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 1.7rem;
    }
    .check input {
      width: 0.9rem;
      height: 0.9rem;
      min-height: 0;
      accent-color: var(--accent);
    }
    .property-editor.check {
      display: none;
    }
    .panel.is-editing .property-editor.check {
      display: flex;
    }
    .desktop-actions {
      display: none;
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
      justify-content: flex-start;
      gap: 1rem;
      padding: 1rem 1.1rem calc(1rem + env(safe-area-inset-bottom));
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    @media (max-width: 1040px) {
      .shell {
        grid-template-columns: minmax(0, 1fr) minmax(13rem, 18rem);
      }
      .editor-rail {
        display: none;
      }
    }
    @media (max-width: 820px) {
      body {
        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
      }
      .topbar {
        min-height: 3.6rem;
      }
      .brand {
        display: none;
      }
      #save-draft {
        display: none;
      }
      .shell {
        display: block;
        padding: 0 1rem 2rem;
      }
      .workspace {
        display: flex;
        flex-direction: column;
        padding-top: 0.8rem;
      }
      .post-head {
        order: 2;
        margin-top: 0.65rem;
        margin-bottom: 0.8rem;
      }
      .dropzone {
        order: 1;
        min-height: 23rem;
      }
      .caption-line {
        order: 3;
      }
      .empty-state {
        min-height: 22rem;
        padding: 1.5rem;
      }
      .image-object {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.85rem;
      }
      .image-stage {
        min-height: 22rem;
      }
      .image-tools {
        flex-direction: row;
        justify-content: flex-start;
        gap: 0.75rem;
        margin-top: 0;
        overflow-x: auto;
      }
      .inspector {
        margin-top: 1rem;
        padding-top: 1rem;
        padding-left: 0;
        border-left: 0;
        border-top: 1px solid var(--line);
      }
      .desktop-actions {
        display: none;
      }
      .mobile-actions {
        display: none;
      }
      #mobile-publish {
        display: none;
      }
    }
    @media (max-width: 440px) {
      .topbar-actions {
        gap: 0.8rem;
      }
      .dropzone {
        min-height: 20rem;
      }
      .empty-state,
      .image-stage {
        min-height: 19rem;
      }
      .tool-button {
        font-size: 0.68rem;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-left">
      <button type="button" class="icon-button" id="back" aria-label="Back" title="Back">${ICONS.back}</button>
      <a class="brand" href="${SITE_ORIGIN}/es/" aria-label="betancourt">
        <strong>betancourt</strong>
        <span>aqui escribo cosas</span>
      </a>
    </div>
    <div class="topbar-actions">
      <span class="save-state" id="save-state">Unsaved</span>
      <button type="button" class="text-action" id="preview-image">${ICONS.preview}<span>Vista previa</span></button>
      <button type="button" class="secondary-button" id="save-draft">Guardar</button>
      <button type="button" class="primary-button" id="publish">Publicar ↑</button>
    </div>
  </header>

  <main class="shell">
    <nav class="editor-rail" aria-label="Notebooks">
      <div class="rail-group">
        <p class="rail-heading">Notebooks</p>
        <a class="rail-link" href="${SITE_ORIGIN}/es/">Inicio</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/sobre-mi/">Sobre mi</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/profesional/">Profesional</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/academico/">Academico</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/posts/">Escritos</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/zettelkasten/">Zettelkasten</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/lecturas/">Lecturas</a>
        <a class="rail-link" href="${SITE_ORIGIN}/es/cv/">CV</a>
        <a class="rail-link is-active" href="${SITE_ORIGIN}/es/fotografia/">Fotografia</a>
      </div>
      <div class="rail-group">
        <button type="button" class="text-action is-primary" id="choose-image">+ Nueva imagen</button>
        <span>Ajustes</span>
      </div>
    </nav>

    <section class="workspace">
      <div class="post-head">
        <div class="post-kicker">
          <input class="inline-date" id="date" type="date" aria-label="Fecha" />
          <span>imagen</span>
        </div>
        <input class="title-line" id="title" type="text" placeholder="Titulo" autocomplete="off" aria-label="Titulo" />
        <input class="tags-line" id="tags" type="text" placeholder="#fotografia  #naturaleza  #insecto" aria-label="Tags" />
      </div>

      <div class="dropzone" id="dropzone" aria-label="Image upload area">
        <div class="image-object">
          <div class="image-surface">
            <div class="empty-state" id="empty-state">
              <span class="upload-mark" aria-hidden="true">
                <span class="pixel-image-mark">
                  ${Array.from({ length: 49 }, () => "<span></span>").join("")}
                </span>
              </span>
              <h2>Imagen pendiente</h2>
              <p>Suelta o elige una foto.</p>
              <p class="helper-copy">JPG, PNG, GIF, WebP, SVG. Max 12 MB.</p>
              <button type="button" class="primary-button" id="choose-image-empty">Elegir imagen</button>
            </div>

            <div class="preview-state" id="preview-state" hidden>
              <div class="image-stage" id="image-stage">
                <img id="image-preview" alt="" />
              </div>
            </div>
          </div>
          <div class="image-tools" aria-label="Herramientas de imagen">
            <button type="button" class="tool-button" id="crop-image">${ICONS.crop}<span>Recortar</span></button>
            <button type="button" class="tool-button" id="rotate-image">${ICONS.rotate}<span>Girar</span></button>
            <button type="button" class="tool-button" id="replace-image">${ICONS.replace}<span>Reemplazar</span></button>
          </div>
        </div>

        <input id="image-file" type="file" accept="image/*" hidden />
      </div>

      <input class="caption-line" id="caption" type="text" placeholder="La paciencia antes del salto." aria-label="Caption" />
    </section>

    <aside class="inspector">
      <section class="panel preview-panel">
        <h2>Imagen</h2>
        <div class="property-row">
          <span class="property-value" id="preview-empty">sin imagen</span>
          <button type="button" class="property-action" id="image-change">+ añadir</button>
        </div>
        <img id="preview-thumb" alt="" hidden />
        <p class="preview-meta" id="preview-meta">pendiente</p>
      </section>

      <section class="panel">
        <h2>Caption</h2>
        <div class="property-row">
          <span class="property-value" id="caption-summary">falta</span>
          <button type="button" class="property-action" data-focus-target="caption">editar</button>
        </div>
      </section>

      <section class="panel">
        <h2>Alt</h2>
        <div class="property-row">
          <span class="property-value" id="alt-summary">falta</span>
          <button type="button" class="property-action" id="alt-action" data-edit-panel="alt-panel">+ añadir</button>
        </div>
        <label class="field property-editor" id="alt-panel">
          <input id="alt" type="text" placeholder="Describe the image" />
        </label>
        <textarea id="body" hidden></textarea>
      </section>

      <section class="panel">
        <h2>Notebook</h2>
        <div class="property-row">
          <span class="property-value" id="notebook-summary">Fotografia</span>
          <button type="button" class="property-action" data-edit-panel="notebook-panel">cambiar</button>
        </div>
        <label class="field property-editor" id="notebook-panel">
          <select id="notebook"></select>
        </label>
      </section>

      <section class="panel">
        <h2>Estado</h2>
        <div class="property-row">
          <span class="property-value" id="status-summary">• borrador</span>
          <button type="button" class="property-action" data-edit-panel="status-panel">cambiar</button>
        </div>
        <label class="check property-value property-editor" id="status-panel">
          <input id="draft" type="checkbox" checked />
          <span>borrador</span>
        </label>
      </section>

      <section class="panel desktop-actions">
        <button type="button" class="secondary-button" id="panel-save-draft">Guardar</button>
        <button type="button" class="primary-button" id="panel-publish">Publicar ↑</button>
      </section>

      <p class="status-line" id="status">Elige una imagen para empezar.</p>
      <a class="saved-link" id="saved-link" href="#" hidden>Abrir publicacion guardada</a>
    </aside>
  </main>

  <footer class="mobile-actions">
    <button type="button" class="secondary-button" id="mobile-save-draft">Guardar</button>
    <button type="button" class="primary-button" id="mobile-publish">Publicar ↑</button>
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
        imageChange: document.getElementById("image-change"),
        imageFile: document.getElementById("image-file"),
        chooseImage: document.getElementById("choose-image"),
        chooseImageEmpty: document.getElementById("choose-image-empty"),
        replaceImage: document.getElementById("replace-image"),
        cropImage: document.getElementById("crop-image"),
        rotateImage: document.getElementById("rotate-image"),
        previewImage: document.getElementById("preview-image"),
        panelSaveDraft: document.getElementById("panel-save-draft"),
        panelPublish: document.getElementById("panel-publish"),
        title: document.getElementById("title"),
        caption: document.getElementById("caption"),
        captionSummary: document.getElementById("caption-summary"),
        alt: document.getElementById("alt"),
        altSummary: document.getElementById("alt-summary"),
        altAction: document.getElementById("alt-action"),
        body: document.getElementById("body"),
        notebook: document.getElementById("notebook"),
        notebookSummary: document.getElementById("notebook-summary"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        draft: document.getElementById("draft"),
        statusSummary: document.getElementById("status-summary"),
        status: document.getElementById("status"),
        savedLink: document.getElementById("saved-link"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        els.date.value = today();
        bind();
        syncPreview();
        updatePropertySummaries();
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
        els.chooseImageEmpty.addEventListener("click", chooseImage);
        els.imageChange.addEventListener("click", chooseImage);
        els.replaceImage.addEventListener("click", chooseImage);
        document.querySelectorAll("[data-edit-panel]").forEach(function (button) {
          button.addEventListener("click", function () {
            var editor = document.getElementById(button.getAttribute("data-edit-panel"));
            if (!editor) return;
            var panel = editor.closest(".panel");
            panel.classList.toggle("is-editing");
            var control = editor.querySelector("input, select, textarea");
            if (panel.classList.contains("is-editing") && control) {
              control.focus();
            }
          });
        });
        document.querySelectorAll("[data-focus-target]").forEach(function (button) {
          button.addEventListener("click", function () {
            var control = document.getElementById(button.getAttribute("data-focus-target"));
            if (control) {
              control.focus();
            }
          });
        });
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
          closePropertyEditor(els.notebook);
          markUnsaved();
        });
        [els.title, els.caption, els.alt, els.body, els.date, els.tags].forEach(function (input) {
          input.addEventListener("input", function () {
            updatePropertySummaries();
            markUnsaved();
          });
        });
        els.alt.addEventListener("blur", function () {
          closePropertyEditor(els.alt);
        });
        els.draft.addEventListener("change", function () {
          closePropertyEditor(els.draft);
          updatePropertySummaries();
          markUnsaved();
        });
        els.saveDraft.addEventListener("click", function () {
          savePost(true, false);
        });
        els.mobileSaveDraft.addEventListener("click", function () {
          savePost(true, false);
        });
        els.panelSaveDraft.addEventListener("click", function () {
          savePost(true, false);
        });
        els.publish.addEventListener("click", function () {
          savePost(false, true);
        });
        els.mobilePublish.addEventListener("click", function () {
          savePost(false, true);
        });
        els.panelPublish.addEventListener("click", function () {
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
          updatePropertySummaries();
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
        els.previewThumb.hidden = true;
        els.previewEmpty.hidden = false;
        els.previewEmpty.textContent = file.name;
        els.previewMeta.textContent = (file.type || "image") + " - " + formatBytes(file.size);
        els.imageChange.textContent = "cambiar";
        els.imagePreview.alt = els.alt.value || els.title.value || filenameTitle(file.name);
        els.previewThumb.alt = els.imagePreview.alt;
        if (!els.title.value.trim()) {
          els.title.value = filenameTitle(file.name);
        }
        syncPreview();
        updatePropertySummaries();
        markUnsaved("Image ready.");
      }

      function syncPreview() {
        var hasImage = Boolean(imageFile || uploadedImageUrl);
        document.body.classList.toggle("has-image", hasImage);
        els.emptyState.hidden = hasImage;
        els.previewState.hidden = !hasImage;
        els.imageStage.classList.toggle("is-cropped", cropMode);
        els.cropImage.classList.toggle("is-active", cropMode);
        els.cropImage.disabled = !hasImage;
        els.rotateImage.disabled = !hasImage;
        els.imagePreview.style.transform = "rotate(" + rotation + "deg)";
      }

      function syncDefaultTags() {
        if (els.notebook.value === "content_es/fotografia" && !els.tags.value.trim()) {
          els.tags.value = "fotografia";
        }
        updatePropertySummaries();
      }

      function closePropertyEditor(control) {
        var panel = control.closest(".panel");
        if (panel) {
          panel.classList.remove("is-editing");
        }
      }

      function updatePropertySummaries() {
        if (!els.captionSummary) return;
        els.captionSummary.textContent = els.caption.value.trim() ? "escrito" : "falta";
        var altWritten = Boolean(els.alt.value.trim());
        els.altSummary.textContent = altWritten ? "escrito" : "falta";
        els.altAction.textContent = altWritten ? "editar" : "+ añadir";
        els.notebookSummary.textContent = selectedNotebookLabel();
        els.statusSummary.textContent = els.draft.checked ? "• borrador" : "• publico";
        if (!imageFile && !uploadedImageUrl) {
          els.previewEmpty.hidden = false;
          els.previewEmpty.textContent = "sin imagen";
          els.previewMeta.textContent = "pendiente";
          els.imageChange.textContent = "+ añadir";
        }
      }

      function selectedNotebookLabel() {
        var option = els.notebook.options[els.notebook.selectedIndex];
        if (!option) return "Fotografia";
        return option.textContent.replace(/ \\([^)]*\\)$/, "");
      }

      function markUnsaved(message) {
        updatePropertySummaries();
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
        [els.saveDraft, els.publish, els.mobileSaveDraft, els.mobilePublish, els.panelSaveDraft, els.panelPublish].forEach(function (button) {
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
          .split(/[,\s]+/)
          .map(function (tag) { return tag.trim().replace(/^#/, ""); })
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
