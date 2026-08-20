import { imageEditorController } from "./image-editor-controller.js";

function iconSvg(paths) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const ICONS = Object.freeze({
  back: iconSvg(`<path d="M18 6 6 18" /><path d="m6 6 12 12" />`),
  upload: iconSvg(`<path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 21h14" />`),
  imagePlus: iconSvg(`<rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.2-3.2a2 2 0 0 0-2.8 0L6 21" /><path d="M16 5v6" /><path d="M13 8h6" />`),
  replace: iconSvg(`<path d="M21 12a9 9 0 0 0-15-6.7L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 15 6.7l3-2.7" /><path d="M21 21v-5h-5" />`),
  crop: iconSvg(`<path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M2 6h14a2 2 0 0 1 2 2v14" />`),
  rotate: iconSvg(`<path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />`),
  preview: iconSvg(`<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />`),
});

export function imageEditorHtml({ siteOrigin = "", assetOrigin = "", apiBase = "/api", editorController = imageEditorController } = {}) {
  const SITE_ORIGIN = String(siteOrigin || "https://fbetancourt.work").replace(/\/+$/, "");
  const ASSET_ORIGIN = String(assetOrigin || SITE_ORIGIN).replace(/\/+$/, "");
  const API_BASE = String(apiBase || "/api").replace(/\/+$/, "");
  const EDITOR_CORE_URL = `${API_BASE.replace(/\/api$/, "")}/editor-core`;

  function siteAssetUrl(assetPath) {
    return `${ASSET_ORIGIN}/${String(assetPath).replace(/^\/+/, "")}`;
  }

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fotografía · betancourt</title>
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
    body.is-grayscale {
      filter: grayscale(100%);
    }
    body[data-theme="light"] {
      color-scheme: light;
      --bg: #f7f8fa;
      --field: #eef1f5;
      --line: #dde3ea;
      --line-soft: #e7ebef;
      --ink: #16202b;
      --muted: #495562;
      --dim: #2b3743;
      --accent: #1f7a5a;
      --accent-ink: #ffffff;
      --danger: #ba2525;
      --warning: #a86500;
    }
    body[data-theme="light"] .topbar {
      background: rgba(247, 248, 250, 0.94);
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
    .mobile-properties-toggle {
      display: none;
    }
    .draft-label-mobile {
      display: none;
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
    .upload-mark svg {
      width: 4.6rem;
      height: 4.6rem;
    }
    .icon-button:hover,
    .tool-button:hover,
    .text-action:hover {
      color: var(--accent);
    }
    .save-state {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--dim);
      font-family: var(--mono);
      font-size: 0.74rem;
      white-space: nowrap;
      transition: color 0.16s ease, opacity 0.16s ease;
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
    .save-state.is-saving::before {
      background: var(--warning);
      animation: pulse-dot 0.9s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 0.35; }
      50% { opacity: 1; }
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
    body.mode-lightbox .shell,
    body.mode-review .shell {
      grid-template-columns: minmax(10rem, 14rem) minmax(0, 1fr);
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
    .notebook-rail {
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
      border: 0;
      background: transparent;
      color: var(--muted);
      text-decoration: none;
      padding: 0;
      text-align: left;
      font: inherit;
      transition: color 0.16s ease, transform 0.16s ease;
    }
    .rail-link.is-active,
    .rail-link[aria-current="true"] {
      color: var(--accent);
      transform: translateX(0.15rem);
    }
    .rail-link.is-active::before,
    .rail-link[aria-current="true"]::before {
      content: "";
      display: inline-block;
      width: 0.42rem;
      height: 0.42rem;
      margin-right: 0.55rem;
      border-radius: 999px;
      background: var(--accent);
      vertical-align: 0.05em;
    }
    .rail-destination {
      display: grid;
      gap: 0.3rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.72rem;
      line-height: 1.45;
    }
    .rail-destination strong {
      color: var(--dim);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
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
    .caption-line,
    .tags-line {
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
    .tags-line {
      min-height: 1.8rem;
      font-size: 0.86rem;
      line-height: 1.5;
    }
    .caption-line {
      min-height: 1.8rem;
      color: var(--muted);
      font-size: 0.92rem;
      line-height: 1.5;
    }
    .caption-line::placeholder {
      color: #555b64;
    }
    .tags-line {
      color: var(--accent);
    }
    .title-line:focus,
    .caption-line:focus,
    .tags-line:focus,
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
    .view-head,
    .detail-head,
    .review-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.2rem;
      color: var(--muted);
      font-family: var(--mono);
    }
    .view-head h2,
    .review-head h2 {
      color: var(--ink);
      font-size: 1rem;
    }
    .view-head p,
    .review-head p {
      margin: 0.3rem 0 0;
      color: var(--muted);
      font-size: 0.78rem;
      line-height: 1.5;
    }
    .lightbox-view,
    .detail-view,
    .review-view {
      min-height: min(58vh, 38rem);
      opacity: 1;
    }
    .lightbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
      gap: clamp(0.7rem, 1.6vw, 1.1rem);
      align-items: stretch;
    }
    .lightbox-item,
    .add-tile,
    .rail-thumb {
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 0;
      text-align: left;
      font-family: var(--mono);
    }
    .lightbox-item {
      position: relative;
      display: grid;
      gap: 0.45rem;
      cursor: grab;
    }
    .lightbox-item:active {
      cursor: grabbing;
    }
    .lightbox-item.is-selected img,
    .rail-thumb.is-selected img {
      outline: 2px solid var(--accent);
      outline-offset: 3px;
    }
    .lightbox-item.is-over::before {
      content: "";
      position: absolute;
      inset: -0.35rem auto -0.35rem -0.45rem;
      width: 2px;
      background: var(--accent);
    }
    .lightbox-item img,
    .add-tile,
    .rail-thumb img,
    .review-cover img {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      display: block;
      background: var(--field);
    }
    .lightbox-item img {
      transition: filter 0.16s ease, opacity 0.16s ease;
    }
    .lightbox-item:not(.is-selected) img {
      filter: brightness(0.82);
    }
    .lightbox-meta,
    .rail-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      min-height: 1.1rem;
      color: var(--muted);
      font-size: 0.68rem;
    }
    .cover-chip {
      color: var(--accent);
    }
    .add-tile {
      min-height: 100%;
      aspect-ratio: 4 / 5;
      display: grid;
      place-items: center;
      border: 1px dashed var(--line);
      color: var(--accent);
    }
    .add-tile svg {
      width: 2rem;
      height: 2rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .detail-head {
      align-items: center;
      margin-bottom: 0.9rem;
      font-size: 0.74rem;
    }
    .thumb-rail {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
      padding-bottom: 0.4rem;
      overflow-x: auto;
    }
    body.mode-detail.has-multiple .image-stage {
      min-height: min(46vh, 30rem);
    }
    body.mode-detail.has-multiple .image-stage img {
      max-height: min(48vh, 30rem);
    }
    .rail-thumb {
      flex: 0 0 4.2rem;
      display: grid;
      gap: 0.35rem;
    }
    .rail-thumb img {
      aspect-ratio: 1 / 1;
    }
    .review-view {
      display: grid;
      align-content: start;
      gap: 1.4rem;
    }
    .review-summary {
      display: grid;
      grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
      gap: clamp(1rem, 2vw, 1.6rem);
      align-items: start;
      border-top: 1px solid var(--line-soft);
      padding-top: 1rem;
    }
    .review-cover {
      display: grid;
      gap: 0.45rem;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.72rem;
    }
    .review-list {
      display: grid;
      gap: 0.9rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-family: var(--mono);
    }
    .review-list li {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid var(--line-soft);
      padding-bottom: 0.65rem;
      color: var(--muted);
      font-size: 0.78rem;
    }
    .review-list strong {
      color: var(--ink);
      font-weight: 700;
    }
    .review-warning {
      color: var(--warning);
    }
    .review-actions {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--line-soft);
      padding-top: 1rem;
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
      position: relative;
      min-height: min(58vh, 38rem);
      display: grid;
      place-items: center;
      overflow: hidden;
    }
    .cover-badge {
      display: none;
      position: absolute;
      top: 0.8rem;
      left: 0.8rem;
      z-index: 2;
      min-height: 1.6rem;
      align-items: center;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.66);
      color: var(--accent);
      padding: 0 0.7rem;
      font-family: var(--mono);
      font-size: 0.68rem;
      font-weight: 800;
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
      animation: reveal-tools 0.16s ease-out;
    }
    body:not(.has-image) .image-tools {
      display: none;
    }
    body:not(.mode-detail) .image-tools {
      display: none;
    }
    @keyframes reveal-tools {
      from {
        opacity: 0;
        transform: translateY(0.25rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
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
    body.mode-lightbox .inspector,
    body.mode-review .inspector {
      display: none;
    }
    body.mode-review #publish,
    body.mode-review #panel-publish,
    body.mode-review #mobile-publish {
      display: none;
    }
    .sheet-header {
      display: none;
    }
    .properties-backdrop {
      display: none;
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
      display: grid;
      max-height: 0;
      margin-top: -0.5rem;
      opacity: 0;
      overflow: hidden;
      pointer-events: none;
      transform: translateY(-0.25rem);
      transition: max-height 0.18s ease, opacity 0.16s ease, transform 0.16s ease, margin-top 0.16s ease;
    }
    .panel.is-editing .property-editor {
      max-height: 8rem;
      margin-top: 0;
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
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
      display: flex;
    }
    .panel.is-editing .property-editor.check {
      max-height: 2rem;
    }
    .arena-editor {
      display: grid;
      gap: 0.7rem;
    }
    .arena-channel-field[hidden] {
      display: none !important;
    }
    .arena-toggle {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-height: 1.8rem;
      color: var(--ink);
      font-family: var(--mono);
      font-size: 0.78rem;
    }
    .arena-toggle input {
      width: 0.95rem;
      height: 0.95rem;
      min-height: 0;
      accent-color: var(--accent);
    }
    .arena-message,
    .arena-help {
      margin: 0;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.72rem;
      line-height: 1.5;
    }
    .arena-message.is-error {
      color: var(--danger);
    }
    .arena-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem 0.8rem;
    }
    .arena-links a,
    .arena-retry {
      border: 0;
      background: transparent;
      color: var(--accent);
      padding: 0;
      font-family: var(--mono);
      font-size: 0.74rem;
      text-decoration: none;
    }
    .mobile-notebook-field {
      display: none;
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
    .publication-progress {
      padding-top: 1rem;
      border-top: 1px solid var(--line-soft);
    }
    .publication-progress h2 {
      margin-bottom: 0.8rem;
    }
    .publication-steps {
      display: grid;
      gap: 0.7rem;
      margin: 0;
      padding: 0;
      list-style: none;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.74rem;
    }
    .publication-step {
      display: grid;
      grid-template-columns: 0.65rem minmax(0, 1fr);
      gap: 0.5rem;
      align-items: center;
    }
    .publication-step::before {
      content: "";
      width: 0.42rem;
      height: 0.42rem;
      border: 1px solid currentColor;
      border-radius: 50%;
    }
    .publication-step.is-active,
    .publication-step.is-complete {
      color: var(--accent);
    }
    .publication-step.is-complete::before {
      background: var(--accent);
      border-color: var(--accent);
    }
    .publication-status-copy {
      margin: 0.75rem 0 0;
      color: var(--muted);
      font-family: var(--mono);
      font-size: 0.72rem;
      line-height: 1.5;
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
      .mobile-notebook-field {
        display: grid;
      }
    }
    @media (max-width: 820px) {
      :root {
        --mono: var(--sans);
      }
      body {
        padding-bottom: calc(5.6rem + env(safe-area-inset-bottom));
      }
      .topbar {
        position: fixed;
        inset: 0 0 auto;
        min-height: 4.75rem;
        height: 4.75rem;
        display: grid;
        grid-template-columns: 2.75rem minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.65rem;
        padding: 0.85rem 1rem;
      }
      .topbar-left {
        display: contents;
      }
      #back {
        grid-column: 1;
        width: 2.75rem;
        height: 2.75rem;
      }
      .brand {
        display: none;
      }
      .topbar-actions {
        grid-column: 2 / 4;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 0.45rem;
      }
      .save-state {
        grid-column: 1;
        justify-self: center;
        max-width: min(9.8rem, 38vw);
        min-height: 1.8rem;
        padding: 0 0.65rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-size: 0.7rem;
      }
      #preview-image {
        display: none;
      }
      .mobile-properties-toggle {
        grid-column: 2;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.75rem;
        min-width: 2.75rem;
        height: 2.75rem;
        color: var(--ink);
        font-size: 1.25rem;
        letter-spacing: 0.06em;
      }
      #save-draft {
        grid-column: 3;
        display: inline-flex;
        min-height: 2.75rem;
        padding: 0 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.68);
        border-radius: 0.55rem;
        color: var(--ink);
      }
      #publish {
        display: none;
      }
      .shell {
        display: block;
        padding: 4.9rem 1rem 2rem;
      }
      .workspace {
        display: flex;
        flex-direction: column;
        padding-top: 0.8rem;
      }
      .post-head {
        order: 2;
        gap: 0.5rem;
        margin-top: 0.8rem;
        margin-bottom: 0.4rem;
      }
      .title-line,
      .caption-line,
      .tags-line {
        border-bottom: 1px solid var(--line-soft);
        padding-bottom: 0.46rem;
      }
      .title-line {
        min-height: 2rem;
        font-size: 1.42rem;
        font-weight: 700;
      }
      .caption-line,
      .tags-line {
        min-height: 1.55rem;
        font-size: 0.86rem;
      }
      .dropzone {
        order: 1;
        min-height: 16rem;
      }
      .empty-state {
        min-height: 16rem;
        padding: 1.5rem;
      }
      .image-surface {
        min-height: 16rem;
      }
      .empty-state .primary-button {
        min-height: 2.75rem;
        padding: 0 0.65rem;
      }
      .image-object {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 0.85rem;
      }
      .image-stage {
        min-height: min(48vh, 26rem);
        border-radius: 0.7rem;
        background: #050607;
      }
      .image-stage img {
        width: 100%;
        height: min(50vh, 26rem);
        max-height: min(50vh, 26rem);
        object-fit: cover;
        border-radius: 0.7rem;
      }
      body.has-image .cover-badge {
        display: inline-flex;
      }
      .lightbox-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .review-summary {
        grid-template-columns: minmax(0, 1fr);
      }
      .image-tools {
        flex-direction: row;
        justify-content: space-between;
        gap: 0.45rem;
        margin-top: 0;
        padding: 0.75rem 0 0;
        overflow-x: auto;
      }
      .tool-button {
        width: 2.75rem;
        min-width: 2.75rem;
        min-height: 2.75rem;
        justify-content: center;
        color: var(--dim);
      }
      .tool-button span {
        display: none;
      }
      #edit-alt-image span {
        display: inline;
      }
      .inspector {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 40;
        width: 100%;
        max-height: min(76vh, 36rem);
        margin-top: 0;
        padding: 0.85rem 1.1rem calc(1.25rem + env(safe-area-inset-bottom));
        border-radius: 1.1rem 1.1rem 0 0;
        background: rgba(8, 9, 11, 0.98);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        gap: 0;
        overflow-x: hidden;
        overflow-y: auto;
        transform: translateY(100%);
        opacity: 0;
        pointer-events: none;
        transition: transform 0.18s ease, opacity 0.18s ease;
        padding-left: 1.1rem;
        border-left: 0;
        border-top: 1px solid var(--line);
      }
      body.properties-open .inspector {
        transform: translateY(0);
        opacity: 1;
        pointer-events: auto;
      }
      body.mode-lightbox.properties-open .inspector,
      body.mode-review.properties-open .inspector {
        display: flex;
      }
      .properties-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 35;
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 0;
        background: rgba(0, 0, 0, 0.36);
        padding: 0;
      }
      .sheet-header {
        display: grid;
        gap: 0.9rem;
        margin-bottom: 0.15rem;
      }
      .sheet-grabber {
        width: 3.4rem;
        height: 0.28rem;
        margin: 0 auto;
        border-radius: 999px;
        background: var(--line);
      }
      .sheet-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }
      .sheet-title-row h2 {
        font-size: 1.28rem;
      }
      .sheet-close {
        width: 2.75rem;
        height: 2.75rem;
        border: 0;
        background: transparent;
        color: var(--dim);
        font-size: 1.5rem;
        padding: 0;
      }
      .panel {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        column-gap: 0.75rem;
        row-gap: 0.15rem;
        align-items: center;
        min-width: 0;
        padding: 1.05rem 0;
        border-bottom: 1px solid var(--line-soft);
      }
      .panel h2 {
        grid-column: 1 / -1;
        grid-row: 1;
        font-size: 0.7rem;
        margin-bottom: 0.15rem;
      }
      .property-row {
        display: contents;
        min-height: 1.8rem;
        align-items: center;
      }
      .property-value {
        grid-column: 1;
        grid-row: 2;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .property-action {
        grid-column: 2;
        grid-row: 2;
        margin-left: auto;
        min-height: 2.75rem;
        padding: 0 0.2rem;
      }
      .property-editor {
        grid-column: 1 / -1;
        margin-top: 0;
      }
      .mobile-notebook-field {
        display: none;
      }
      .check.property-editor {
        display: flex;
        justify-content: flex-start;
      }
      #status-panel {
        grid-column: 1 / -1;
        grid-row: 3;
      }
      .status-visible {
        grid-column: 1 / -1;
        grid-row: 4;
        min-height: 2.75rem;
        margin-top: 0.25rem;
      }
      .publication-target {
        grid-row: 1;
        margin-top: 0;
      }
      .arena-editor {
        grid-column: 1 / -1;
      }
      .publication-progress h2 {
        grid-column: 1 / -1;
        grid-row: 1;
      }
      .publication-steps {
        grid-column: 1 / -1;
        grid-row: 2;
        min-width: 0;
        padding: 0.15rem 0 0.25rem;
      }
      .publication-step {
        align-items: start;
        line-height: 1.4;
      }
      .publication-step::before {
        margin-top: 0.28rem;
      }
      .publication-status-copy {
        grid-column: 2 / -1;
        grid-row: 3;
        min-width: 0;
        margin: 0.35rem 0 0;
        overflow-wrap: anywhere;
      }
      .preview-meta {
        display: none;
      }
      .desktop-actions {
        position: static;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-top: 0.5rem;
        padding: 0.85rem 0 0;
        border-bottom: 0;
        background: transparent;
      }
      .desktop-actions button {
        min-height: 3rem;
        justify-content: center;
      }
      .mobile-actions {
        display: flex;
        justify-content: space-between;
      }
      body.properties-open .mobile-actions {
        display: none;
      }
      body.properties-open .status-line,
      body.properties-open .saved-link {
        display: none;
      }
      #mobile-publish {
        display: inline-flex;
      }
      .mobile-actions button {
        flex: 1;
        min-height: 3rem;
        justify-content: center;
      }
      .draft-label-desktop {
        display: none;
      }
      .draft-label-mobile {
        display: inline;
      }
    }
    @media (max-width: 440px) {
      .save-state {
        max-width: 6.8rem;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 0.68rem;
      }
      .dropzone {
        min-height: 16rem;
      }
      .empty-state {
        min-height: 16rem;
      }
      .image-stage {
        min-height: 19rem;
      }
      .tool-button {
        font-size: 0.68rem;
      }
      .inspector {
        padding-right: 0.9rem;
        padding-left: 0.9rem;
      }
      .panel {
        column-gap: 0.65rem;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="topbar-left">
      <button type="button" class="icon-button" id="back" aria-label="Volver" title="Volver">${ICONS.back}</button>
      <a class="brand" href="${SITE_ORIGIN}/es/" aria-label="betancourt">
        <strong>betancourt</strong>
        <span>aqui escribo cosas</span>
      </a>
    </div>
    <div class="topbar-actions">
      <button type="button" class="text-action" id="preview-image">${ICONS.preview}<span>Vista previa</span></button>
      <span class="save-state" id="save-state" role="status" aria-live="polite">Sincronizado</span>
      <button type="button" class="text-action mobile-properties-toggle" id="properties-toggle" aria-controls="properties-sheet" aria-expanded="false" aria-label="Propiedades">...</button>
      <button type="button" class="secondary-button" id="save-draft" hidden>Guardar borrador</button>
      <button type="button" class="primary-button" id="publish" aria-describedby="status" disabled>Publicar</button>
    </div>
  </header>

  <main class="shell">
    <nav class="editor-rail" aria-label="Destino de la imagen">
      <div class="rail-group">
        <p class="rail-heading">Subir en</p>
        <div class="notebook-rail" id="notebook-rail"></div>
        <p class="rail-destination">
          <strong>Destino actual</strong>
          <span id="notebook-path">content_es/fotografia</span>
        </p>
      </div>
    </nav>

    <section class="workspace">
      <div class="post-head">
        <div class="post-kicker">
          <input class="inline-date" id="date" type="date" aria-label="Fecha" />
          <span id="media-count">imagen</span>
        </div>
        <input class="title-line" id="title" type="text" placeholder="Titulo de la foto" autocomplete="off" aria-label="Titulo" />
        <input class="caption-line" id="caption-inline" type="text" placeholder="Pie opcional..." autocomplete="off" aria-label="Pie" />
        <input class="tags-line" id="tags" type="text" list="photo-tag-suggestions" placeholder="#photography  #macro  #maps" aria-label="Tags" />
        <datalist id="photo-tag-suggestions">
          <option value="photography"></option>
          <option value="macro"></option>
          <option value="maps"></option>
          <option value="data-visualization"></option>
          <option value="archive"></option>
        </datalist>
      </div>

      <div class="dropzone" id="dropzone" aria-label="Carga de imágenes">
        <div class="image-object">
          <div class="image-surface">
            <div class="empty-state" id="empty-state">
              <span class="upload-mark" aria-hidden="true">
                ${ICONS.imagePlus}
              </span>
              <h2>Imagen pendiente</h2>
              <p>Suelta o elige una o varias fotos. Publicar se activará cuando haya una imagen.</p>
              <p class="helper-copy">JPG, PNG y WebP se guardan en HD. GIF/SVG max 12 MB.</p>
              <button type="button" class="primary-button" id="choose-image-empty">Elegir imagenes</button>
            </div>

            <div class="preview-state" id="preview-state" hidden>
              <div class="lightbox-view" id="lightbox-view" hidden>
                <div class="view-head">
                  <div>
                    <h2>Mesa de luz</h2>
                    <p>Arrastra para ordenar. La primera imagen es la portada.</p>
                  </div>
                  <button type="button" class="text-action is-primary" id="add-images">${ICONS.imagePlus}<span>Agregar</span></button>
                </div>
                <div class="lightbox-grid" id="lightbox-grid"></div>
              </div>

              <div class="detail-view" id="detail-view" hidden>
                <div class="detail-head" id="detail-head" hidden>
                  <button type="button" class="text-action" id="back-to-lightbox">Mesa de luz</button>
                  <span id="selected-counter">Imagen 1 de 1</span>
                </div>
                <div class="image-stage" id="image-stage">
                  <span class="cover-badge">Portada</span>
                  <img id="image-preview" alt="" />
                </div>
                <div class="thumb-rail" id="thumb-rail" aria-label="Imagenes de la publicacion"></div>
              </div>

              <div class="review-view" id="review-view" hidden>
                <div class="review-head">
                  <div>
                    <h2>Listo para publicar</h2>
                    <p>Revisa destino, portada y metadatos antes de publicar.</p>
                  </div>
                  <button type="button" class="text-action" id="review-edit">Editar</button>
                </div>
                <div class="review-summary">
                  <div class="review-cover">
                    <img id="review-cover-image" alt="" />
                    <span>Portada</span>
                  </div>
                <ul class="review-list">
                    <li><span>Destino</span><strong id="review-destination">Fotografia</strong></li>
                    <li><span>Imagenes</span><strong id="review-count">0 imagenes</strong></li>
                    <li><span>Accesibilidad</span><strong id="review-alt">pendiente</strong></li>
                  <li><span>Estado</span><strong id="review-status">borrador</strong></li>
                  <li><span>Are.na</span><strong id="review-arena">no se copiará</strong></li>
                </ul>
                </div>
                <div class="review-actions">
                  <button type="button" class="primary-button" id="review-publish" aria-describedby="status" disabled>Publicar</button>
                </div>
              </div>
            </div>
          </div>
          <div class="image-tools" aria-label="Herramientas de imagen">
            <button type="button" class="tool-button" id="crop-image">${ICONS.crop}<span>Recortar</span></button>
            <button type="button" class="tool-button" id="rotate-image">${ICONS.rotate}<span>Girar</span></button>
            <button type="button" class="tool-button" id="replace-image">${ICONS.replace}<span>Reemplazar</span></button>
            <button type="button" class="tool-button" id="edit-alt-image"><span>ALT</span></button>
          </div>
        </div>

        <input id="image-file" type="file" accept="image/*" multiple hidden />
      </div>
    </section>

    <button type="button" class="properties-backdrop" id="properties-backdrop" aria-label="Cerrar propiedades" hidden></button>
    <aside class="inspector" id="properties-sheet">
      <div class="sheet-header">
        <span class="sheet-grabber" aria-hidden="true"></span>
        <div class="sheet-title-row">
          <h2>Propiedades</h2>
          <button type="button" class="sheet-close" id="properties-close" aria-label="Cerrar propiedades">&times;</button>
        </div>
      </div>
      <section class="panel preview-panel">
        <h2 id="file-panel-title">Archivo</h2>
        <div class="property-row">
          <span class="property-value" id="preview-empty">sin archivo</span>
          <button type="button" class="property-action" id="remove-image" hidden>quitar</button>
        </div>
        <p class="preview-meta" id="preview-meta">pendiente</p>
      </section>

      <section class="panel">
        <h2>Texto alt</h2>
        <div class="property-row">
          <span class="property-value" id="alt-summary">falta</span>
          <button type="button" class="property-action" id="alt-action" data-edit-panel="alt-panel">+ añadir</button>
        </div>
        <label class="field property-editor" id="alt-panel">
          <input id="alt" type="text" placeholder="Texto alternativo" />
        </label>
        <textarea id="body" hidden></textarea>
      </section>

      <section class="panel">
        <h2>Pie</h2>
        <div class="property-row">
          <span class="property-value" id="caption-summary">opcional</span>
          <button type="button" class="property-action" id="caption-action" data-edit-panel="caption-panel">+ añadir</button>
        </div>
        <label class="field property-editor" id="caption-panel">
          <input id="caption" type="text" placeholder="Pie de foto visible" />
        </label>
      </section>

      <section class="panel">
        <h2>Destino</h2>
        <div class="property-row">
          <span class="property-value" id="notebook-summary">Fotografia</span>
        </div>
        <label class="field mobile-notebook-field">
          <select id="notebook"></select>
        </label>
      </section>

      <section class="panel">
        <input id="draft" type="checkbox" checked hidden />
        <label class="check property-value status-visible publication-target">
          <input id="visible" type="checkbox" checked />
          <span>Visible</span>
        </label>
      </section>

      <section class="panel" id="arena-panel">
        <h2>Are.na</h2>
        <span class="property-value" id="arena-summary" hidden>no se publicará</span>
        <div class="arena-editor" id="arena-editor">
          <label class="arena-toggle">
            <input id="arena-enabled" type="checkbox" />
            <span>Publicar</span>
          </label>
          <label class="field arena-channel-field" id="arena-channel-field" hidden>
            <select id="arena-channel" aria-label="Canal de Are.na" disabled>
              <option value="">Cargando canales...</option>
            </select>
          </label>
          <p class="arena-help">Cada archivo se guarda como bloque Image con su texto alt y pie. No se crea un bloque de enlace.</p>
          <p class="arena-message" id="arena-message">La copia está desactivada.</p>
          <div class="arena-links" id="arena-links"></div>
          <button type="button" class="arena-retry" id="arena-retry" hidden>Reintentar copia</button>
        </div>
      </section>

      <section class="panel publication-progress" id="publication-progress">
        <h2>Publicación</h2>
        <ol class="publication-steps">
          <li class="publication-step" id="publication-saved-step">Guardado en GitHub</li>
          <li class="publication-step" id="publication-deploy-step">Desplegando</li>
          <li class="publication-step" id="publication-public-step">Disponible en el blog</li>
        </ol>
        <p class="publication-status-copy" id="publication-status-copy">Publica para iniciar el proceso.</p>
      </section>

      <section class="panel desktop-actions">
        <button type="button" class="secondary-button" id="panel-save-draft" hidden>Guardar borrador</button>
        <button type="button" class="primary-button" id="panel-publish" aria-describedby="status" disabled>Publicar</button>
      </section>

      <p class="status-line" id="status" role="status" aria-live="polite">Elige una imagen para empezar. Publicar está desactivado hasta entonces.</p>
      <a class="saved-link" id="saved-link" href="#" hidden>Abrir publicacion guardada</a>
    </aside>
  </main>

  <footer class="mobile-actions">
    <button type="button" class="secondary-button" id="mobile-save-draft" hidden>Guardar borrador</button>
    <button type="button" class="primary-button" id="mobile-publish" aria-describedby="status" disabled>Publicar</button>
  </footer>

  <script src="${EDITOR_CORE_URL}"></script>
  <script>
    (function () {
      var apiBase = ${JSON.stringify(API_BASE)};
      var siteOrigin = ${JSON.stringify(SITE_ORIGIN)};
      var assetOrigin = ${JSON.stringify(ASSET_ORIGIN)};
      var editorController = ${JSON.stringify(editorController)};
      var editorCore = window.EditorCore.create({ apiBase: apiBase, siteOrigin: siteOrigin });
      var request = editorCore.request;
      var postJson = editorCore.postJson;
      var notebookPathForContent = editorCore.notebookPathForContent;
      var slugify = editorCore.slugify;
      var splitTags = editorCore.splitTags;
      var today = editorCore.today;
      var params = new URLSearchParams(window.location.search);
      var sourcePath = params.get("path") || "";
      var preferredNotebook = params.get("notebook") || sourcePath.replace(/\\/[^/]+$/, "") || "content_es/posts";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var grayscale = params.get("grayscale") === "true";
      var images = [];
      var selectedImageId = "";
      var viewMode = "empty";
      var pendingFileMode = "add";
      var draggedImageId = "";
      var savedPath = "";
      var savedUrl = "";
      var saveBusy = false;
      var hasUnsavedChanges = false;
      var arenaChannels = [];
      var arenaChannelsLoaded = false;
      var arenaChannelsLoading = null;
      var notebookCacheStorageKey = "authorNotebooksCacheV1";
      var arenaState = { state: "disabled", blocks: [], error: "" };
      var fullImageMaxEdge = 1920;
      var thumbImageMaxEdge = 640;
      var publicationRedirectNotebook = "";
      var maxUploadBytes = 12 * 1024 * 1024;
      var allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

      var els = {
        back: document.getElementById("back"),
        saveState: document.getElementById("save-state"),
        saveDraft: document.getElementById("save-draft"),
        publish: document.getElementById("publish"),
        propertiesToggle: document.getElementById("properties-toggle"),
        propertiesClose: document.getElementById("properties-close"),
        propertiesBackdrop: document.getElementById("properties-backdrop"),
        mobileSaveDraft: document.getElementById("mobile-save-draft"),
        mobilePublish: document.getElementById("mobile-publish"),
        dropzone: document.getElementById("dropzone"),
        emptyState: document.getElementById("empty-state"),
        previewState: document.getElementById("preview-state"),
        lightboxView: document.getElementById("lightbox-view"),
        lightboxGrid: document.getElementById("lightbox-grid"),
        addImages: document.getElementById("add-images"),
        detailView: document.getElementById("detail-view"),
        detailHead: document.getElementById("detail-head"),
        backToLightbox: document.getElementById("back-to-lightbox"),
        selectedCounter: document.getElementById("selected-counter"),
        imageStage: document.getElementById("image-stage"),
        imagePreview: document.getElementById("image-preview"),
        thumbRail: document.getElementById("thumb-rail"),
        reviewView: document.getElementById("review-view"),
        reviewEdit: document.getElementById("review-edit"),
        reviewCoverImage: document.getElementById("review-cover-image"),
        reviewDestination: document.getElementById("review-destination"),
        reviewCount: document.getElementById("review-count"),
        reviewAlt: document.getElementById("review-alt"),
        reviewStatus: document.getElementById("review-status"),
        reviewArena: document.getElementById("review-arena"),
        reviewPublish: document.getElementById("review-publish"),
        mediaCount: document.getElementById("media-count"),
        previewEmpty: document.getElementById("preview-empty"),
        previewMeta: document.getElementById("preview-meta"),
        filePanelTitle: document.getElementById("file-panel-title"),
        removeImage: document.getElementById("remove-image"),
        imageFile: document.getElementById("image-file"),
        chooseImageEmpty: document.getElementById("choose-image-empty"),
        replaceImage: document.getElementById("replace-image"),
        cropImage: document.getElementById("crop-image"),
        rotateImage: document.getElementById("rotate-image"),
        previewImage: document.getElementById("preview-image"),
        editAltImage: document.getElementById("edit-alt-image"),
        panelSaveDraft: document.getElementById("panel-save-draft"),
        panelPublish: document.getElementById("panel-publish"),
        title: document.getElementById("title"),
        captionInline: document.getElementById("caption-inline"),
        caption: document.getElementById("caption"),
        captionSummary: document.getElementById("caption-summary"),
        captionAction: document.getElementById("caption-action"),
        alt: document.getElementById("alt"),
        altSummary: document.getElementById("alt-summary"),
        altAction: document.getElementById("alt-action"),
        body: document.getElementById("body"),
        notebook: document.getElementById("notebook"),
        notebookRail: document.getElementById("notebook-rail"),
        notebookPath: document.getElementById("notebook-path"),
        notebookSummary: document.getElementById("notebook-summary"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        draft: document.getElementById("draft"),
        visible: document.getElementById("visible"),
        publicationSavedStep: document.getElementById("publication-saved-step"),
        publicationDeployStep: document.getElementById("publication-deploy-step"),
        publicationPublicStep: document.getElementById("publication-public-step"),
        publicationStatusCopy: document.getElementById("publication-status-copy"),
        arenaEnabled: document.getElementById("arena-enabled"),
        arenaChannel: document.getElementById("arena-channel"),
        arenaChannelField: document.getElementById("arena-channel-field"),
        arenaSummary: document.getElementById("arena-summary"),
        arenaMessage: document.getElementById("arena-message"),
        arenaLinks: document.getElementById("arena-links"),
        arenaRetry: document.getElementById("arena-retry"),
        status: document.getElementById("status"),
        savedLink: document.getElementById("saved-link"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        document.body.dataset.editorKind = editorController.kind;
        document.body.classList.toggle("is-grayscale", grayscale);
        els.date.value = today();
        setSaveState("Sincronizado", "saved");
        bind();
        if (sourcePath) {
          loadExistingPhoto().then(loadArenaStatus).then(function () {
            return els.arenaEnabled.checked ? ensureArenaChannels() : null;
          }).catch(function (error) {
            setStatus(error.message, true);
          });
        } else {
          seedImageFromParams();
          render();
          updatePropertySummaries();
        }
        loadNotebooks().catch(function (error) {
          setStatus(error.message, true);
        });
        setPublicationState("idle", "Publica para iniciar el proceso.");
      }

      function bind() {
        els.back.addEventListener("click", function () {
          if (!confirmDiscardChanges()) return;
          window.close();
          window.history.back();
        });
        window.addEventListener("beforeunload", function (event) {
          if (!hasUnsavedChanges || saveBusy) return;
          event.preventDefault();
          event.returnValue = "";
        });
        els.chooseImageEmpty.addEventListener("click", function () {
          chooseImages("add");
        });
        els.addImages.addEventListener("click", function () {
          chooseImages("add");
        });
        els.replaceImage.addEventListener("click", function () {
          chooseImages(selectedImage() ? "replace" : "add");
        });
        els.backToLightbox.addEventListener("click", function () {
          viewMode = "lightbox";
          render();
        });
        els.reviewEdit.addEventListener("click", function () {
          viewMode = images.length > 1 ? "lightbox" : "detail";
          render();
        });
        els.reviewPublish.addEventListener("click", publishCurrentState);
        els.removeImage.addEventListener("click", removeSelectedImage);
        document.querySelectorAll("[data-edit-panel]").forEach(function (button) {
          button.addEventListener("click", function () {
            var editor = document.getElementById(button.getAttribute("data-edit-panel"));
            if (!editor) return;
            var panel = editor.closest(".panel");
            panel.classList.toggle("is-editing");
            if (panel.classList.contains("is-editing")) {
              openProperties();
            }
            if (button.getAttribute("data-edit-panel") === "arena-editor") {
              ensureArenaChannels();
            }
            var control = editor.querySelector("input, select, textarea");
            if (panel.classList.contains("is-editing") && control) {
              control.focus();
            }
          });
        });
        els.imageFile.addEventListener("change", function () {
          var files = Array.prototype.slice.call(els.imageFile.files || []);
          if (files.length) {
            addImageFiles(files, pendingFileMode === "replace");
          }
          els.imageFile.value = "";
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
          var files = Array.prototype.slice.call(event.dataTransfer && event.dataTransfer.files || []);
          if (files.length) {
            addImageFiles(files, false);
          }
        });
        els.cropImage.addEventListener("click", function () {
          var image = selectedImage();
          if (!image) return;
          image.cropMode = !image.cropMode;
          image.needsUpload = true;
          render();
          markUnsaved(image.cropMode ? "Recorte cuadrado activado." : "Recorte cuadrado desactivado.");
        });
        els.rotateImage.addEventListener("click", function () {
          var image = selectedImage();
          if (!image) return;
          image.rotation = (image.rotation + 90) % 360;
          image.needsUpload = true;
          render();
          markUnsaved("Imagen girada " + image.rotation + " grados.");
        });
        els.previewImage.addEventListener("click", function () {
          var image = selectedImage() || images[0];
          var url = image ? imageUrl(image) : "";
          if (url) {
            window.open(url, "_blank", "noopener");
          }
        });
        els.propertiesToggle.addEventListener("click", toggleProperties);
        els.propertiesClose.addEventListener("click", closeProperties);
        els.propertiesBackdrop.addEventListener("click", closeProperties);
        els.editAltImage.addEventListener("click", function () {
          openProperties();
          openPanel("alt-panel");
        });
        els.notebook.addEventListener("change", function () {
          syncDefaultTags();
          updateNotebookRail();
          markUnsaved();
        });
        [els.title, els.body, els.date, els.tags].forEach(function (input) {
          input.addEventListener("input", function () {
            updatePropertySummaries();
            markUnsaved();
          });
        });
        els.captionInline.addEventListener("input", function () {
          var image = selectedImage();
          if (image) {
            image.caption = els.captionInline.value;
            els.caption.value = els.captionInline.value;
          }
          updatePropertySummaries();
          markUnsaved();
        });
        els.alt.addEventListener("input", function () {
          var image = selectedImage();
          if (image) {
            image.alt = els.alt.value;
          }
          updatePropertySummaries();
          markUnsaved();
        });
        els.caption.addEventListener("input", function () {
          var image = selectedImage();
          if (image) {
            image.caption = els.caption.value;
            els.captionInline.value = els.caption.value;
          }
          updatePropertySummaries();
          markUnsaved();
        });
        els.alt.addEventListener("blur", function () {
          closePropertyEditor(els.alt);
        });
        els.caption.addEventListener("blur", function () {
          closePropertyEditor(els.caption);
        });
        els.visible.addEventListener("change", function () {
          els.draft.checked = !els.visible.checked;
          updatePropertySummaries();
          markUnsaved();
        });
        els.arenaEnabled.addEventListener("change", function () {
          els.arenaChannelField.hidden = !els.arenaEnabled.checked;
          if (els.arenaEnabled.checked) {
            ensureArenaChannels().then(function () {
              selectFallbackArenaChannel();
              syncArenaConfiguration();
            }).catch(function () {});
          } else {
            syncArenaConfiguration();
          }
          markUnsaved();
        });
        els.arenaChannel.addEventListener("change", function () {
          syncArenaConfiguration();
          markUnsaved();
        });
        els.arenaRetry.addEventListener("click", retryArenaSync);
        els.saveDraft.addEventListener("click", saveCurrentState);
        els.mobileSaveDraft.addEventListener("click", saveCurrentState);
        els.panelSaveDraft.addEventListener("click", saveCurrentState);
        els.publish.addEventListener("click", publishCurrentState);
        els.mobilePublish.addEventListener("click", publishCurrentState);
        els.panelPublish.addEventListener("click", publishCurrentState);
      }

      function loadNotebooks() {
        var cached = null;
        try {
          cached = JSON.parse(sessionStorage.getItem(notebookCacheStorageKey) || "null");
        } catch (error) {
          cached = null;
        }
        if (cached && Date.now() - cached.savedAt < 20000 && Array.isArray(cached.notebooks)) {
          renderNotebooks(cached.notebooks);
          request("/notebooks").then(cacheAndRenderNotebooks).catch(function () {});
          return Promise.resolve();
        }
        return request("/notebooks").then(cacheAndRenderNotebooks);
      }

      function loadExistingPhoto() {
        return request("/page?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          var frontMatter = payload.frontMatter || {};
          var gallery = Array.isArray(frontMatter.images) && frontMatter.images.length
            ? frontMatter.images
            : frontMatter.image
              ? [{
                  src: frontMatter.image,
                  thumb: frontMatter.thumbnail || frontMatter.image,
                  alt: frontMatter.image_alt || "",
                  caption: frontMatter.caption || "",
                }]
              : [];

          savedPath = payload.path || sourcePath;
          savedUrl = payload.url || "";
          els.title.value = frontMatter.title || "";
          els.body.value = payload.body || "";
          els.date.value = frontMatter.date || today();
          els.tags.value = (frontMatter.tags || []).join(", ");
          els.visible.checked = frontMatter.draft !== true && frontMatter.hidden !== true;
          els.draft.checked = !els.visible.checked;
          els.arenaEnabled.checked = frontMatter.arena_enabled === true;
          els.arenaChannelField.hidden = !els.arenaEnabled.checked;
          if (frontMatter.arena_channel_id) {
            var configuredChannel = document.createElement("option");
            configuredChannel.value = String(frontMatter.arena_channel_id);
            configuredChannel.textContent = "Canal configurado";
            els.arenaChannel.appendChild(configuredChannel);
            els.arenaChannel.value = String(frontMatter.arena_channel_id);
          }
          images = gallery.map(function (item, index) {
            var uploadedUrl = item.src || item.image || item.url || "";
            var thumbnailUrl = item.thumb || item.thumbnail || uploadedUrl;
            return {
              id: "image-existing-" + index,
              file: null,
              name: uploadedUrl.split("?")[0].split("/").pop() || "imagen",
              type: "image",
              size: 0,
              previewUrl: "",
              uploadedUrl: uploadedUrl,
              thumbnailUrl: thumbnailUrl,
              alt: item.alt || item.image_alt || frontMatter.image_alt || "",
              caption: item.caption || (index === 0 ? frontMatter.caption || "" : ""),
              rotation: 0,
              cropMode: false,
              needsUpload: false,
              previewBytes: 0,
            };
          });
          selectedImageId = images[0] ? images[0].id : "";
          viewMode = images.length > 1 ? "lightbox" : images.length === 1 ? "detail" : "empty";
          render();
          updatePropertySummaries();
          setSaveState("Sincronizado", "saved");
          setStatus(images.length ? "Publicacion cargada." : "Esta publicacion no tiene imagen.", !images.length);
        });
      }

      function cacheAndRenderNotebooks(payload) {
        var notebooks = payload.notebooks || [];
        try {
          sessionStorage.setItem(notebookCacheStorageKey, JSON.stringify({
            savedAt: Date.now(),
            notebooks: notebooks,
          }));
        } catch (error) {}
        renderNotebooks(notebooks);
      }

      function renderNotebooks(notebooks) {
        var selectedPath = els.notebook.value || preferredNotebook;
        els.notebook.innerHTML = "";
        notebooks.forEach(function (notebook) {
          var option = document.createElement("option");
          option.value = notebook.path;
          option.textContent = notebook.title + " (" + notebook.lang + ")";
          if (notebook.path === selectedPath) {
            option.selected = true;
          }
          els.notebook.appendChild(option);
        });
        renderNotebookRail(notebooks);
        if (!els.notebook.value && els.notebook.options.length) {
          els.notebook.options[0].selected = true;
        }
        syncDefaultTags();
        updateNotebookRail();
        updatePropertySummaries();
      }

      function ensureArenaChannels() {
        if (arenaChannelsLoaded) return Promise.resolve();
        if (arenaChannelsLoading) return arenaChannelsLoading;
        arenaChannelsLoading = loadArenaChannels().then(function () {
          arenaChannelsLoaded = true;
        }).catch(function (error) {
          setArenaState({ state: "unavailable", error: error.message });
          throw error;
        }).finally(function () {
          arenaChannelsLoading = null;
        });
        return arenaChannelsLoading;
      }

      function loadArenaChannels() {
        return request("/arena-channels").then(function (payload) {
          arenaChannels = payload.channels || [];
          var preferredId = params.get("arena_channel") || els.arenaChannel.value || "";
          els.arenaChannel.innerHTML = "";

          var placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = "Elige un canal";
          els.arenaChannel.appendChild(placeholder);

          arenaChannels.forEach(function (channel) {
            var option = document.createElement("option");
            option.value = String(channel.id);
            option.textContent = channel.title;
            option.selected = option.value === preferredId;
            els.arenaChannel.appendChild(option);
          });

          if (!arenaChannels.length) {
            placeholder.textContent = "No hay canales disponibles";
            els.arenaChannel.disabled = true;
            els.arenaEnabled.disabled = true;
            setArenaState({ state: "unavailable", error: "Crea un canal en Are.na antes de activar la copia." });
            return;
          }

          els.arenaChannel.disabled = false;
          els.arenaEnabled.disabled = false;
          els.arenaChannel.value = arenaChannels.some(function (channel) {
            return String(channel.id) === preferredId;
          }) ? preferredId : String(arenaChannels[0].id);
          syncArenaUi();
        });
      }

      function selectFallbackArenaChannel() {
        if (!els.arenaEnabled.checked || els.arenaChannel.value || !arenaChannels.length) return;
        els.arenaChannel.value = String(arenaChannels[0].id);
      }

      function loadArenaStatus() {
        if (!savedPath || !els.arenaEnabled.checked) return Promise.resolve();
        return request("/arena-status?path=" + encodeURIComponent(savedPath)).then(function (payload) {
          setArenaState(payload || {});
        });
      }

      function setArenaState(next) {
        arenaState = Object.assign({}, arenaState, next || {});
        if (!Array.isArray(arenaState.blocks)) arenaState.blocks = [];
        syncArenaUi();
      }

      function currentArenaChannelTitle() {
        var id = String(els.arenaChannel.value || "");
        var channel = arenaChannels.find(function (item) {
          return String(item.id) === id;
        });
        return channel ? channel.title : "el canal elegido";
      }

      function syncArenaConfiguration() {
        if (!els.arenaEnabled.checked) {
          setArenaState({ state: "disabled", error: "" });
          return;
        }
        selectFallbackArenaChannel();
        if (!els.arenaChannel.value) {
          setArenaState({ state: "error", error: "Elige un canal de Are.na." });
          return;
        }
        setArenaState({ state: "pending", error: "" });
      }

      function syncArenaUi() {
        var state = arenaState.state || "disabled";
        var blockCount = (arenaState.blocks || []).length;
        els.arenaChannelField.hidden = !els.arenaEnabled.checked;
        var messages = {
          disabled: "La copia está desactivada.",
          unavailable: arenaState.error || "Are.na no está disponible.",
          paused: "Las imágenes se copiarán cuando publiques.",
          pending: arenaState.error || (blockCount
            ? (blockCount === 1 ? "La imagen ya está copiada; hay una actualización pendiente." : "Las imágenes ya están copiadas; hay una actualización pendiente.")
            : (savedPath ? "La copia está pendiente." : "Se copiarán al publicar.")),
          syncing: "Copiando imágenes y metadatos a Are.na...",
          synced: blockCount + (blockCount === 1 ? " imagen copiada en " : " imágenes copiadas en ") + currentArenaChannelTitle() + ".",
          error: arenaState.error || "No se pudo completar la copia en Are.na.",
        };
        var summaries = {
          disabled: "no se copiará",
          unavailable: "no disponible",
          paused: "al publicar",
          pending: blockCount
            ? blockCount + (blockCount === 1 ? " imagen copiada · actualización pendiente" : " imágenes copiadas · actualización pendiente")
            : "pendiente",
          syncing: "copiando...",
          synced: blockCount + (blockCount === 1 ? " imagen copiada" : " imágenes copiadas"),
          error: "necesita reintento",
        };

        els.arenaSummary.textContent = summaries[state] || summaries.disabled;
        els.arenaMessage.textContent = messages[state] || messages.disabled;
        els.arenaMessage.classList.toggle("is-error", state === "error" || state === "unavailable" || Boolean(arenaState.error));
        els.arenaRetry.hidden = !savedPath || (state !== "error" && state !== "pending");
        els.arenaLinks.innerHTML = "";
        (arenaState.blocks || []).forEach(function (block, index) {
          if (!block.blockUrl) return;
          var link = document.createElement("a");
          link.href = block.blockUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = "Abrir imagen " + (index + 1);
          els.arenaLinks.appendChild(link);
        });
        if (els.reviewArena) {
          els.reviewArena.textContent = els.arenaEnabled.checked
            ? (els.draft.checked ? "al publicar" : "copiar ahora")
            : "no se copiará";
        }
      }

      function syncArenaAfterSave(draft) {
        var hasMappings = (arenaState.blocks || []).length > 0;
        if (!savedPath || (!els.arenaEnabled.checked && !hasMappings)) {
          syncArenaConfiguration();
          return Promise.resolve(true);
        }
        selectFallbackArenaChannel();
        if (els.arenaEnabled.checked && !els.arenaChannel.value) {
          setArenaState({ state: "error", error: "Elige un canal de Are.na." });
          return Promise.resolve(false);
        }

        setArenaState({ state: "syncing", error: "" });
        return postJson("/sync-arena", { path: savedPath }).then(function (payload) {
          setArenaState(payload.arena || {});
          return true;
        }).catch(function (error) {
          setArenaState({ state: "error", error: error.message });
          setStatus("El blog quedó guardado, pero Are.na necesita un reintento: " + error.message, true);
          return false;
        });
      }

      function retryArenaSync() {
        if (!savedPath) {
          setArenaState({ state: "pending", error: "Guarda primero la publicación." });
          return;
        }
        if (hasUnsavedChanges) {
          setArenaState({ state: "pending", error: "Guarda primero los cambios del blog." });
          return;
        }
        setBusy(true);
        syncArenaAfterSave(els.draft.checked).finally(function () {
          setBusy(false);
        });
      }

      function renderNotebookRail(notebooks) {
        els.notebookRail.innerHTML = "";
        notebooks.forEach(function (notebook) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "rail-link";
          button.dataset.notebook = notebook.path;
          button.textContent = notebook.title + " (" + notebook.lang + ")";
          button.addEventListener("click", function () {
            if (els.notebook.value === notebook.path) return;
            els.notebook.value = notebook.path;
            syncDefaultTags();
            updateNotebookRail();
            markUnsaved();
          });
          els.notebookRail.appendChild(button);
        });
      }

      function updateNotebookRail() {
        els.notebookRail.querySelectorAll("[data-notebook]").forEach(function (button) {
          var isActive = button.dataset.notebook === els.notebook.value;
          button.classList.toggle("is-active", isActive);
          if (isActive) {
            button.setAttribute("aria-current", "true");
          } else {
            button.removeAttribute("aria-current");
          }
        });
      }

      function chooseImages(mode) {
        pendingFileMode = mode || "add";
        els.imageFile.click();
      }

      function addImageFiles(files, replaceSelected) {
        var rejectedFiles = [];
        var validFiles = files.filter(function (file) {
          if (!file || allowedImageTypes.indexOf(file.type) === -1) {
            rejectedFiles.push(file && file.name ? file.name : "archivo");
            return false;
          }
          if (isPassthroughFile(file) && file.size > maxUploadBytes) {
            rejectedFiles.push(file.name);
            return false;
          }
          return true;
        });
        if (!validFiles.length) {
          setStatus(rejectedFiles.length ? "Ningun archivo paso la validacion." : "Elige archivos de imagen.", true);
          return;
        }
        if (replaceSelected && selectedImage()) {
          replaceImageFile(selectedImage(), validFiles[0]);
          viewMode = "detail";
        } else {
          var newImages = validFiles.map(createImage);
          images = images.concat(newImages);
          selectedImageId = newImages[0].id;
          viewMode = images.length > 1 ? "lightbox" : "detail";
        }
        if (!els.title.value.trim()) {
          els.title.value = validFiles.length === 1 ? filenameTitle(validFiles[0].name) : "Galeria " + today();
        }
        render();
        var message = validFiles.length === 1 ? "Imagen lista." : validFiles.length + " imagenes listas.";
        if (rejectedFiles.length) {
          message += " Se omitieron " + rejectedFiles.length + ".";
        }
        markUnsaved(message);
      }

      function createImage(file) {
        return {
          id: "image-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
          file: file,
          name: file.name,
          type: file.type,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          uploadedUrl: "",
          thumbnailUrl: "",
          alt: filenameTitle(file.name),
          caption: "",
          rotation: 0,
          cropMode: false,
          needsUpload: true,
          previewBytes: 0,
        };
      }

      function seedImageFromParams() {
        var imageParam = params.get("image") || "";
        if (!imageParam) return;
        var imageName = imageParam.split("?")[0].split("/").pop() || imageParam;
        var titleParam = params.get("title") || "";
        var captionParam = params.get("caption") || "";
        var altParam = params.get("alt") || titleParam || filenameTitle(imageName);
        var name = filenameTitle(imageName);
        images = [{
          id: "image-seed",
          file: null,
          name: name,
          type: imageName.split(".").pop() ? "image/" + imageName.split(".").pop().replace("jpg", "jpeg") : "image",
          size: 0,
          previewUrl: "",
          uploadedUrl: imageParam,
          thumbnailUrl: params.get("thumbnail") || imageParam,
          alt: altParam,
          caption: captionParam,
          rotation: 0,
          cropMode: false,
          needsUpload: false,
          previewBytes: 0,
        }];
        selectedImageId = "image-seed";
        viewMode = "detail";
        if (titleParam) {
          els.title.value = titleParam;
        } else if (!els.title.value.trim()) {
          els.title.value = name;
        }
        if (captionParam && !els.tags.value.trim()) {
          els.tags.value = "photography";
        }
      }

      function replaceImageFile(image, file) {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        image.file = file;
        image.name = file.name;
        image.type = file.type;
        image.size = file.size;
        image.previewUrl = URL.createObjectURL(file);
        image.uploadedUrl = "";
        image.thumbnailUrl = "";
        image.alt = filenameTitle(file.name);
        image.rotation = 0;
        image.cropMode = false;
        image.needsUpload = true;
        image.previewBytes = 0;
        selectedImageId = image.id;
      }

      function removeSelectedImage() {
        var image = selectedImage();
        if (!image) return;
        var uploadedUrls = uniqueUploadUrls(image);
        if (uploadedUrls.length && !image.needsUpload && window.confirm("Eliminar tambien el archivo de imagen del repositorio?")) {
          setStatus("Eliminando archivo de imagen.", false);
          Promise.all(uploadedUrls.map(deleteUploadedImage)).then(function () {
            removeImageFromPost(image);
          }).catch(function (error) {
            setStatus(error.message, true);
          });
          return;
        }
        removeImageFromPost(image);
      }

      function removeImageFromPost(image) {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        images = images.filter(function (item) {
          return item.id !== image.id;
        });
        selectedImageId = images[0] ? images[0].id : "";
        viewMode = images.length > 1 ? "lightbox" : images.length === 1 ? "detail" : "empty";
        render();
        markUnsaved(images.length ? "Imagen quitada." : "Elige una imagen para empezar.");
      }

      function uniqueUploadUrls(image) {
        var urls = [];
        [image.uploadedUrl, image.thumbnailUrl].forEach(function (url) {
          if (url && urls.indexOf(url) === -1) {
            urls.push(url);
          }
        });
        return urls;
      }

      function deleteUploadedImage(url) {
        return postJson("/delete-image", { url: url });
      }

      function render() {
        var hasImages = images.length > 0;
        if (!hasImages) {
          viewMode = "empty";
        } else if (viewMode === "empty") {
          viewMode = images.length > 1 ? "lightbox" : "detail";
        }
        ensureSelectedImage();
        document.body.classList.toggle("has-image", hasImages);
        document.body.classList.toggle("has-multiple", images.length > 1);
        document.body.classList.toggle("mode-lightbox", viewMode === "lightbox");
        document.body.classList.toggle("mode-detail", viewMode === "detail");
        document.body.classList.toggle("mode-review", viewMode === "review");
        els.emptyState.hidden = hasImages;
        els.previewState.hidden = !hasImages;
        els.lightboxView.hidden = viewMode !== "lightbox";
        els.detailView.hidden = viewMode !== "detail";
        els.reviewView.hidden = viewMode !== "review";

        renderLightbox();
        renderDetail();
        renderReview();
        syncSelectedInputs();
        updatePropertySummaries();
        updateActionLabels();
        syncActionAvailability();
      }

      function renderLightbox() {
        els.lightboxGrid.innerHTML = "";
        images.forEach(function (image, index) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "lightbox-item";
          button.draggable = true;
          button.dataset.imageId = image.id;
          button.classList.toggle("is-selected", image.id === selectedImageId);
          button.innerHTML =
            '<img src="' + imageUrl(image) + '" alt="">' +
            '<span class="lightbox-meta">' +
            '<span>' + (index + 1) + '</span>' +
            '<span class="' + (index === 0 ? "cover-chip" : "") + '">' + (index === 0 ? "Portada" : imageStatusLabel(image)) + '</span>' +
            '</span>';
          button.addEventListener("click", function () {
            selectedImageId = image.id;
            viewMode = "detail";
            render();
          });
          button.addEventListener("dragstart", function (event) {
            draggedImageId = image.id;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", image.id);
          });
          button.addEventListener("dragover", function (event) {
            event.preventDefault();
            button.classList.add("is-over");
          });
          button.addEventListener("dragleave", function () {
            button.classList.remove("is-over");
          });
          button.addEventListener("drop", function (event) {
            event.preventDefault();
            button.classList.remove("is-over");
            reorderImage(draggedImageId || event.dataTransfer.getData("text/plain"), image.id);
          });
          els.lightboxGrid.appendChild(button);
        });

        var addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "add-tile";
        addButton.setAttribute("aria-label", "Agregar imagenes");
        addButton.innerHTML = '${ICONS.imagePlus}';
        addButton.addEventListener("click", function () {
          chooseImages("add");
        });
        els.lightboxGrid.appendChild(addButton);
      }

      function renderDetail() {
        var image = selectedImage();
        var hasImage = Boolean(image);
        els.detailHead.hidden = images.length < 2;
        els.imagePreview.hidden = !hasImage;
        els.imageStage.classList.toggle("is-cropped", Boolean(image && image.cropMode));
        els.cropImage.classList.toggle("is-active", Boolean(image && image.cropMode));
        els.cropImage.disabled = !hasImage;
        els.rotateImage.disabled = !hasImage;
        els.replaceImage.disabled = !hasImage;
        els.removeImage.hidden = !hasImage;

        if (image) {
          els.imagePreview.src = imageUrl(image);
          els.imagePreview.alt = image.alt || els.title.value || filenameTitle(image.name);
          els.imagePreview.style.transform = "rotate(" + image.rotation + "deg)";
          els.selectedCounter.textContent = "Imagen " + (selectedIndex() + 1) + " de " + images.length;
        }
        renderThumbRail();
      }

      function renderThumbRail() {
        els.thumbRail.innerHTML = "";
        if (images.length < 2) return;
        images.forEach(function (image, index) {
          var button = document.createElement("button");
          button.type = "button";
          button.className = "rail-thumb";
          button.classList.toggle("is-selected", image.id === selectedImageId);
          button.innerHTML =
            '<img src="' + imageUrl(image) + '" alt="">' +
            '<span class="rail-meta">' + (index === 0 ? "Portada" : String(index + 1)) + '</span>';
          button.addEventListener("click", function () {
            selectedImageId = image.id;
            render();
          });
          els.thumbRail.appendChild(button);
        });
      }

      function renderReview() {
        if (!images.length) return;
        var cover = images[0];
        var missingAlt = images.filter(function (image) {
          return !image.alt.trim();
        }).length;
        els.reviewCoverImage.src = imageUrl(cover);
        els.reviewCoverImage.alt = cover.alt || els.title.value || filenameTitle(cover.name);
        els.reviewDestination.textContent = selectedNotebookLabel();
        els.reviewCount.textContent = imageCountLabel();
        els.reviewAlt.textContent = missingAlt ? "predeterminado" : "completo";
        els.reviewAlt.classList.toggle("review-warning", missingAlt > 0);
        els.reviewStatus.textContent = els.visible.checked ? "visible en el blog" : "solo en admin";
        syncArenaUi();
      }

      function reorderImage(sourceId, targetId) {
        if (!sourceId || !targetId || sourceId === targetId) return;
        var sourceIndex = images.findIndex(function (image) { return image.id === sourceId; });
        var targetIndex = images.findIndex(function (image) { return image.id === targetId; });
        if (sourceIndex < 0 || targetIndex < 0) return;
        var moved = images.splice(sourceIndex, 1)[0];
        var insertIndex = images.findIndex(function (image) { return image.id === targetId; });
        images.splice(insertIndex, 0, moved);
        selectedImageId = moved.id;
        draggedImageId = "";
        render();
        markUnsaved("Orden actualizado.");
      }

      function ensureSelectedImage() {
        if (!images.length) {
          selectedImageId = "";
          return;
        }
        if (!selectedImage()) {
          selectedImageId = images[0].id;
        }
      }

      function selectedImage() {
        return images.find(function (image) {
          return image.id === selectedImageId;
        }) || null;
      }

      function selectedIndex() {
        return images.findIndex(function (image) {
          return image.id === selectedImageId;
        });
      }

      function syncSelectedInputs() {
        var image = selectedImage();
        els.alt.value = image ? image.alt : "";
        els.caption.value = image ? image.caption : "";
        els.captionInline.value = image ? image.caption : "";
      }

      function updateActionLabels() {
        var publishLabel = images.length > 1 && viewMode !== "review" ? "Revisar" : "Publicar";
        [els.publish, els.mobilePublish, els.panelPublish].forEach(function (button) {
          button.textContent = publishLabel;
        });
        els.reviewPublish.textContent = "Publicar";
      }

      function imageUrl(image) {
        if (!image) return "";
        return image.previewUrl || (image.uploadedUrl ? siteUrl(image.uploadedUrl) : "");
      }

      function imageCountLabel() {
        if (images.length === 1) return "1 imagen";
        return images.length + " imagenes";
      }

      function imageStatusLabel(image) {
        if (!image) return "";
        if (image.uploadedUrl && !image.needsUpload) return "subida";
        return "pendiente";
      }

      function imageStatusSuffix(image) {
        if (!image) return "";
        return image.uploadedUrl && !image.needsUpload ? " - subida" : " - pendiente";
      }

      function syncDefaultTags() {
        if (els.notebook.value === "content_es/fotografia" && !els.tags.value.trim()) {
          els.tags.value = "photography";
        }
        updatePropertySummaries();
      }

      function closePropertyEditor(control) {
        var panel = control.closest(".panel");
        if (panel) {
          panel.classList.remove("is-editing");
        }
      }

      function openPanel(id) {
        var editor = document.getElementById(id);
        if (!editor) return;
        var panel = editor.closest(".panel");
        if (!panel) return;
        panel.classList.add("is-editing");
        var control = editor.querySelector("input, select, textarea");
        if (control) {
          control.focus();
        }
      }

      function toggleProperties() {
        if (document.body.classList.contains("properties-open")) {
          closeProperties();
          return;
        }
        openProperties();
      }

      function openProperties() {
        document.body.classList.add("properties-open");
        els.propertiesBackdrop.hidden = false;
        els.propertiesToggle.setAttribute("aria-expanded", "true");
      }

      function closeProperties() {
        document.body.classList.remove("properties-open");
        els.propertiesBackdrop.hidden = true;
        els.propertiesToggle.setAttribute("aria-expanded", "false");
      }

      function updatePropertySummaries() {
        var image = selectedImage();
        var altWritten = Boolean(image && image.alt.trim());
        var captionWritten = Boolean(image && image.caption.trim());
        els.altSummary.textContent = altWritten ? "Completo" : "Falta texto alt";
        els.altAction.textContent = altWritten ? "editar" : "+ añadir";
        els.captionSummary.textContent = captionWritten ? "Escrito" : "Sin pie (opcional)";
        els.captionAction.textContent = captionWritten ? "editar" : "+ añadir";
        els.notebookSummary.textContent = selectedNotebookLabel();
        els.notebookPath.textContent = els.notebook.value || "sin destino";
        els.mediaCount.textContent = images.length ? imageCountLabel() : "imagen";
        if (image) {
          els.filePanelTitle.textContent = "Imagen " + (selectedIndex() + 1) + " de " + images.length;
          els.previewEmpty.hidden = false;
          els.previewEmpty.textContent = selectedIndex() === 0 ? "Portada" : "Imagen " + (selectedIndex() + 1);
          els.previewMeta.textContent = image.thumbnailUrl
            ? "Preview ligera · 640 px" + (image.previewBytes ? " · " + formatBytes(image.previewBytes) : "")
            : imageStatusLabel(image);
        } else {
          els.filePanelTitle.textContent = "Archivo";
          els.previewEmpty.hidden = false;
          els.previewEmpty.textContent = "sin archivo";
          els.previewMeta.textContent = "pendiente";
        }
      }

      function selectedNotebookLabel() {
        var option = els.notebook.options[els.notebook.selectedIndex];
        if (!option) return "Fotografia";
        return option.textContent.replace(/ \\([^)]*\\)$/, "");
      }

      function markUnsaved(message) {
        hasUnsavedChanges = true;
        updatePropertySummaries();
        updateActionLabels();
        if (els.arenaEnabled.checked && arenaState.state !== "unavailable") {
          setArenaState({ state: "pending", error: "" });
        }
        setSaveState("Sin guardar", "");
        if (message) {
          setStatus(message, false);
        }
      }

      function setSaveState(text, state) {
        els.saveState.textContent = text;
        els.saveState.classList.toggle("is-saved", state === "saved");
        els.saveState.classList.toggle("is-error", state === "error");
        els.saveState.classList.toggle("is-saving", state === "saving");
      }

      function setStatus(message, isError) {
        els.status.textContent = message;
        els.status.classList.toggle("is-error", Boolean(isError));
        if (isError) {
          setSaveState("Necesita ajuste", "error");
        }
      }

      function setBusy(isBusy) {
        saveBusy = isBusy;
        [els.saveDraft, els.mobileSaveDraft, els.panelSaveDraft].forEach(function (button) {
          button.disabled = isBusy;
        });
        syncActionAvailability();
        els.arenaRetry.disabled = isBusy;
      }

      function syncActionAvailability() {
        var publishDisabled = saveBusy || images.length === 0;
        [els.publish, els.mobilePublish, els.panelPublish, els.reviewPublish].forEach(function (button) {
          button.disabled = publishDisabled;
          button.setAttribute("aria-disabled", publishDisabled ? "true" : "false");
        });
        els.previewImage.disabled = images.length === 0;
        els.editAltImage.disabled = images.length === 0;
      }

      function confirmDiscardChanges() {
        if (!hasUnsavedChanges || saveBusy) return true;
        return window.confirm("Hay cambios sin guardar. ¿Quieres salir y descartarlos?");
      }

      function publishCurrentState() {
        if (saveBusy) return;
        var ready = els.arenaEnabled.checked ? ensureArenaChannels() : Promise.resolve();
        ready.then(function () {
          selectFallbackArenaChannel();
          saveCurrentState();
        }).catch(function (error) {
          setStatus(error.message, true);
        });
      }

      function saveCurrentState() {
        if (saveBusy) return;
        els.draft.checked = !els.visible.checked;
        if (!validatePost(els.draft.checked)) return;
        if (images.length > 1 && viewMode !== "review") {
          viewMode = "review";
          render();
          setStatus("Revisa la galería y confirma el guardado.", false);
          return;
        }
        savePost(els.draft.checked);
      }

      function savePost(saveAsDraft) {
        if (saveBusy) return;
        if (!validatePost(saveAsDraft)) return;
        setBusy(true);
        setSaveState("Guardando...", "saving");
        setPublicationState("saving", "Guardando cambios en GitHub.");
        setStatus(images.length > 1 ? "Preparando imagenes." : "Preparando imagen.", false);
        publicationRedirectNotebook = savedPath ? notebookPathForContent(savedPath) : els.notebook.value;
        ensureUploadedImages().then(function () {
          var draft = saveAsDraft ? true : false;
          els.draft.checked = draft;
          var frontMatter = imageFrontMatter(draft);
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
            hidden: frontMatter.hidden === true,
            image: frontMatter.image,
            thumbnail: frontMatter.thumbnail,
            imageAlt: frontMatter.image_alt,
            caption: frontMatter.caption || "",
            images: frontMatter.images || [],
            arenaEnabled: frontMatter.arena_enabled === true,
            arenaChannelId: frontMatter.arena_channel_id || "",
            body: els.body.value,
          });
        }).then(function (result) {
          assertPersistedState(result);
          savedPath = result.path || savedPath;
          savedUrl = result.url || savedUrl;
          hasUnsavedChanges = false;
          setSaveState("Guardado", "saved");
          setStatus(els.draft.checked ? "Guardado solo en admin." : "Guardado en GitHub.", false);
          if (savedUrl) {
            els.savedLink.href = publicPostUrl();
            els.savedLink.hidden = els.draft.checked;
          }
          return syncArenaAfterSave(els.draft.checked);
        }).then(function (arenaSaved) {
          if (arenaSaved === false) {
            throw new Error(arenaState.error || "Are.na necesita un reintento.");
          }
          // Product contract: GitHub -> Are.na -> Notebook. Code deployment is unrelated.
          redirectToNotebook();
        }).catch(function (error) {
          setSaveState("Error al guardar", "error");
          setPublicationState("error", error.message);
          setStatus(error.message, true);
        }).finally(function () {
          setBusy(false);
        });
      }

      function assertPersistedState(result) {
        var persisted = result && result.frontMatter ? result.frontMatter : {};
        if ((persisted.draft === true) !== els.draft.checked) {
          throw new Error("GitHub guardó el archivo, pero el estado de publicación no coincide.");
        }
        if ((persisted.hidden === true) !== !els.visible.checked) {
          throw new Error("GitHub guardó el archivo, pero la visibilidad no coincide.");
        }
      }

      function publicPostUrl() {
        return editorCore.publicContentUrl(savedUrl);
      }

      function setPublicationState(state, message) {
        [els.publicationSavedStep, els.publicationDeployStep, els.publicationPublicStep].forEach(function (step) {
          step.classList.remove("is-active", "is-complete");
        });
        if (["saved", "deploying", "pending", "public", "admin", "draft"].indexOf(state) !== -1) {
          els.publicationSavedStep.classList.add("is-complete");
        }
        if (state === "saving" || state === "error") els.publicationSavedStep.classList.add("is-active");
        if (state === "deploying" || state === "pending") els.publicationDeployStep.classList.add("is-active");
        if (state === "public") {
          els.publicationDeployStep.classList.add("is-complete");
          els.publicationPublicStep.classList.add("is-complete");
        }
        if (state === "admin") els.publicationDeployStep.classList.add("is-complete");
        els.publicationStatusCopy.textContent = message || "";
      }

      function redirectToNotebook() {
        window.location.assign(editorCore.adminNotebookUrl(publicationRedirectNotebook));
      }

      function validatePost(targetDraft) {
        if (!images.length) {
          setStatus("Elige una imagen antes de guardar.", true);
          els.chooseImageEmpty.focus();
          return false;
        }
        if (!els.title.value.trim()) {
          setStatus("Agrega un titulo.", true);
          els.title.focus();
          return false;
        }
        if (!els.notebook.value) {
          setStatus("Elige un destino.", true);
          els.notebook.focus();
          return false;
        }
        selectFallbackArenaChannel();
        if (els.arenaEnabled.checked && !els.arenaChannel.value) {
          setStatus("Are.na no devolvió ningún canal disponible.", true);
          openProperties();
          els.arenaChannel.focus();
          return false;
        }
        return true;
      }

      function imageFrontMatter(draft) {
        var title = els.title.value.trim();
        var items = images.map(function (image, index) {
          return {
            src: image.uploadedUrl,
            thumb: image.thumbnailUrl || image.uploadedUrl,
            alt: defaultImageAlt(image, index),
            caption: image.caption.trim(),
          };
        });
        var cover = items[0];
        var caption = cover.caption;
        var summary = caption;
        if (!summary && items.length > 1) {
          summary = items.length + " imagenes";
        }
        var frontMatter = {
          title: title,
          date: els.date.value || today(),
          draft: draft,
          hidden: !els.visible.checked,
          tags: splitTags(els.tags.value),
          summary: summary,
          image: cover.src,
          thumbnail: cover.thumb || cover.src,
          image_alt: cover.alt,
          caption: caption,
          images: items.length > 1 ? items : [],
        };
        if (els.arenaEnabled.checked) {
          frontMatter.arena_enabled = true;
          frontMatter.arena_channel_id = String(els.arenaChannel.value || "");
        } else if ((arenaState.blocks || []).length) {
          frontMatter.arena_enabled = false;
        }
        return frontMatter;
      }

      function ensureUploadedImages() {
        return images.reduce(function (chain, image, index) {
          return chain.then(function () {
            return ensureUploadedImage(image, index);
          });
        }, Promise.resolve());
      }

      function ensureUploadedImage(image, index) {
        if (image.uploadedUrl && image.thumbnailUrl && !image.needsUpload) {
          return Promise.resolve(image.uploadedUrl);
        }
        setStatus("Subiendo imagen " + (index + 1) + " de " + images.length + ".", false);
        if (isPassthroughImage(image)) {
          return imagePayload(image, fullImageMaxEdge, "").then(function (payload) {
            return postJson("/upload-image", payload);
          }).then(function (result) {
            image.uploadedUrl = result.url;
            image.thumbnailUrl = result.url;
            image.needsUpload = false;
            render();
            return image.uploadedUrl;
          });
        }
        return imagePayload(image, fullImageMaxEdge, "").then(function (payload) {
          return postJson("/upload-image", payload);
        }).then(function (result) {
          image.uploadedUrl = result.url;
          return imagePayload(image, thumbImageMaxEdge, "preview").then(function (thumbPayload) {
            image.previewBytes = thumbPayload.bytes || 0;
            return postJson("/upload-image", thumbPayload);
          }).catch(function () {
            image.thumbnailUrl = image.uploadedUrl;
            return { url: image.uploadedUrl };
          });
        }).then(function (thumbResult) {
          image.thumbnailUrl = thumbResult.url;
          image.needsUpload = false;
          render();
          return image.uploadedUrl;
        });
      }

      function imagePayload(image, maxEdge, suffix) {
        if (!image || !image.file) {
          return Promise.reject(new Error("Elige una imagen antes de guardar."));
        }
        return transformedFile(image, maxEdge, suffix).then(function (fileLike) {
          validateUploadBlob(fileLike.blob);
          return fileToDataUrl(fileLike.blob).then(function (data) {
            return {
              name: fileLike.name,
              alt: defaultImageAlt(image, images.indexOf(image)),
              caption: image.caption.trim(),
              data: data,
              bytes: fileLike.blob.size,
            };
          });
        });
      }

      function transformedFile(image, maxEdge, suffix) {
        if (isPassthroughImage(image)) {
          if (image.cropMode || image.rotation !== 0) {
            return Promise.reject(new Error("Recortar y girar solo estan disponibles para imagenes fijas."));
          }
          return Promise.resolve({
            blob: image.file,
            name: uniqueImageName(image.name, image.type, suffix),
          });
        }
        var isPreview = suffix === "preview";
        return drawTransformedImage(
          image.file,
          image.rotation,
          image.cropMode,
          maxEdge,
          isPreview ? "image/webp" : "",
          isPreview ? 0.72 : 0.88
        ).then(function (blob) {
          return {
            blob: blob,
            name: uniqueImageName(image.name, blob.type, suffix),
          };
        });
      }

      function validateUploadBlob(blob) {
        if (blob.size > maxUploadBytes) {
          throw new Error("La imagen preparada supera 12 MB.");
        }
      }

      function isPassthroughImage(image) {
        return image.type === "image/svg+xml" || image.type === "image/gif";
      }

      function isPassthroughFile(file) {
        return file.type === "image/svg+xml" || file.type === "image/gif";
      }

      function drawTransformedImage(file, angle, cropSquare, maxEdge, outputType, quality) {
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
          var targetWidth = swaps ? sh : sw;
          var targetHeight = swaps ? sw : sh;
          var scale = Math.min(1, Number(maxEdge || fullImageMaxEdge) / Math.max(targetWidth, targetHeight));
          canvas.width = Math.max(1, Math.round(targetWidth * scale));
          canvas.height = Math.max(1, Math.round(targetHeight * scale));
          var ctx = canvas.getContext("2d");
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.scale(scale, scale);
          ctx.rotate(normalized * Math.PI / 180);
          ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
          URL.revokeObjectURL(img.src);
          return new Promise(function (resolve, reject) {
            var type = outputType || (file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg");
            canvas.toBlob(function (blob) {
              if (!blob) {
                reject(new Error("No se pudo preparar la imagen."));
                return;
              }
              resolve(blob);
            }, type, quality || 0.88);
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
            reject(new Error("No se pudo leer la imagen."));
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
            reject(new Error("No se pudo leer la imagen."));
          };
          reader.readAsDataURL(blob);
        });
      }

      function siteUrl(url) {
        if (!url) return "";
        if (/^https?:\\/\\//.test(url)) {
          return url;
        }
        return assetOrigin + (url.charAt(0) === "/" ? url : "/" + url);
      }

      function uniqueImageName(name, mime, suffix) {
        var ext = extensionFor(mime, name);
        var base = slugify(name.replace(/\\.[^.]+$/, "")) || "image";
        if (suffix) {
          base += "-" + slugify(suffix);
        }
        return base + "-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) + ext;
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

      function defaultImageAlt(image, index) {
        var written = image && image.alt ? image.alt.trim() : "";
        if (written) return written;
        var title = els.title.value.trim();
        var fallback = image && image.name ? filenameTitle(image.name) : title;
        if (!fallback) fallback = "Imagen";
        return images.length > 1 && index > 0 && fallback === title ? fallback + " " + (index + 1) : fallback;
      }

    })();
  </script>
</body>
</html>`;
}
