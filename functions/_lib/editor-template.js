function iconSvg(paths) {
  return `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const ICONS = Object.freeze({
  back: iconSvg(`<path d="M18 6 6 18" /><path d="m6 6 12 12" />`),
  undo: iconSvg(`<path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5A5.5 5.5 0 0 1 14.5 20H11" />`),
  redo: iconSvg(`<path d="m15 14 5-5-5-5" /><path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" />`),
  bold: iconSvg(`<path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" />`),
  italic: iconSvg(`<path d="M19 4h-9" /><path d="M14 20H5" /><path d="m15 4-6 16" />`),
  strike: iconSvg(`<path d="M16 4H9a3 3 0 0 0-2.83 4" /><path d="M14 12a4 4 0 0 1 0 8H6" /><path d="M4 12h16" />`),
  code: iconSvg(`<path d="m18 16 4-4-4-4" /><path d="m6 8-4 4 4 4" /><path d="m14.5 4-5 16" />`),
  link: iconSvg(`<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />`),
  heading: iconSvg(`<path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 12a2 2 0 1 1 4 0c0 3-4 3-4 6h4" />`),
  quote: iconSvg(`<path d="M16 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" /><path d="M8 3a2 2 0 0 0-2 2v6h6V5a2 2 0 0 0-2-2z" /><path d="M12 11c0 4-2 7-6 8" /><path d="M20 11c0 4-2 7-6 8" />`),
  list: iconSvg(`<path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />`),
  orderedList: iconSvg(`<path d="M10 6h11" /><path d="M10 12h11" /><path d="M10 18h11" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />`),
  image: iconSvg(`<rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />`),
  settings: iconSvg(`<path d="M9.7 4.1a2.3 2.3 0 0 1 4.6 0 2.3 2.3 0 0 0 3.3 1.9 2.3 2.3 0 0 1 2.3 4 2.3 2.3 0 0 0 0 3.8 2.3 2.3 0 0 1-2.3 4 2.3 2.3 0 0 0-3.3 1.9 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 0-3.3-1.9 2.3 2.3 0 0 1-2.3-4 2.3 2.3 0 0 0 0-3.8 2.3 2.3 0 0 1 2.3-4 2.3 2.3 0 0 0 3.3-1.9" /><circle cx="12" cy="12" r="3" />`),
  trash: iconSvg(`<path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />`),
  copy: iconSvg(`<rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />`),
});

export function authorEditorHtml({ siteOrigin = "", assetOrigin = "", apiBase = "/api" } = {}) {
  const SITE_ORIGIN = String(siteOrigin || "https://fbetancourt.work").replace(/\/+$/, "");
  const ASSET_ORIGIN = String(assetOrigin || SITE_ORIGIN).replace(/\/+$/, "");
  function siteAssetUrl(assetPath) {
    return `${ASSET_ORIGIN}/${String(assetPath).replace(/^\/+/, "")}`;
  }
  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Editor · betancourt</title>
  <link rel="apple-touch-icon" href="${siteAssetUrl("favicon-32.png")}" />
  <link rel="icon" type="image/png" sizes="32x32" href="${siteAssetUrl("favicon-32.png")}" />
  <link rel="icon" type="image/png" sizes="16x16" href="${siteAssetUrl("favicon-16.png")}" />
  <link rel="manifest" href="${siteAssetUrl("site.webmanifest")}" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #050506;
      --panel: #0c0d10;
      --panel-2: #111318;
      --ink: #f2f3f4;
      --muted: #8d949e;
      --line: #23272f;
      --accent: #4ecca3;
      --danger: #ff6b6b;
      --field: #08090b;
      --editor-font: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --editor-title-size: 2rem;
      --editor-subtitle-size: 1rem;
      --editor-body-size: 1rem;
      --writer-width: 48rem;
      --topbar-height: 4.55rem;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      display: grid;
      grid-template-rows: auto 1fr;
    }
    body.is-grayscale {
      filter: grayscale(100%);
    }
    body[data-editor-size="medium"] {
      --editor-title-size: 2.25rem;
      --editor-subtitle-size: 1.1rem;
      --editor-body-size: 1.12rem;
    }
    body[data-editor-size="large"] {
      --editor-title-size: 2.45rem;
      --editor-subtitle-size: 1.25rem;
      --editor-body-size: 1.32rem;
    }
    .topbar {
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 1.25rem;
      border-bottom: 1px solid var(--line);
      background: rgba(5, 5, 6, 0.95);
      position: sticky;
      top: 0;
      z-index: 32;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .brand strong {
      font-size: 0.92rem;
      letter-spacing: 0.02em;
    }
    .editor-brand {
      display: grid;
      gap: 0.05rem;
      min-width: 0;
      font-family: var(--editor-font);
      line-height: 1.05;
    }
    .editor-identity {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .editor-brand strong {
      color: var(--accent);
      font-size: 1rem;
      letter-spacing: 0.02em;
    }
    .editor-brand small {
      color: var(--muted);
      font-size: 0.67rem;
      font-weight: 400;
    }
    .status {
      color: var(--muted);
      font-size: 0.78rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    .mobile-settings-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2.35rem;
      padding: 0 0.65rem;
      font-size: 1.1rem;
      letter-spacing: 0.06em;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 0.4rem;
      background: var(--panel-2);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      min-height: 2.35rem;
      padding: 0.4rem 0.72rem;
      transition: border-color 0.18s ease, color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    }
    button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    button:active {
      transform: scale(0.97);
    }
    .button-icon {
      width: 1.15rem;
      height: 1.15rem;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #001b14;
      font-weight: 700;
    }
    .primary:hover {
      color: #001b14;
    }
    .shell {
      min-height: calc(100vh - 3.5rem);
      display: grid;
      grid-template-columns: minmax(0, 1fr) 20rem;
    }
    .writer {
      display: flex;
      justify-content: center;
      padding: 3rem 1.5rem 5rem;
      overflow: auto;
    }
    .paper {
      width: min(var(--writer-width), 100%);
    }
    .markdown-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.35rem;
      min-width: 2.35rem;
      border: 0 !important;
      background: transparent !important;
      color: var(--muted);
      padding: 0 !important;
      transform: translateZ(0);
      transition: color 0.16s ease, transform 0.16s ease;
    }
    .markdown-toggle::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 0.22rem;
      width: 0.28rem;
      height: 0.28rem;
      border-radius: 999px;
      background: currentColor;
      opacity: 0;
      transform: translateX(-50%) scale(0.45);
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    .markdown-toggle:hover,
    .markdown-toggle[aria-pressed="true"] {
      color: var(--accent);
    }
    .markdown-toggle[aria-pressed="true"] {
      animation: markdown-toggle-pop 0.18s ease;
    }
    .markdown-toggle[aria-pressed="true"]::after {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
    .arena-details-button {
      display: inline-flex;
      align-items: center;
      gap: 0.42rem;
      min-height: 2.35rem;
      padding: 0 0.78rem;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .arena-details-button::before {
      content: "";
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 999px;
      background: #59606a;
    }
    .arena-details-button[data-state="pending"]::before,
    .arena-details-button[data-state="syncing"]::before {
      background: #f2c94c;
    }
    .arena-details-button[data-state="synced"]::before {
      background: var(--accent);
    }
    .arena-details-button[data-state="error"]::before {
      background: var(--danger);
    }
    .arena-details-button[hidden] {
      display: none !important;
    }
    @keyframes markdown-toggle-pop {
      0% { transform: scale(0.94) rotate(-6deg); }
      55% { transform: scale(1.08) rotate(4deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    .markdown-input {
      display: none;
      width: 100%;
      min-height: 64vh;
      border: 0;
      background: transparent;
      color: var(--ink);
      outline: none;
      resize: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      font-size: var(--editor-body-size);
      line-height: 1.65;
      white-space: pre-wrap;
    }
    .paper.markdown-mode .title-input,
    .paper.markdown-mode .subtitle-input,
    .paper.markdown-mode .body-input {
      display: none;
    }
    .paper.markdown-mode .markdown-input {
      display: block;
    }
    .title-input,
    .body-input {
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--ink);
      outline: none;
      overflow: hidden;
      resize: none;
      font-family: var(--editor-font);
    }
    .title-input {
      min-height: 5rem;
      margin-bottom: 1.25rem;
      font-size: var(--editor-title-size);
      font-weight: 800;
      line-height: 1.02;
      letter-spacing: 0;
    }
    .title-input::placeholder,
    .body-input::placeholder {
      color: #444b55;
    }
    .body-input {
      min-height: 58vh;
      font-size: var(--editor-body-size);
      line-height: 1.75;
    }
    .settings {
      border-left: 1px solid var(--line);
      background: var(--panel);
      padding: 1rem;
      overflow: auto;
    }
    .settings-backdrop {
      position: fixed;
      inset: 0;
      z-index: 28;
      border: 0;
      border-radius: 0;
      background: rgba(0, 0, 0, 0.18);
      padding: 0;
      cursor: default;
    }
    .settings-backdrop[hidden] {
      display: none !important;
    }
    .settings h2 {
      margin: 0;
      font-size: 0.88rem;
    }
    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .settings-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.75rem;
      min-width: 2.75rem;
      min-height: 2.75rem;
      border: 0;
      border-radius: 999px;
      padding: 0;
      background: var(--panel-2);
      color: var(--ink);
      font-size: 1.2rem;
      line-height: 1;
    }
    .field {
      display: grid;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .field[hidden] {
      display: none !important;
    }
    .field input,
    .field select {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid var(--line);
      border-radius: 0.38rem;
      background: var(--field);
      color: var(--ink);
      padding: 0.42rem 0.52rem;
      font: inherit;
      font-size: 0.86rem;
    }
    .field input:focus,
    .field select:focus {
      border-color: var(--accent);
      outline: none;
    }
    .field input[readonly] {
      color: var(--muted);
      cursor: default;
    }
    .slug-field {
      grid-template-columns: minmax(0, 1fr);
    }
    .slug-control {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .slug-copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.2rem;
      min-width: 2.2rem;
      min-height: 2.2rem;
      border: 0;
      background: transparent;
      color: var(--muted);
      padding: 0;
    }
    .slug-copy:hover {
      color: var(--accent);
    }
    .slug-copy[hidden] {
      display: none !important;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.65rem;
      color: var(--ink);
      font-size: 0.84rem;
      cursor: pointer;
    }
    .check input {
      accent-color: var(--accent);
    }
    .arena-section {
      display: grid;
      gap: 0.72rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .arena-section[hidden] {
      display: none !important;
    }
    .arena-section-header,
    .arena-details-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }
    .arena-section h3,
    .arena-details h2 {
      margin: 0;
      color: var(--muted);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .arena-channel-field {
      display: grid;
      gap: 0.35rem;
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .arena-channel-field select {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid var(--line);
      border-radius: 0.38rem;
      background: var(--field);
      color: var(--ink);
      padding: 0.42rem 0.52rem;
      font: inherit;
      font-size: 0.86rem;
    }
    .arena-channel-field select:focus {
      border-color: var(--accent);
      outline: none;
    }
    .arena-helper,
    .arena-content-meta,
    .arena-state-message,
    .arena-last-synced,
    .arena-source,
    .arena-preview-meta {
      margin: 0;
      color: var(--muted);
      font-size: 0.74rem;
      line-height: 1.55;
    }
    .arena-progress {
      display: grid;
      grid-template-columns: auto minmax(1rem, 1fr) auto;
      align-items: center;
      gap: 0.5rem;
    }
    .arena-progress-line {
      height: 1px;
      background: var(--line);
    }
    .arena-step {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--muted);
      font-size: 0.73rem;
      white-space: nowrap;
    }
    .arena-step::before {
      content: "";
      width: 0.48rem;
      height: 0.48rem;
      border-radius: 999px;
      background: #59606a;
    }
    .arena-step.is-complete {
      color: var(--accent);
    }
    .arena-step.is-complete::before {
      background: var(--accent);
    }
    .arena-step.is-pending {
      color: #f2c94c;
    }
    .arena-step.is-pending::before {
      background: #f2c94c;
    }
    .arena-step.is-error {
      color: var(--danger);
    }
    .arena-step.is-error::before {
      background: var(--danger);
    }
    .arena-inline-details,
    .arena-retry,
    .arena-details-retry {
      min-height: 2.2rem;
      border: 0;
      background: transparent;
      color: var(--accent);
      padding: 0;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .arena-inline-details {
      display: none;
    }
    .arena-retry[hidden],
    .arena-details-retry[hidden] {
      display: none !important;
    }
    .arena-details-backdrop {
      position: fixed;
      inset: 0;
      z-index: 38;
      border: 0;
      border-radius: 0;
      background: rgba(0, 0, 0, 0.62);
      padding: 0;
      cursor: default;
    }
    .arena-details-backdrop[hidden],
    .arena-details[hidden] {
      display: none !important;
    }
    .arena-details {
      position: fixed;
      top: 4.35rem;
      right: 1.2rem;
      bottom: 0.75rem;
      z-index: 40;
      width: min(27rem, calc(100vw - 2.4rem));
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 0.65rem;
      background: var(--panel);
      color: var(--ink);
      padding: 1rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.34);
    }
    .arena-details-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      min-width: 2.5rem;
      min-height: 2.5rem;
      border: 0;
      border-radius: 999px;
      padding: 0;
      background: var(--panel-2);
      color: var(--ink);
      font-size: 1.15rem;
    }
    .arena-preview {
      display: grid;
      gap: 0.75rem;
      margin-top: 1rem;
      padding: 0.9rem;
      border: 1px solid var(--line);
      border-radius: 0.5rem;
      background: var(--field);
    }
    .arena-preview-type {
      color: var(--muted);
      font-size: 0.75rem;
    }
    .arena-preview h3 {
      color: var(--ink);
      font-size: 0.96rem;
      text-transform: none;
      letter-spacing: 0;
    }
    .arena-preview-excerpt {
      margin: 0;
      color: var(--ink);
      font-family: var(--editor-font);
      font-size: 0.82rem;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .arena-details-meta {
      display: grid;
      gap: 0.55rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .arena-block-link {
      color: var(--accent);
      font-size: 0.78rem;
      text-decoration: none;
    }
    .arena-block-link[hidden] {
      display: none !important;
    }
    .utility {
      display: grid;
      gap: 0.55rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .danger-zone {
      display: grid;
      gap: 0.65rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .danger-zone[hidden] {
      display: none !important;
    }
    .danger-zone h3 {
      margin: 0;
      color: var(--muted);
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .danger-button,
    .image-delete-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.42rem;
      border-color: var(--danger);
      color: var(--danger);
      background: transparent;
    }
    .danger-button.is-pressed {
      animation: editor-danger-press 220ms ease;
    }
    .danger-button.is-busy {
      cursor: progress;
      opacity: 0.88;
      transform: scale(0.98);
    }
    @keyframes editor-danger-press {
      0% { transform: scale(1); }
      48% { transform: scale(0.97); }
      100% { transform: scale(1); }
    }
    @media (hover: none), (pointer: coarse) {
      .danger-button.is-pressed {
        box-shadow: 0 0 0 0.38rem rgba(255, 107, 107, 0.12);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button {
        transition: none;
      }
      .danger-button.is-pressed {
        animation: none;
      }
    }
    .image-delete-button {
      min-height: 2rem;
      justify-self: start;
      padding: 0;
      border: 0;
      font-size: 0.78rem;
    }
    .image-delete-button[hidden] {
      display: none !important;
    }
    .photo-fields {
      display: grid;
      gap: 0.85rem;
      margin: 0.35rem 0 0.85rem;
      padding: 0.85rem;
      border: 1px solid var(--line);
      border-radius: 0.5rem;
      background: var(--field);
    }
    .photo-fields[hidden] {
      display: none !important;
    }
    .photo-preview {
      display: none;
      width: 100%;
      max-height: 12rem;
      object-fit: cover;
      border: 1px solid var(--line);
      background: var(--panel-2);
    }
    .photo-preview[src] {
      display: block;
    }
    .path {
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .error {
      color: var(--danger);
    }
    .back-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      background: transparent;
      color: #333333;
      font-size: 1rem;
      min-width: 2.25rem;
      padding: 0;
    }
    .back-button .button-icon {
      width: 1.3rem;
      height: 1.3rem;
      stroke-width: 2.2;
    }
    .saved-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      max-width: min(32rem, calc(100vw - 8rem));
      min-height: 1.55rem;
      padding: 0 0.6rem;
      border: 1px solid #dedede;
      border-radius: 0.28rem;
      background: #ffffff;
      color: #4d4d4d;
      font-size: 0.78rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .saved-pill::before {
      content: "";
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 999px;
      background: #26c281;
    }
    .saved-pill[data-state="unsaved"]::before {
      background: #f5a623;
    }
    .saved-pill[data-state="saving"]::before {
      background: #8d949e;
    }
    .saved-pill[data-state="loading"]::before {
      background: #8d949e;
    }
    .saved-pill[data-state="error"]::before {
      background: var(--danger);
    }
    .load-retry[hidden] {
      display: none !important;
    }
    .save-label-mobile {
      display: none;
    }
    .formatbar {
      max-width: 100vw;
      height: 4.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 1.5rem;
      border-bottom: 1px solid #eeeeee;
      background: #ffffff;
      overflow-x: auto;
      overflow-y: hidden;
      position: relative;
    }
    .formatbar-inner {
      width: min(var(--writer-width), 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      min-width: 0;
    }
    .toolbar-group {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      flex: 0 0 auto;
    }
    .toolbar-group[hidden],
    .formatbar button[hidden],
    .divider[hidden] {
      display: none !important;
    }
    .formatbar button {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.15rem;
      min-width: 2.15rem;
      border: 0;
      border-radius: 0.35rem;
      background: transparent;
      color: #444444;
      min-height: 2.15rem;
      padding: 0;
      font-size: 1rem;
      font-weight: 700;
    }
    .formatbar button .button-icon {
      width: 1.12rem;
      height: 1.12rem;
      stroke-width: 2.05;
    }
    .formatbar button:hover {
      background: #f5f5f5;
      color: #1d1d1d;
    }
    .formatbar button.is-active {
      background: #eceff3;
      color: #1f7a5a;
    }
    .divider {
      width: 1px;
      height: 2.2rem;
      background: #eeeeee;
      margin: 0 0.15rem;
      flex: 0 0 auto;
    }
    .subtitle-input {
      width: 100%;
      border: 0;
      background: transparent;
      color: #777777;
      outline: none;
      font-family: var(--editor-font);
      font-size: var(--editor-subtitle-size);
      line-height: 1.5;
      margin-bottom: 1.7rem;
    }
    .subtitle-input::placeholder {
      color: #a3a3a3;
    }
    .utility-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      border: 0;
      border-radius: 0.45rem;
      background: #f0f0f0;
      color: #4a4a4a;
      min-height: 2.35rem;
      padding: 0 0.7rem;
      font-weight: 700;
    }
    .utility-button.icon-only {
      width: 2.35rem;
      padding: 0;
    }
    .utility-button .button-icon {
      width: 1rem;
      height: 1rem;
      stroke-width: 2.1;
    }
    button:disabled {
      cursor: default;
      opacity: 0.42;
    }
    button:disabled:hover {
      border-color: var(--line);
      color: inherit;
    }
    .reference-theme {
      --writer-width: 43rem;
      --bg: #f7f8fa;
      --panel: #f7f8fa;
      --panel-2: #eceff3;
      --ink: #16202b;
      --muted: #495562;
      --line: #dde3ea;
      --accent: #1f7a5a;
      --field: #f7f8fa;
    }
    .reference-theme .topbar {
      height: 4.55rem;
      border-bottom: 0;
      background: #f7f8fa;
      padding: 0 1.35rem;
    }
    .reference-theme .brand {
      gap: 0.75rem;
    }
    .reference-theme .brand strong {
      display: block;
    }
    .reference-theme .status {
      display: none;
    }
    .reference-theme .top-actions button {
      min-height: 2.7rem;
      border: 0;
      border-radius: 0.45rem;
      padding: 0 1rem;
      background: #f0f0f0;
      color: #3d3d3d;
      font-weight: 700;
    }
    .reference-theme .top-actions .markdown-toggle {
      border: 0 !important;
      background: transparent !important;
      color: var(--muted);
      padding: 0 !important;
    }
    .reference-theme .top-actions .markdown-toggle[aria-pressed="true"] {
      color: var(--accent);
    }
    .reference-theme .top-actions .primary {
      background: #1f7a5a;
      color: #ffffff;
    }
    .reference-theme .shell {
      min-height: calc(100vh - 9.3rem);
      display: block;
      background: #f7f8fa;
    }
    .reference-theme .writer {
      padding: 2.4rem 1.5rem 7rem;
    }
    .reference-theme .paper {
      width: min(var(--writer-width), 100%);
      margin-left: auto;
      margin-right: auto;
    }
    .reference-theme .title-input {
      min-height: 4.4rem;
      margin-bottom: 0.35rem;
      color: #696969;
      font-family: var(--editor-font);
      font-size: var(--editor-title-size);
      font-weight: 800;
      line-height: 1.15;
    }
    .reference-theme .title-input::placeholder {
      color: #7b7b7b;
    }
    .reference-theme .body-input {
      min-height: 45vh;
      color: #16202b;
      font-family: var(--editor-font);
      font-size: var(--editor-body-size);
      line-height: 1.72;
    }
    .reference-theme .body-input::placeholder {
      color: #b7b7b7;
    }
    .reference-theme .settings {
      position: fixed;
      top: 4rem;
      right: 1.2rem;
      bottom: 2.5rem;
      z-index: 30;
      width: min(27rem, calc(100vw - 2.4rem));
      max-height: none;
      border: 1px solid #dde3ea;
      border-radius: 0.65rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.12);
    }
    .reference-theme .settings[hidden] {
      display: none !important;
    }
    .reference-theme .field input,
    .reference-theme .field select {
      border-color: #dde3ea;
      background: #f7f8fa;
      color: #16202b;
    }
    .reference-theme .path {
      color: #777777;
    }
    .reference-theme[data-theme="dark"] {
      --bg: #000000;
      background: #000000;
      color: #cfcfd2;
      --panel: #0b0c0f;
      --panel-2: #111318;
      --ink: #e8e8ea;
      --muted: #8a8f98;
      --line: #1c2025;
      --accent: #4ecca3;
      --field: #07080a;
    }
    .reference-theme[data-theme="dark"] .topbar,
    .reference-theme[data-theme="dark"] .formatbar,
    .reference-theme[data-theme="dark"] .shell {
      background: #000000;
      border-color: #1c2025;
    }
    .reference-theme[data-theme="dark"] .formatbar {
      border-bottom-color: #1c2025;
    }
    .reference-theme[data-theme="dark"] .formatbar button,
    .reference-theme[data-theme="dark"] .back-button {
      color: #cfcfd2;
      background: transparent;
    }
    .reference-theme[data-theme="dark"] .formatbar button:hover {
      color: #e8e8ea;
      background: #0b0c0f;
    }
    .reference-theme[data-theme="dark"] .formatbar button.is-active {
      color: #4ecca3;
      background: #0b0c0f;
    }
    .reference-theme[data-theme="dark"] .mobile-settings-button {
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .divider {
      background: #1c2025;
    }
    .reference-theme[data-theme="dark"] .saved-pill,
    .reference-theme[data-theme="dark"] .utility-button,
    .reference-theme[data-theme="dark"] .top-actions button {
      border-color: #1c2025;
      background: #111318;
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .top-actions .primary {
      background: #4ecca3;
      color: #001b14;
    }
    .reference-theme[data-theme="dark"] .top-actions .markdown-toggle {
      border: 0 !important;
      background: transparent !important;
      color: var(--muted);
    }
    .reference-theme[data-theme="dark"] .top-actions .markdown-toggle[aria-pressed="true"] {
      color: var(--accent);
    }
    .reference-theme[data-theme="dark"] .title-input {
      color: #f2f2f2;
    }
    .reference-theme[data-theme="dark"] .title-input::placeholder {
      color: #777b82;
    }
    .reference-theme[data-theme="dark"] .subtitle-input,
    .reference-theme[data-theme="dark"] .body-input {
      color: #d8d8dc;
    }
    .reference-theme[data-theme="dark"] .subtitle-input::placeholder,
    .reference-theme[data-theme="dark"] .body-input::placeholder {
      color: #6e747d;
    }
    .reference-theme[data-theme="dark"] .settings {
      border-color: #1c2025;
      background: #0b0d10;
      color: #cfcfd2;
    }
    .publication-section,
    .notebook-channel-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .publication-section h3,
    .notebook-channel-section h3 {
      margin: 0 0 0.8rem;
      color: var(--muted);
      font-family: var(--editor-font);
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .publication-steps {
      display: grid;
      gap: 0.7rem;
      margin: 0;
      padding: 0;
      list-style: none;
      font-family: var(--editor-font);
      font-size: 0.78rem;
    }
    .publication-step {
      display: grid;
      grid-template-columns: 0.7rem minmax(0, 1fr);
      gap: 0.55rem;
      align-items: center;
      color: var(--muted);
    }
    .publication-step::before {
      content: "";
      width: 0.45rem;
      height: 0.45rem;
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
    .publication-message,
    .notebook-channel-status {
      margin: 0.75rem 0 0;
      color: var(--muted);
      font-family: var(--editor-font);
      font-size: 0.72rem;
      line-height: 1.55;
    }
    .publication-link,
    .notebook-channel-link {
      color: var(--accent);
      overflow-wrap: anywhere;
    }
    .notebook-channel-action {
      width: 100%;
      min-height: 2.65rem;
      border-color: var(--line);
      background: transparent;
      color: var(--ink);
      font-family: var(--editor-font);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .notebook-channel-section[hidden],
    .publication-link[hidden],
    .notebook-channel-link[hidden] {
      display: none !important;
    }
    .reference-theme[data-theme="dark"] .field input,
    .reference-theme[data-theme="dark"] .field select {
      border-color: #1c2025;
      background: #07080a;
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .path {
      color: #7b7f88;
    }
    @media (max-width: 900px) {
      .reference-theme {
        --editor-font: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        grid-template-columns: 1fr;
      }
      body[data-editor-size="small"] {
        --editor-title-size: 1.75rem;
        --editor-subtitle-size: 0.95rem;
        --editor-body-size: 0.95rem;
      }
      body[data-editor-size="medium"] {
        --editor-title-size: 2rem;
        --editor-subtitle-size: 1rem;
        --editor-body-size: 1.05rem;
      }
      body[data-editor-size="large"] {
        --editor-title-size: 2.25rem;
        --editor-subtitle-size: 1.1rem;
        --editor-body-size: 1.15rem;
      }
      .settings {
        border-left: 0;
        border-top: 1px solid var(--line);
      }
      .writer {
        padding: 2rem 1rem calc(6rem + env(safe-area-inset-bottom));
      }
      .reference-theme .writer {
        padding: 4.85rem 1.5rem calc(7rem + env(safe-area-inset-bottom));
      }
      .formatbar {
        position: fixed;
        inset: auto 0 0 0;
        z-index: 18;
        height: calc(4.85rem + env(safe-area-inset-bottom));
        justify-content: center;
        padding: 0 1rem env(safe-area-inset-bottom);
        border-top: 1px solid var(--line);
        border-bottom: 0;
      }
      .formatbar::after {
        content: none;
      }
      .formatbar-inner {
        width: 100%;
        max-width: 26rem;
        justify-content: space-between;
        gap: 0.4rem;
      }
      .toolbar-group {
        display: contents;
      }
      .divider,
      .formatbar button[data-format="redo"],
      .formatbar button[data-format="bold"],
      .formatbar button[data-format="italic"],
      .formatbar button[data-format="strike"],
      .formatbar button[data-format="code"],
      .formatbar button[data-format="heading"],
      .formatbar button[data-format="ol"] {
        display: none !important;
      }
      #toolbar-image { order: 1; }
      .formatbar button[data-format="link"] { order: 2; }
      .formatbar button[data-format="ul"] { order: 3; }
      .formatbar button[data-format="quote"] { order: 4; }
      .formatbar button[data-format="undo"] { order: 5; }
      .formatbar button {
        width: 2.75rem;
        min-width: 2.75rem;
        min-height: 2.75rem;
      }
      .topbar,
      .reference-theme .topbar {
        position: fixed;
        inset: 0 0 auto;
        min-height: 4.25rem;
        height: 4.25rem;
        display: grid;
        grid-template-columns: 2.5rem minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.35rem;
        padding: 0.45rem 0.65rem;
        z-index: 32;
      }
      .brand {
        display: contents;
      }
      .back-button {
        grid-column: 1;
        grid-row: 1;
        width: 2.5rem;
        min-width: 2.5rem;
        min-height: 2.5rem;
        color: var(--ink);
      }
      .editor-identity {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
        overflow: hidden;
      }
      .editor-brand {
        flex: 0 1 auto;
        min-width: 0;
        margin: 0;
      }
      .editor-brand strong {
        font-size: 0.9rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .editor-brand small {
        display: none;
      }
      .saved-pill,
      .reference-theme .saved-pill {
        flex: 0 0 auto;
        max-width: 3.2rem;
        min-height: 1.15rem;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: var(--muted);
        font-size: 0.62rem;
        font-weight: 600;
      }
      .saved-pill::before {
        width: 0.35rem;
        height: 0.35rem;
      }
      .top-actions {
        grid-column: 3;
        grid-row: 1;
        width: auto;
        gap: 0.25rem;
      }
      .top-actions button,
      .reference-theme .top-actions button {
        flex: 0 0 auto;
        min-height: 2.5rem;
        border: 1px solid rgba(255, 255, 255, 0.68);
        border-radius: 0.55rem;
        background: transparent;
        padding: 0 0.65rem;
        color: var(--ink);
      }
      .top-actions .markdown-toggle,
      .reference-theme .top-actions .markdown-toggle {
        width: 2rem;
        min-width: 2rem !important;
        border: 0 !important;
        background: transparent !important;
        color: var(--muted);
        padding: 0 !important;
      }
      .top-actions .markdown-toggle[aria-pressed="true"],
      .reference-theme .top-actions .markdown-toggle[aria-pressed="true"] {
        color: var(--accent);
      }
      .reference-theme[data-theme="dark"] .top-actions .primary {
        border-color: rgba(255, 255, 255, 0.68);
        background: transparent;
        color: var(--ink);
      }
      .mobile-settings-button {
        display: inline-flex;
        min-width: 2.1rem !important;
        border-color: transparent !important;
        background: transparent !important;
        padding: 0 !important;
        font-size: 1.25rem;
        letter-spacing: 0.06em;
      }
      #toolbar-image .button-icon {
        display: none;
      }
      #toolbar-image::before {
        content: "+";
        font-size: 1.75rem;
        font-weight: 600;
        line-height: 1;
      }
      .top-actions #open-site {
        display: none !important;
      }
      .arena-details-button {
        display: none !important;
      }
      body.no-preview .topbar {
        grid-template-columns: 2.5rem minmax(0, 1fr) auto;
      }
      body.no-preview .brand {
        display: contents;
      }
      body.no-preview .top-actions {
        width: auto;
      }
      body.no-preview .top-actions button {
        min-width: 0;
      }
      .top-actions button[hidden] {
        display: none;
      }
      .reference-theme .settings {
        inset: auto 0 0 0;
        width: 100%;
        max-height: min(86vh, 42rem);
        border-right: 0;
        border-bottom: 0;
        border-left: 0;
        border-radius: 1.1rem 1.1rem 0 0;
        padding: 0.85rem 1.1rem calc(1.35rem + env(safe-area-inset-bottom));
        box-shadow: 0 -1rem 3rem rgba(0, 0, 0, 0.24);
      }
      .arena-inline-details {
        display: inline-flex;
      }
      .arena-details {
        inset: auto 0 0 0;
        width: 100%;
        max-height: min(86vh, 42rem);
        border-right: 0;
        border-bottom: 0;
        border-left: 0;
        border-radius: 1.1rem 1.1rem 0 0;
        padding: 1rem 1.1rem calc(1.35rem + env(safe-area-inset-bottom));
      }
      .reference-theme[data-theme="dark"] .settings {
        background: rgba(7, 8, 10, 0.98);
      }
    .settings-header {
      margin-bottom: 0.8rem;
    }
    .settings-header h2 {
      font-size: 1.28rem;
    }
      .settings-header-actions {
        display: flex;
        align-items: center;
        gap: 0.55rem;
      }
      .field {
        grid-template-columns: minmax(0, 1fr) minmax(5rem, auto) 0.8rem;
        column-gap: 0.75rem;
        align-items: center;
        margin-bottom: 0;
        min-height: 3.75rem;
        padding: 0.68rem 0;
        border-bottom: 1px solid var(--line);
      }
      .field::after {
        content: ">";
        grid-column: 3;
        grid-row: 1;
        justify-self: end;
        color: var(--muted);
      }
      .field span {
        grid-column: 1;
        grid-row: 1;
        align-self: center;
        padding-right: 0.75rem;
      }
      .field input,
      .field select {
        grid-column: 2;
        grid-row: 1;
        border: 0 !important;
        background: transparent !important;
        color: var(--ink) !important;
        padding-left: 0;
        padding-right: 0;
        text-align: right;
        font-weight: 700;
      }
      .slug-field {
        grid-template-columns: minmax(0, 1fr) minmax(5rem, auto) auto;
      }
      .slug-field::after {
        content: none;
      }
      .slug-control {
        grid-column: 2 / 4;
        grid-row: 1;
        justify-content: flex-end;
        min-width: 0;
      }
      .slug-control input {
        min-width: 0;
      }
      .slug-copy {
        grid-column: auto;
        grid-row: auto;
        width: 2rem;
        min-width: 2rem;
        min-height: 2rem;
      }
      .check {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 2.75rem;
        column-gap: 0.75rem;
        align-items: center;
        min-height: 3.1rem;
        margin: 0;
        border-bottom: 1px solid var(--line);
      }
      .check-label {
        grid-column: 1;
        grid-row: 1;
      }
      .check input {
        grid-column: 2;
        grid-row: 1;
        justify-self: end;
        width: 2.75rem;
        height: 1.55rem;
        appearance: none;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #15171c;
        position: relative;
      }
      .check input::before {
        content: "";
        position: absolute;
        width: 1.08rem;
        height: 1.08rem;
        left: 0.17rem;
        top: 0.17rem;
        border-radius: 999px;
        background: var(--muted);
        transition: transform 0.16s ease, background 0.16s ease;
      }
      .check input:checked {
        border-color: var(--accent);
        background: rgba(78, 204, 163, 0.24);
      }
      .check input:checked::before {
        transform: translateX(1.18rem);
        background: var(--accent);
      }
      .photo-fields {
        padding: 0;
        border: 0;
        background: transparent;
      }
      .utility {
        border-top: 0;
      }
      .save-label-desktop {
        display: none;
      }
      .save-label-mobile {
        display: inline;
      }
    }
    @media (max-width: 380px) {
      .editor-identity {
        gap: 0.3rem;
      }
      .saved-pill,
      .reference-theme .saved-pill {
        width: 0.4rem;
        max-width: 0.4rem;
        font-size: 0;
        overflow: visible;
      }
      .top-actions button,
      .reference-theme .top-actions button {
        padding-right: 0.5rem;
        padding-left: 0.5rem;
      }
    }
  </style>
</head>
<body class="reference-theme" data-theme="dark">
  <header class="topbar">
    <div class="brand">
      <button type="button" class="back-button" id="back" aria-label="Back">${ICONS.back}</button>
      <span class="editor-identity">
        <span class="editor-brand"><strong>betancourt</strong><small>aquí escribo cosas</small></span>
        <span class="saved-pill" id="saved-pill" data-state="loading" role="status" aria-live="polite">Cargando</span>
      </span>
      <span class="status" id="status">Loading</span>
    </div>
    <div class="top-actions">
      <button type="button" class="load-retry" id="retry-load" aria-label="Reintentar carga" title="Reintentar carga" hidden>${ICONS.redo}</button>
      <button type="button" class="markdown-toggle" id="view-markdown" aria-pressed="false" aria-label="Activar Markdown" title="Markdown">${ICONS.code}</button>
      <button type="button" class="arena-details-button" id="arena-details-button" data-state="disabled" aria-controls="arena-details">Are.na</button>
      <button type="button" class="mobile-settings-button" id="top-settings-button" aria-controls="settings" aria-expanded="false" aria-label="Configuracion">...</button>
      <button type="button" id="open-site">Abrir sitio</button>
      <button type="button" class="primary" id="save" disabled><span class="save-label-desktop">Guardar y verificar</span><span class="save-label-mobile">Guardar</span></button>
    </div>
  </header>
  <nav class="formatbar" aria-label="Formatting">
    <div class="formatbar-inner">
      <span class="toolbar-group" aria-label="History">
        <button type="button" data-format="undo" title="Undo" aria-label="Undo">${ICONS.undo}</button>
        <button type="button" data-format="redo" title="Redo" aria-label="Redo">${ICONS.redo}</button>
      </span>
      <span class="divider"></span>
      <span class="toolbar-group" aria-label="Inline formatting">
        <button type="button" data-format="bold" title="Bold" aria-label="Bold">${ICONS.bold}</button>
        <button type="button" data-format="italic" title="Italic" aria-label="Italic">${ICONS.italic}</button>
        <button type="button" data-format="strike" title="Strikethrough" aria-label="Strikethrough">${ICONS.strike}</button>
        <button type="button" data-format="code" title="Code" aria-label="Code">${ICONS.code}</button>
        <button type="button" data-format="link" title="Link" aria-label="Link">${ICONS.link}</button>
      </span>
      <span class="divider"></span>
      <span class="toolbar-group" aria-label="Blocks">
        <button type="button" data-format="heading" title="Heading" aria-label="Heading">${ICONS.heading}</button>
        <button type="button" data-format="quote" title="Quote" aria-label="Quote">${ICONS.quote}</button>
        <button type="button" data-format="ul" title="Bulleted list" aria-label="Bulleted list">${ICONS.list}</button>
        <button type="button" data-format="ol" title="Numbered list" aria-label="Numbered list">${ICONS.orderedList}</button>
      </span>
      <span class="divider" id="insert-divider-before"></span>
      <span class="toolbar-group" id="insert-toolbar-group" aria-label="Insert">
        <button type="button" id="toolbar-image" title="Image" aria-label="Image">${ICONS.image}</button>
      </span>
      <span class="divider" id="insert-divider-after"></span>
    </div>
  </nav>
  <button type="button" class="settings-backdrop" id="settings-backdrop" aria-label="Cerrar configuracion" hidden></button>
  <button type="button" class="arena-details-backdrop" id="arena-details-backdrop" aria-label="Cerrar detalle de Are.na" hidden></button>
  <main class="shell">
    <section class="writer">
      <article class="paper">
        <textarea class="title-input" id="title" rows="2" placeholder="Titulo (Obligatorio)"></textarea>
        <input class="subtitle-input" id="summary" type="text" placeholder="Agregar un subtitulo..." />
        <textarea class="body-input" id="body" placeholder="Comienza a escribir un articulo..."></textarea>
        <textarea class="markdown-input" id="markdown-canvas" aria-label="Markdown del documento" spellcheck="false" hidden></textarea>
      </article>
    </section>
    <aside class="settings" id="settings" hidden>
      <div class="settings-header">
        <h2 id="settings-title">Propiedades</h2>
        <div class="settings-header-actions">
          <button type="button" class="settings-close" id="settings-close" aria-label="Cerrar configuracion">&times;</button>
        </div>
      </div>
      <label class="field" id="notebook-field">
        <span>Destino</span>
        <select id="notebook"></select>
      </label>
      <label class="field slug-field" id="slug-field" hidden>
        <span>Ruta</span>
        <span class="slug-control">
          <input id="slug" type="text" readonly />
          <button type="button" class="slug-copy" id="copy-slug" aria-label="Copiar ruta" title="Copiar ruta" hidden>${ICONS.copy}</button>
        </span>
      </label>
      <label class="field">
        <span>Fecha</span>
        <input id="date" type="date" />
      </label>
      <label class="field" id="tags-field">
        <span>Etiquetas</span>
        <input id="tags" type="text" placeholder="ensayo, politica" />
      </label>
      <label class="check">
        <span class="check-label">Publicado</span>
        <input id="draft" type="checkbox" />
      </label>
      <div class="photo-fields" id="photo-fields" hidden>
        <label class="field">
          <span>Imagen</span>
          <input id="image" type="text" placeholder="/uploads/2026/07/photo.jpg" />
        </label>
        <button type="button" class="image-delete-button" id="delete-image" hidden>${ICONS.trash}<span>Eliminar imagen</span></button>
        <img class="photo-preview" id="photo-preview" alt="" />
      </div>
      <label class="field" id="image-alt-field">
        <span>Texto alt</span>
        <input id="image-alt" type="text" placeholder="Describe la imagen" />
      </label>
      <label class="field" id="caption-field">
        <span>Pie</span>
        <input id="caption" type="text" placeholder="Pie opcional" />
      </label>
      <label class="field">
        <span>Texto</span>
        <select id="editor-font-size">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label class="check">
        <span class="check-label">Visible</span>
        <input id="hidden" type="checkbox" />
      </label>
      <section class="publication-section" id="publication-section">
        <h3>Estado de publicación</h3>
        <ol class="publication-steps">
          <li class="publication-step" id="publication-saved-step">Guardado en GitHub</li>
          <li class="publication-step" id="publication-deploy-step">Desplegando</li>
          <li class="publication-step" id="publication-public-step">Disponible en el blog</li>
        </ol>
        <p class="publication-message" id="publication-message">Guarda para verificar el estado público.</p>
        <a class="publication-link" id="publication-link" href="#" target="_blank" rel="noopener" hidden>Abrir publicación ↗</a>
      </section>
      <section class="notebook-channel-section" id="notebook-channel-section" hidden>
        <h3>Are.na</h3>
        <button type="button" class="notebook-channel-action" id="create-notebook-channel">Crear channel desde notebook</button>
        <p class="notebook-channel-status" id="notebook-channel-status">Sincroniza las publicaciones públicas y visibles sin duplicarlas.</p>
        <a class="notebook-channel-link" id="notebook-channel-link" href="#" target="_blank" rel="noopener" hidden>Abrir channel ↗</a>
      </section>
      <section class="arena-section" id="arena-section">
        <div class="arena-section-header">
          <h3>Are.na</h3>
          <button type="button" class="arena-inline-details" id="arena-inline-details">Ver detalle</button>
        </div>
        <label class="check arena-toggle">
          <span class="check-label">Mantener copia en Are.na</span>
          <input id="arena-enabled" type="checkbox" disabled />
        </label>
        <label class="arena-channel-field">
          <span>Canal</span>
          <select id="arena-channel" disabled>
            <option value="">Cargando canales...</option>
          </select>
        </label>
        <p class="arena-helper" id="arena-helper">Al guardar, se copiarán el título y el cuerpo Markdown completo.</p>
        <p class="arena-content-meta" id="arena-content-meta">Bloque de texto</p>
        <div class="arena-progress" aria-label="Estado de la copia en Are.na">
          <span class="arena-step is-complete" id="arena-blog-step">Blog actualizado</span>
          <span class="arena-progress-line"></span>
          <span class="arena-step" id="arena-copy-step">Copia desactivada</span>
        </div>
        <p class="arena-state-message" id="arena-state-message" aria-live="polite">Activa la copia para mantener este texto en Are.na.</p>
        <p class="arena-last-synced" id="arena-last-synced"></p>
        <button type="button" class="arena-retry" id="arena-retry" hidden>Reintentar</button>
      </section>
      <div class="danger-zone" id="danger-zone" hidden>
        <h3>Peligro</h3>
        <label class="check">
          <span class="check-label">Eliminar imagenes adjuntas</span>
          <input id="delete-attached-images" type="checkbox" />
        </label>
        <button type="button" class="danger-button" id="delete-page">${ICONS.trash}<span>Delete</span></button>
      </div>
      <div class="utility">
        <input id="image-file" type="file" accept="image/*" hidden />
        <div class="path" id="path"></div>
      </div>
    </aside>
    <aside class="arena-details" id="arena-details" role="dialog" aria-modal="true" aria-labelledby="arena-details-title" hidden>
      <div class="arena-details-header">
        <h2 id="arena-details-title">Copia en Are.na</h2>
        <button type="button" class="arena-details-close" id="arena-details-close" aria-label="Cerrar detalle de Are.na">&times;</button>
      </div>
      <div class="arena-preview">
        <span class="arena-preview-type" id="arena-preview-type">Bloque de texto · Markdown completo</span>
        <h3 id="arena-preview-title">Sin titulo</h3>
        <p class="arena-preview-excerpt" id="arena-preview-excerpt"></p>
        <p class="arena-preview-meta" id="arena-preview-meta"></p>
      </div>
      <div class="arena-details-meta">
        <p class="arena-state-message" id="arena-details-state" aria-live="polite"></p>
        <p class="arena-source">Canal: <strong id="arena-details-channel">Sin elegir</strong></p>
        <p class="arena-source">Fuente original: fbetancourt.work</p>
        <a class="arena-block-link" id="arena-block-link" href="#" target="_blank" rel="noopener" hidden>Abrir bloque de texto en Are.na ↗</a>
        <button type="button" class="arena-details-retry" id="arena-details-retry" hidden>Reintentar</button>
      </div>
    </aside>
  </main>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode") || "new";
      var kind = params.get("kind") || "post";
      var postFormat = params.get("format") || "";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var grayscale = params.get("grayscale") === "true";
      var siteOrigin = params.get("site") || ${JSON.stringify(SITE_ORIGIN)};
      var apiBase = ${JSON.stringify(apiBase || "/api")};
      var sourcePath = params.get("path") || "";
      var preferredNotebook = params.get("notebook") || "";
      var frontMatter = {};
      var savedUrl = "";
      var slugTouched = false;
      var editorSizeStorageKey = "authorEditorFontSize";
      var viewModeStorageKey = "authorEditorViewMode";
      var notebookCacheStorageKey = "authorNotebooksCacheV1";
      var activeViewMode = "render";
      var savedSnapshot = null;
      var saveInProgress = false;
      var saveFailed = false;
      var arenaChannels = [];
      var arenaProfile = null;
      var arenaState = {
        state: "disabled",
        blockId: "",
        connectionId: "",
        blockUrl: "",
        blocks: [],
        lastSyncedAt: "",
        error: "",
      };
      var bodyHistory = [];
      var bodyHistoryIndex = -1;
      var restoringBodyHistory = false;
      var publicationCheckToken = 0;
      var els = {
        status: document.getElementById("status"),
        savedPill: document.getElementById("saved-pill"),
        formatbar: document.querySelector(".formatbar"),
        writer: document.querySelector(".writer"),
        paper: document.querySelector(".paper"),
        back: document.getElementById("back"),
        title: document.getElementById("title"),
        body: document.getElementById("body"),
        markdownCanvas: document.getElementById("markdown-canvas"),
        settings: document.getElementById("settings"),
        settingsBackdrop: document.getElementById("settings-backdrop"),
        settingsTitle: document.getElementById("settings-title"),
        topSettingsButton: document.getElementById("top-settings-button"),
        settingsClose: document.getElementById("settings-close"),
        insertDividerBefore: document.getElementById("insert-divider-before"),
        insertToolbarGroup: document.getElementById("insert-toolbar-group"),
        insertDividerAfter: document.getElementById("insert-divider-after"),
        toolbarImage: document.getElementById("toolbar-image"),
        notebookField: document.getElementById("notebook-field"),
        notebook: document.getElementById("notebook"),
        slugField: document.getElementById("slug-field"),
        slug: document.getElementById("slug"),
        copySlug: document.getElementById("copy-slug"),
        date: document.getElementById("date"),
        tagsField: document.getElementById("tags-field"),
        tags: document.getElementById("tags"),
        photoFields: document.getElementById("photo-fields"),
        image: document.getElementById("image"),
        deleteImage: document.getElementById("delete-image"),
        imageAltField: document.getElementById("image-alt-field"),
        imageAlt: document.getElementById("image-alt"),
        captionField: document.getElementById("caption-field"),
        caption: document.getElementById("caption"),
        photoPreview: document.getElementById("photo-preview"),
        editorFontSize: document.getElementById("editor-font-size"),
        viewMarkdown: document.getElementById("view-markdown"),
        arenaDetailsButton: document.getElementById("arena-details-button"),
        summary: document.getElementById("summary"),
        draft: document.getElementById("draft"),
        hidden: document.getElementById("hidden"),
        publicationSavedStep: document.getElementById("publication-saved-step"),
        publicationDeployStep: document.getElementById("publication-deploy-step"),
        publicationPublicStep: document.getElementById("publication-public-step"),
        publicationMessage: document.getElementById("publication-message"),
        publicationLink: document.getElementById("publication-link"),
        notebookChannelSection: document.getElementById("notebook-channel-section"),
        createNotebookChannel: document.getElementById("create-notebook-channel"),
        notebookChannelStatus: document.getElementById("notebook-channel-status"),
        notebookChannelLink: document.getElementById("notebook-channel-link"),
        arenaSection: document.getElementById("arena-section"),
        arenaEnabled: document.getElementById("arena-enabled"),
        arenaChannel: document.getElementById("arena-channel"),
        arenaInlineDetails: document.getElementById("arena-inline-details"),
        arenaContentMeta: document.getElementById("arena-content-meta"),
        arenaHelper: document.getElementById("arena-helper"),
        arenaBlogStep: document.getElementById("arena-blog-step"),
        arenaCopyStep: document.getElementById("arena-copy-step"),
        arenaStateMessage: document.getElementById("arena-state-message"),
        arenaLastSynced: document.getElementById("arena-last-synced"),
        arenaRetry: document.getElementById("arena-retry"),
        arenaDetails: document.getElementById("arena-details"),
        arenaDetailsBackdrop: document.getElementById("arena-details-backdrop"),
        arenaDetailsClose: document.getElementById("arena-details-close"),
        arenaPreviewTitle: document.getElementById("arena-preview-title"),
        arenaPreviewType: document.getElementById("arena-preview-type"),
        arenaPreviewExcerpt: document.getElementById("arena-preview-excerpt"),
        arenaPreviewMeta: document.getElementById("arena-preview-meta"),
        arenaDetailsState: document.getElementById("arena-details-state"),
        arenaDetailsChannel: document.getElementById("arena-details-channel"),
        arenaBlockLink: document.getElementById("arena-block-link"),
        arenaDetailsRetry: document.getElementById("arena-details-retry"),
        dangerZone: document.getElementById("danger-zone"),
        deleteAttachedImages: document.getElementById("delete-attached-images"),
        deletePage: document.getElementById("delete-page"),
        undo: document.querySelector('[data-format="undo"]'),
        redo: document.querySelector('[data-format="redo"]'),
        retryLoad: document.getElementById("retry-load"),
        save: document.getElementById("save"),
        openSite: document.getElementById("open-site"),
        imageFile: document.getElementById("image-file"),
        path: document.getElementById("path"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        document.body.classList.toggle("is-grayscale", grayscale);
        applyEditorSize(readEditorSize());
        applyViewMode(readViewMode());
        bind();
        syncSettingsState();
        syncWritingState();
        syncPreviewButton();
        syncEditorKind();
        loadEditor();
      }

      function loadEditor() {
        savedSnapshot = null;
        saveInProgress = false;
        saveFailed = false;
        els.save.disabled = true;
        els.retryLoad.hidden = true;
        setSavePill("loading", "Cargando");
        setStatus("Loading");
        var notebooksPromise = loadNotebooks();
        var contentPromise = mode === "edit"
          ? loadExisting()
          : notebooksPromise.then(function () { setupNewPost(); });

        Promise.all([notebooksPromise, contentPromise]).then(function () {
          els.save.disabled = false;
          if (kind === "notebook") return null;
          return loadArenaChannels().then(function () {
            if (mode === "edit") return loadArenaStatus();
            syncArenaUi();
            return null;
          }).catch(function (error) {
            els.arenaChannel.disabled = true;
            els.arenaEnabled.disabled = true;
            setArenaState({ state: "unavailable", error: error.message });
          });
        }).catch(function (error) {
          els.save.disabled = true;
          els.retryLoad.hidden = false;
          setStatus(error.message, true);
        });
      }

      function bind() {
        els.back.addEventListener("click", function () {
          window.close();
          window.history.back();
        });
        els.title.addEventListener("input", function () {
          syncGeneratedSlug();
          resizeTextarea(els.title);
          markContentEdited();
        });
        els.slug.addEventListener("input", function () {
          slugTouched = true;
          markContentEdited();
        });
        els.copySlug.addEventListener("click", function (event) {
          event.preventDefault();
          copyRoute();
        });
        els.notebook.addEventListener("change", function () {
          syncGeneratedSlug();
          syncPhotoEditor();
          markContentEdited();
        });
        els.retryLoad.addEventListener("click", loadEditor);
        els.save.addEventListener("click", save);
        els.createNotebookChannel.addEventListener("click", createNotebookChannel);
        els.editorFontSize.addEventListener("change", function () {
          applyEditorSize(els.editorFontSize.value);
        });
        els.viewMarkdown.addEventListener("click", function () {
          applyViewMode(activeViewMode === "markdown" ? "render" : "markdown", true);
        });
        els.arenaDetailsButton.addEventListener("click", openArenaDetails);
        els.arenaInlineDetails.addEventListener("click", openArenaDetails);
        els.arenaDetailsClose.addEventListener("click", closeArenaDetails);
        els.arenaDetailsBackdrop.addEventListener("click", closeArenaDetails);
        els.arenaRetry.addEventListener("click", retryArenaSync);
        els.arenaDetailsRetry.addEventListener("click", retryArenaSync);
        els.arenaEnabled.addEventListener("change", function () {
          markContentEdited();
          syncArenaConfiguration();
        });
        els.arenaChannel.addEventListener("change", function () {
          markContentEdited();
          syncArenaConfiguration();
        });
        els.body.addEventListener("input", function () {
          if (!restoringBodyHistory) {
            recordBodyHistory();
          }
          resizeTextarea(els.body);
        });
        els.markdownCanvas.addEventListener("input", function () {
          syncFieldsFromMarkdown();
          resizeTextarea(els.markdownCanvas);
          markContentEdited();
        });
        [els.title, els.summary, els.body, els.markdownCanvas].forEach(function (input) {
          input.addEventListener("focus", syncWritingState);
          input.addEventListener("blur", function () {
            window.setTimeout(syncWritingState, 0);
          });
        });
        [els.summary, els.date, els.tags, els.image, els.imageAlt, els.caption].forEach(function (input) {
          input.addEventListener("input", markContentEdited);
        });
        els.image.addEventListener("input", function () {
          updatePhotoPreview();
          syncDeleteControls();
        });
        els.deleteImage.addEventListener("click", deleteCurrentImage);
        els.deletePage.addEventListener("click", deleteCurrentPage);
        [els.draft, els.hidden].forEach(function (input) {
          input.addEventListener("change", function () {
            markContentEdited();
          });
        });
        window.addEventListener("resize", resizeEditorFields);
        window.addEventListener("keydown", function (event) {
          if (event.key === "Escape") {
            if (!els.arenaDetails.hidden) {
              closeArenaDetails();
              return;
            }
            if (!els.settings.hidden) {
              closeSettings();
            }
          }
        });
        els.openSite.addEventListener("click", function () {
          var url = previewUrl();
          if (!url) {
            return;
          }
          window.open(url, "_blank", "noopener");
        });
        els.topSettingsButton.addEventListener("click", function () {
          toggleSettings();
        });
        els.settingsClose.addEventListener("click", closeSettings);
        els.settingsBackdrop.addEventListener("click", closeSettings);
        els.toolbarImage.addEventListener("click", function () {
          els.imageFile.click();
        });
        els.imageFile.addEventListener("change", uploadImage);
        Array.from(document.querySelectorAll("[data-format]")).forEach(function (button) {
          button.addEventListener("click", function () {
            applyFormat(button.dataset.format);
          });
        });
      }

      function request(path, options) {
        var requestPath = path.indexOf("/api/") === 0
          ? apiBase + path.slice(4)
          : path;
        return fetch(requestPath, options || {}).then(function (response) {
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
        var cached = null;
        try {
          cached = JSON.parse(sessionStorage.getItem(notebookCacheStorageKey) || "null");
        } catch (error) {
          cached = null;
        }

        if (cached && cached.expiresAt > Date.now() && Array.isArray(cached.notebooks)) {
          renderNotebookOptions(cached.notebooks);
          request("/api/notebooks").then(cacheAndRenderNotebooks).catch(function () {});
          return Promise.resolve(cached.notebooks);
        }

        return request("/api/notebooks").then(cacheAndRenderNotebooks);
      }

      function cacheAndRenderNotebooks(payload) {
        var notebooks = payload.notebooks || [];
        renderNotebookOptions(notebooks);
        try {
          sessionStorage.setItem(notebookCacheStorageKey, JSON.stringify({
            expiresAt: Date.now() + 20000,
            notebooks: notebooks,
          }));
        } catch (error) {
          // Rendering remains available when session storage is blocked.
        }
        return notebooks;
      }

      function renderNotebookOptions(notebooks) {
        els.notebook.innerHTML = "";
        notebooks.forEach(function (notebook) {
          var option = document.createElement("option");
          option.value = notebook.path;
          option.textContent = notebook.title + " (" + notebook.lang + ")";
          if (notebook.path === preferredNotebook) option.selected = true;
          els.notebook.appendChild(option);
        });
      }

      function loadArenaChannels() {
        return request("/api/arena-channels").then(function (payload) {
          arenaProfile = payload.profile || null;
          arenaChannels = payload.channels || [];
          var preferredId = String(frontMatter.arena_channel_id || els.arenaChannel.value || "");
          els.arenaChannel.innerHTML = "";

          var placeholderOption = document.createElement("option");
          placeholderOption.value = "";
          placeholderOption.textContent = "Elige un canal";
          els.arenaChannel.appendChild(placeholderOption);

          arenaChannels.forEach(function (channel) {
            var option = document.createElement("option");
            option.value = String(channel.id);
            option.textContent = channel.title;
            if (option.value === preferredId) {
              option.selected = true;
            }
            els.arenaChannel.appendChild(option);
          });

          if (preferredId && !arenaChannels.some(function (channel) { return String(channel.id) === preferredId; })) {
            var configuredOption = document.createElement("option");
            configuredOption.value = preferredId;
            configuredOption.textContent = "Canal configurado (" + preferredId + ")";
            configuredOption.selected = true;
            els.arenaChannel.appendChild(configuredOption);
          }

          if (!arenaChannels.length) {
            els.arenaChannel.innerHTML = "";
            var emptyOption = document.createElement("option");
            emptyOption.value = "";
            emptyOption.textContent = "No hay canales disponibles";
            els.arenaChannel.appendChild(emptyOption);
            els.arenaChannel.disabled = true;
            els.arenaEnabled.disabled = true;
            setArenaState({
              state: "unavailable",
              error: "Crea un canal en Are.na antes de activar la copia.",
            });
            return payload;
          }

          els.arenaChannel.disabled = false;
          els.arenaEnabled.disabled = false;
          els.arenaChannel.value = preferredId;
          syncArenaUi();
          return payload;
        });
      }

      function loadArenaStatus() {
        if (kind === "notebook" || !sourcePath) {
          setArenaState({ state: "disabled" });
          return Promise.resolve();
        }
        setArenaState({ state: "checking", error: "" });
        return request("/api/arena-status?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          setArenaState(payload);
        }).catch(function (error) {
          setArenaState({ state: "error", error: error.message });
        });
      }

      function setArenaState(next) {
        arenaState = Object.assign({}, arenaState, next || {});
        syncArenaUi();
      }

      function syncArenaConfiguration() {
        if (!els.arenaEnabled.checked) {
          setArenaState({ state: "disabled", error: "" });
          return;
        }
        if (!els.draft.checked) {
          setArenaState({ state: "paused", error: "" });
          return;
        }
        if (!els.arenaChannel.value) {
          setArenaState({ state: "error", error: "Elige un canal de Are.na." });
          return;
        }
        setArenaState({ state: "pending", error: "" });
      }

      function syncArenaAfterSave() {
        if (!isArenaEligible()) return Promise.resolve(null);
        syncArenaConfiguration();
        var hasMappedBlock = hasArenaMapping();
        if (!sourcePath || (!els.arenaEnabled.checked && !hasMappedBlock) || (!els.draft.checked && !hasMappedBlock)) {
          return Promise.resolve(null);
        }
        if (els.arenaEnabled.checked && els.draft.checked && !els.arenaChannel.value) {
          return Promise.resolve(null);
        }

        setArenaState({ state: "syncing", error: "" });
        return postJson("/api/sync-arena", { path: sourcePath }).then(function (payload) {
          var result = payload.arena || {};
          if (result.kind === "images") {
            frontMatter.arena_blocks = (result.blocks || []).map(function (block) {
              var mapping = {
                src: String(block.src || ""),
                block_id: String(block.blockId || ""),
              };
              if (block.connectionId) mapping.connection_id = String(block.connectionId);
              return mapping;
            });
          } else if (result.blockId) {
            frontMatter.arena_block_id = String(result.blockId);
          }
          if (result.kind === "images") {
            delete frontMatter.arena_connection_id;
          } else if (result.connectionId) {
            frontMatter.arena_connection_id = String(result.connectionId);
          } else {
            delete frontMatter.arena_connection_id;
          }
          setArenaState(result);
          if (result.state === "pending") {
            var syncedSnapshot = savedSnapshot;
            window.setTimeout(function () {
              if (arenaState.state === "pending" && savedSnapshot === syncedSnapshot && currentSaveSnapshot() === savedSnapshot) {
                loadArenaStatus();
              }
            }, 1500);
          }
          return result;
        }).catch(function (error) {
          setArenaState({ state: "error", error: error.message });
          return null;
        });
      }

      function retryArenaSync() {
        if (!savedSnapshot || currentSaveSnapshot() !== savedSnapshot) {
          setArenaState({ state: "pending", error: "Guarda primero los cambios del blog." });
          return;
        }
        syncArenaAfterSave();
      }

      function currentArenaChannelTitle() {
        var id = String(els.arenaChannel.value || "");
        var channel = arenaChannels.find(function (item) { return String(item.id) === id; });
        if (channel) return channel.title;
        var option = els.arenaChannel.options[els.arenaChannel.selectedIndex];
        return option ? option.textContent : "Sin elegir";
      }

      function arenaContentPreview() {
        if (isPhotoEditor()) {
          var galleryCount = Array.isArray(frontMatter.images) && frontMatter.images.length
            ? frontMatter.images.length
            : (els.image.value.trim() ? 1 : 0);
          var details = [els.imageAlt.value.trim(), els.caption.value.trim()].filter(Boolean);
          return {
            excerpt: details.join(" · "),
            imageCount: galleryCount,
          };
        }
        var content = String(els.body.value || "").replace(/\\r\\n/g, "\\n").trim();
        var excerpt = content.replace(/^#\\s+[^\\n]+\\n+/, "").slice(0, 360).trim();
        var words = content ? content.split(/\\s+/).filter(Boolean).length : 0;
        return {
          content: content,
          excerpt: excerpt + (content.length > excerpt.length ? "…" : ""),
          characters: content.length,
          minutes: Math.max(1, Math.ceil(words / 200)),
        };
      }

      function formatArenaDate(value) {
        if (!value) return "";
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      function syncArenaUi() {
        var preview = arenaContentPreview();
        var photo = isPhotoEditor();
        var hasMappedBlock = hasArenaMapping();
        var imageLabel = preview.imageCount === 1 ? "1 imagen" : preview.imageCount + " imágenes";
        var blogSaved = Boolean(savedSnapshot && currentSaveSnapshot() === savedSnapshot && !saveInProgress && !saveFailed);
        var state = arenaState.state || "disabled";
        var labels = {
          disabled: "Copia desactivada",
          unavailable: "No disponible",
          paused: "Copia pausada",
          checking: "Comprobando",
          pending: "Copia pendiente",
          syncing: "Copiando",
          synced: "Copia actualizada",
          error: "Error de Are.na",
        };
        var messages = {
          disabled: hasMappedBlock
            ? (blogSaved ? "El bloque se conserva en Are.na, fuera del canal." : "Guarda para retirar la copia del canal.")
            : (photo ? "Activa la copia para mantener estas imágenes en Are.na." : "Activa la copia para mantener este texto en Are.na."),
          unavailable: arenaState.error || "Are.na no esta disponible.",
          paused: hasMappedBlock
            ? (blogSaved ? "El borrador no aparece en el canal de Are.na." : "Guarda para retirar el borrador del canal.")
            : "Los borradores no se copian a Are.na.",
          checking: photo ? "Comprobando las imágenes en Are.na." : "Comprobando el bloque de texto en Are.na.",
          pending: arenaState.error || (!blogSaved
            ? (photo ? "Guarda para copiar las imágenes." : "Guarda para copiar el contenido completo.")
            : (hasMappedBlock
              ? (photo ? "Are.na está procesando las imágenes." : "Are.na está procesando el bloque de texto.")
              : (photo ? "Guarda para copiar las imágenes." : "Guarda para copiar el contenido completo."))),
          syncing: photo ? "Copiando las imágenes guardadas a Are.na." : "Copiando el Markdown guardado a Are.na.",
          synced: photo ? "Las imágenes coinciden con el blog." : "El bloque de texto coincide con el blog.",
          error: arenaState.error || "No se pudo actualizar Are.na.",
        };

        els.arenaHelper.textContent = photo
          ? "Al guardar, cada imagen se copiará con su título, texto alt y pie."
          : "Al guardar, se copiarán el título y el cuerpo Markdown completo.";
        els.arenaContentMeta.textContent = photo
          ? imageLabel + " · pie · alt"
          : "Bloque de texto · " + preview.characters.toLocaleString("es-MX") + " caracteres";
        els.arenaBlogStep.textContent = blogSaved ? "Blog actualizado" : "Blog sin guardar";
        els.arenaBlogStep.className = "arena-step " + (blogSaved ? "is-complete" : "is-pending");
        els.arenaCopyStep.textContent = labels[state] || labels.disabled;
        els.arenaCopyStep.className = "arena-step";
        if (state === "synced") els.arenaCopyStep.classList.add("is-complete");
        if (["pending", "syncing", "checking"].indexOf(state) !== -1) els.arenaCopyStep.classList.add("is-pending");
        if (state === "error" || state === "unavailable") els.arenaCopyStep.classList.add("is-error");
        els.arenaStateMessage.textContent = messages[state] || messages.disabled;
        els.arenaLastSynced.textContent = arenaState.lastSyncedAt
          ? "Ultima copia: " + formatArenaDate(arenaState.lastSyncedAt)
          : "";
        els.arenaRetry.hidden = state !== "error";
        els.arenaDetailsRetry.hidden = state !== "error";
        els.arenaDetailsButton.dataset.state = state;
        els.arenaDetailsButton.title = labels[state] || labels.disabled;
        els.arenaPreviewTitle.textContent = els.title.value.trim() || "Sin titulo";
        els.arenaPreviewType.textContent = photo ? "Bloque de imagen · archivo completo" : "Bloque de texto · Markdown completo";
        els.arenaPreviewExcerpt.textContent = preview.excerpt || (photo ? "El texto alt y el pie aparecerán aquí." : "El texto guardado aparecera aqui.");
        els.arenaPreviewMeta.textContent = photo
          ? imageLabel + " · título · pie · alt"
          : preview.characters.toLocaleString("es-MX") + " caracteres · " + preview.minutes + " min de lectura";
        els.arenaDetailsState.textContent = messages[state] || messages.disabled;
        els.arenaDetailsChannel.textContent = currentArenaChannelTitle();
        els.arenaBlockLink.hidden = !arenaState.blockUrl;
        if (arenaState.blockUrl) {
          els.arenaBlockLink.href = arenaState.blockUrl;
        }
        els.arenaBlockLink.textContent = photo ? "Abrir imagen en Are.na ↗" : "Abrir bloque de texto en Are.na ↗";
      }

      function openArenaDetails() {
        closeSettings();
        syncArenaUi();
        els.arenaDetails.hidden = false;
        els.arenaDetailsBackdrop.hidden = false;
        els.arenaDetailsClose.focus();
        if (sourcePath && savedSnapshot && currentSaveSnapshot() === savedSnapshot) {
          loadArenaStatus();
        }
      }

      function closeArenaDetails() {
        els.arenaDetails.hidden = true;
        els.arenaDetailsBackdrop.hidden = true;
      }

      function setupNewPost() {
        els.notebookField.hidden = false;
        els.title.value = "";
        els.body.value = "";
        slugTouched = false;
        els.slug.value = "";
        syncGeneratedSlug();
        syncRouteControls(false);
        els.date.value = today();
        els.image.value = "";
        els.imageAlt.value = "";
        els.caption.value = "";
        els.draft.checked = false;
        els.hidden.checked = true;
        els.arenaEnabled.checked = false;
        setArenaState({
          state: "disabled",
          blockId: "",
          connectionId: "",
          blockUrl: "",
          lastSyncedAt: "",
          error: "",
        });
        savedSnapshot = currentSaveSnapshot();
        saveInProgress = false;
        saveFailed = false;
        setStatus("New post");
        setPublicationState("idle", "Guarda para verificar el estado público.");
        resetBodyHistory();
        syncSavedState();
        syncPreviewButton();
        syncPhotoEditor();
        syncDeleteControls();
        resizeEditorFields();
        syncMarkdownFromFields();
        focusEditorStart();
      }

      function loadExisting() {
        return request("/api/page?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          frontMatter = payload.frontMatter || {};
          savedUrl = payload.url || "";
          els.notebookField.hidden = true;
          els.title.value = frontMatter.title || "";
          els.slug.value = routeFromPath(payload.path || sourcePath);
          syncRouteControls(true);
          els.date.value = frontMatter.date || today();
          els.tags.value = (frontMatter.tags || []).join(", ");
          els.summary.value = frontMatter.summary || frontMatter.description || "";
          els.image.value = frontMatter.image || "";
          els.imageAlt.value = frontMatter.image_alt || "";
          els.caption.value = frontMatter.caption || "";
          els.draft.checked = frontMatter.draft !== true;
          els.hidden.checked = frontMatter.hidden !== true;
          els.arenaEnabled.checked = frontMatter.arena_enabled === true;
          if (frontMatter.arena_channel_id) {
            var loadingChannel = document.createElement("option");
            loadingChannel.value = String(frontMatter.arena_channel_id);
            loadingChannel.textContent = "Canal configurado";
            els.arenaChannel.appendChild(loadingChannel);
            els.arenaChannel.value = String(frontMatter.arena_channel_id);
          }
          setArenaState({
            state: frontMatter.arena_enabled === true ? "checking" : "disabled",
            blockId: String(frontMatter.arena_block_id || frontMatter.arena_blocks?.[0]?.block_id || ""),
            blockUrl: (frontMatter.arena_block_id || frontMatter.arena_blocks?.[0]?.block_id)
              ? "https://www.are.na/block/" + (frontMatter.arena_block_id || frontMatter.arena_blocks[0].block_id)
              : "",
            connectionId: String(frontMatter.arena_connection_id || ""),
            blocks: (frontMatter.arena_blocks || []).map(function (block) {
              return {
                src: String(block.src || ""),
                blockId: String(block.block_id || ""),
                connectionId: String(block.connection_id || ""),
                blockUrl: block.block_id ? "https://www.are.na/block/" + block.block_id : "",
              };
            }),
            lastSyncedAt: "",
            error: "",
          });
          els.body.value = payload.body || "";
          els.path.textContent = payload.path || "";
          savedSnapshot = currentSaveSnapshot();
          saveInProgress = false;
          saveFailed = false;
          setStatus("Editing " + (payload.path || ""));
          resetBodyHistory();
          syncSavedState();
          syncPreviewButton();
          syncPhotoEditor();
          syncEditorKind();
          syncDeleteControls();
          setPublicationState(frontMatter.draft === true ? "draft" : "saved", frontMatter.draft === true
            ? "Este contenido sigue como borrador."
            : "Guardado; verifica para confirmar la ruta pública.");
          resizeEditorFields();
          syncMarkdownFromFields();
          focusEditorStart();
        });
      }

      function save() {
        if (activeViewMode === "markdown") {
          syncFieldsFromMarkdown();
        }
        if (!ensureTitleBeforeSave()) {
          return;
        }
        syncGeneratedSlug();
        els.save.disabled = true;
        setStatus("Saving");
        setPublicationState("saving", "Guardando cambios en GitHub.");

        var action = mode === "edit" ? saveExisting() : createPost();

        action.then(function (result) {
          assertPersistedState(result);
          if (result.frontMatter) frontMatter = result.frontMatter;
          savedUrl = result.url || savedUrl;
          sourcePath = result.path || sourcePath;
          els.path.textContent = sourcePath;
          mode = "edit";
          els.notebookField.hidden = true;
          els.slug.value = routeFromPath(sourcePath);
          syncRouteControls(true);
          savedSnapshot = currentSaveSnapshot();
          setStatus("Saved");
          setPublicationState("saved", result.changed === false ? "Sin cambios nuevos; el estado persistido coincide." : "Guardado en GitHub.");
          syncPreviewButton();
          syncDeleteControls();
          if (isArenaEligible() && (els.arenaEnabled.checked || hasArenaMapping())) {
            return syncArenaAfterSave().then(function () {
              startPublicVerification();
            });
          }
          startPublicVerification();
          return result;
        }).catch(function (error) {
          setStatus(error.message, true);
          setPublicationState("error", error.message);
        }).finally(function () {
          els.save.disabled = false;
        });
      }

      function createPost() {
        var payload = {
          notebook: els.notebook.value,
          title: els.title.value,
          slug: els.slug.value,
          date: els.date.value,
          tags: els.tags.value,
          summary: els.summary.value,
          draft: !els.draft.checked,
          hidden: !els.hidden.checked,
          arenaEnabled: isArenaEligible() && els.arenaEnabled.checked,
          arenaChannelId: isArenaEligible() && els.arenaEnabled.checked ? els.arenaChannel.value : "",
          body: isPhotoEditor() && els.image.value ? els.body.value : (els.body.value || "# " + els.title.value + "\\n"),
        };

        if (isPhotoEditor()) {
          Object.assign(payload, photoPayload());
          if (!payload.body && payload.image) {
            payload.body = "";
          }
        }

        return postJson("/api/create-post", payload);
      }

      function saveExisting() {
        var nextFrontMatter = Object.assign({}, frontMatter, {
          title: els.title.value,
          date: els.date.value,
        });

        if (!els.draft.checked) {
          nextFrontMatter.draft = true;
        } else {
          nextFrontMatter.draft = null;
        }

        if (!els.hidden.checked) {
          nextFrontMatter.hidden = true;
        } else {
          nextFrontMatter.hidden = null;
        }

        if (isArenaEligible()) {
          if (els.arenaEnabled.checked) {
            nextFrontMatter.arena_enabled = true;
            if (els.arenaChannel.value) {
              nextFrontMatter.arena_channel_id = String(els.arenaChannel.value);
            }
          } else {
            if (frontMatter.arena_enabled === true || hasArenaMapping()) {
              nextFrontMatter.arena_enabled = false;
            } else {
              nextFrontMatter.arena_enabled = null;
              nextFrontMatter.arena_channel_id = null;
            }
          }
        }

        if (kind === "notebook") {
          nextFrontMatter.description = els.summary.value;
        } else {
          nextFrontMatter.summary = els.summary.value;
          nextFrontMatter.tags = splitTags(els.tags.value);
        }

        if (isPhotoEditor()) {
          var photo = photoPayload();
          if (photo.image) {
            nextFrontMatter.image = photo.image;
            nextFrontMatter.image_alt = photo.imageAlt || els.title.value;
          } else {
            delete nextFrontMatter.image;
            delete nextFrontMatter.image_alt;
          }
          if (photo.caption) {
            nextFrontMatter.caption = photo.caption;
          } else {
            delete nextFrontMatter.caption;
          }
        }

        return postJson("/api/save-page", {
          path: sourcePath,
          frontMatter: nextFrontMatter,
          body: els.body.value,
        }).then(function (result) {
          frontMatter = result.frontMatter || nextFrontMatter;
          return result;
        });
      }

      function assertPersistedState(result) {
        var persisted = result && result.frontMatter;
        if (!persisted) return;
        var expectedDraft = !els.draft.checked;
        var expectedHidden = !els.hidden.checked;
        if ((persisted.draft === true) !== expectedDraft) {
          throw new Error("GitHub guardó el archivo, pero el estado de publicación no coincide.");
        }
        if ((persisted.hidden === true) !== expectedHidden) {
          throw new Error("GitHub guardó el archivo, pero la visibilidad no coincide.");
        }
      }

      function createNotebookChannel() {
        if (kind !== "notebook" || !sourcePath) return;
        els.createNotebookChannel.disabled = true;
        els.createNotebookChannel.textContent = "Sincronizando notebook…";
        els.notebookChannelStatus.textContent = "Creando o reutilizando el channel y copiando publicaciones públicas.";

        postJson("/api/create-notebook-channel", { path: sourcePath }).then(function (result) {
          var channel = result.channel || {};
          frontMatter.arena_channel_id = String(channel.id || "");
          if (channel.slug) frontMatter.arena_channel_slug = channel.slug;
          if (channel.url) frontMatter.arena_channel_url = channel.url;
          els.notebookChannelStatus.textContent = result.failures && result.failures.length
            ? result.synced + "/" + result.total + " publicaciones sincronizadas; " + result.failures.length + " necesitan reintento."
            : result.synced + "/" + result.total + " publicaciones sincronizadas.";
          els.createNotebookChannel.textContent = "Sincronizar notebook con Are.na";
          els.notebookChannelLink.hidden = !channel.url;
          if (channel.url) els.notebookChannelLink.href = channel.url;
        }).catch(function (error) {
          els.notebookChannelStatus.textContent = error.message;
          els.createNotebookChannel.textContent = "Reintentar channel desde notebook";
        }).finally(function () {
          els.createNotebookChannel.disabled = false;
        });
      }

      function publicSiteOrigin() {
        return String(siteOrigin || "").replace(/\\/admin$/, "").replace(/\\/+$/, "");
      }

      function publicPageUrl() {
        var path = savedUrl || (sourcePath ? contentPathToUrl(sourcePath) : "");
        return path ? publicSiteOrigin() + path : "";
      }

      function setPublicationState(state, message) {
        [els.publicationSavedStep, els.publicationDeployStep, els.publicationPublicStep].forEach(function (step) {
          step.classList.remove("is-active", "is-complete");
        });

        if (["saved", "deploying", "pending", "public", "draft"].indexOf(state) !== -1) {
          els.publicationSavedStep.classList.add("is-complete");
        }
        if (state === "saving") els.publicationSavedStep.classList.add("is-active");
        if (state === "deploying" || state === "pending") els.publicationDeployStep.classList.add("is-active");
        if (state === "public") {
          els.publicationDeployStep.classList.add("is-complete");
          els.publicationPublicStep.classList.add("is-complete");
        }
        if (state === "error") els.publicationSavedStep.classList.add("is-active");
        els.publicationMessage.textContent = message || "";
      }

      function startPublicVerification() {
        publicationCheckToken += 1;
        var token = publicationCheckToken;
        var url = publicPageUrl();
        els.publicationLink.hidden = !url || !els.draft.checked;
        if (url) els.publicationLink.href = url;

        if (!els.draft.checked) {
          setPublicationState("draft", "Borrador guardado; no se envió al sitio público.");
          return;
        }
        if (!url) {
          setPublicationState("saved", "Guardado en GitHub; falta una ruta para verificar.");
          return;
        }

        setPublicationState("deploying", "Guardado en GitHub; comprobando la ruta pública.");
        checkPublicPage(url, token, 0);
      }

      function checkPublicPage(url, token, attempt) {
        fetch(url, { cache: "no-store", credentials: "same-origin" }).then(function (response) {
          if (token !== publicationCheckToken) return;
          if (response.ok) {
            setPublicationState("public", "Disponible públicamente y verificado.");
            return;
          }
          retryPublicPage(url, token, attempt);
        }).catch(function () {
          retryPublicPage(url, token, attempt);
        });
      }

      function retryPublicPage(url, token, attempt) {
        if (token !== publicationCheckToken) return;
        if (attempt >= 29) {
          setPublicationState("pending", "Guardado en GitHub; el despliegue sigue pendiente.");
          return;
        }
        window.setTimeout(function () {
          checkPublicPage(url, token, attempt + 1);
        }, 2000);
      }

      function uploadImage() {
        var file = els.imageFile.files && els.imageFile.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          var alt = els.imageAlt.value || els.title.value || file.name.replace(/\\.[^.]+$/, "");
          postJson("/api/upload-image", {
            name: file.name,
            alt: alt,
            caption: els.caption.value,
            data: reader.result,
          }).then(function (result) {
            if (isPhotoEditor()) {
              els.image.value = result.url;
              if (!els.imageAlt.value) {
                els.imageAlt.value = alt;
              }
              if (!els.summary.value && els.caption.value) {
                els.summary.value = els.caption.value;
              }
              updatePhotoPreview();
              markContentEdited();
              setStatus("Post image set " + result.url);
              return;
            }

            insertAtCursor(activeTextArea(), result.markdown + "\\n");
            setStatus("Image added " + result.url);
          }).catch(function (error) {
            setStatus(error.message, true);
          }).finally(function () {
            els.imageFile.value = "";
          });
        };
        reader.readAsDataURL(file);
      }

      function insertAtCursor(textarea, text) {
        if (textarea === els.body) {
          recordBodyHistory();
        }
        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var value = textarea.value;
        var prefix = value.slice(0, start);
        var suffix = value.slice(end);
        var insert = (prefix && !prefix.endsWith("\\n") ? "\\n\\n" : "") + text;
        textarea.value = prefix + insert + suffix;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = (prefix + insert).length;
        resizeTextarea(textarea);
        if (textarea === els.markdownCanvas) {
          syncFieldsFromMarkdown();
          markContentEdited();
          return;
        }
        recordBodyHistory();
      }

      function activeTextArea() {
        return activeViewMode === "markdown" ? els.markdownCanvas : els.body;
      }

      function applyFormat(format) {
        if (format === "undo") {
          if (activeViewMode === "markdown") {
            document.execCommand("undo");
            syncFieldsFromMarkdown();
            return;
          }
          undoBody();
          return;
        }
        if (format === "redo") {
          if (activeViewMode === "markdown") {
            document.execCommand("redo");
            syncFieldsFromMarkdown();
            return;
          }
          redoBody();
          return;
        }
        if (format === "bold") {
          wrapSelection("**", "**");
          return;
        }
        if (format === "italic") {
          wrapSelection("_", "_");
          return;
        }
        if (format === "strike") {
          wrapSelection("~~", "~~");
          return;
        }
        if (format === "code") {
          wrapSelection(String.fromCharCode(96), String.fromCharCode(96));
          return;
        }
        if (format === "heading") {
          prefixCurrentLine("## ");
          return;
        }
        if (format === "quote") {
          prefixCurrentLine("> ");
          return;
        }
        if (format === "ul") {
          prefixCurrentLine("- ");
          return;
        }
        if (format === "ol") {
          prefixCurrentLine("1. ");
          return;
        }
        if (format === "link") {
          wrapSelection("[", "](https://)");
          return;
        }
        setStatus("Use Markdown for " + format);
      }

      function wrapSelection(before, after) {
        var textarea = activeTextArea();
        if (textarea === els.body) {
          recordBodyHistory();
        }
        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var selected = textarea.value.slice(start, end) || "text";
        replaceTextRange(textarea, start, end, before + selected + after, start + before.length, start + before.length + selected.length);
        resizeTextarea(textarea);
        if (textarea === els.markdownCanvas) {
          syncFieldsFromMarkdown();
          markContentEdited();
          return;
        }
        recordBodyHistory();
      }

      function prefixCurrentLine(prefix) {
        var textarea = activeTextArea();
        if (textarea === els.body) {
          recordBodyHistory();
        }
        var cursor = textarea.selectionStart || 0;
        var lineStart = textarea.value.lastIndexOf("\\n", cursor - 1) + 1;
        replaceTextRange(textarea, lineStart, lineStart, prefix, cursor + prefix.length, cursor + prefix.length);
        resizeTextarea(textarea);
        if (textarea === els.markdownCanvas) {
          syncFieldsFromMarkdown();
          markContentEdited();
          return;
        }
        recordBodyHistory();
      }

      function replaceTextRange(textarea, start, end, text, selectionStart, selectionEnd) {
        textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
        textarea.focus();
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionEnd;
      }

      function resetBodyHistory() {
        bodyHistory = [bodySnapshot()];
        bodyHistoryIndex = 0;
        updateHistoryButtons();
      }

      function bodySnapshot() {
        return {
          value: els.body.value,
          selectionStart: els.body.selectionStart || 0,
          selectionEnd: els.body.selectionEnd || 0,
        };
      }

      function recordBodyHistory() {
        var snapshot = bodySnapshot();
        var current = bodyHistory[bodyHistoryIndex];
        if (current && current.value === snapshot.value && current.selectionStart === snapshot.selectionStart && current.selectionEnd === snapshot.selectionEnd) {
          updateHistoryButtons();
          syncSavedState();
          return;
        }
        bodyHistory = bodyHistory.slice(0, bodyHistoryIndex + 1);
        bodyHistory.push(snapshot);
        bodyHistoryIndex = bodyHistory.length - 1;
        updateHistoryButtons();
        markContentEdited();
      }

      function restoreBodySnapshot(snapshot) {
        restoringBodyHistory = true;
        els.body.value = snapshot.value;
        els.body.focus();
        els.body.selectionStart = snapshot.selectionStart;
        els.body.selectionEnd = snapshot.selectionEnd;
        restoringBodyHistory = false;
        resizeTextarea(els.body);
        updateHistoryButtons();
        markContentEdited();
      }

      function undoBody() {
        if (bodyHistoryIndex <= 0) {
          return;
        }
        bodyHistoryIndex -= 1;
        restoreBodySnapshot(bodyHistory[bodyHistoryIndex]);
      }

      function redoBody() {
        if (bodyHistoryIndex >= bodyHistory.length - 1) {
          return;
        }
        bodyHistoryIndex += 1;
        restoreBodySnapshot(bodyHistory[bodyHistoryIndex]);
      }

      function updateHistoryButtons() {
        els.undo.disabled = bodyHistoryIndex <= 0;
        els.redo.disabled = bodyHistoryIndex >= bodyHistory.length - 1;
      }

      function toggleSettings() {
        if (els.settings.hidden) {
          openSettings();
          return;
        }
        closeSettings();
      }

      function openSettings() {
        if (document.activeElement && typeof document.activeElement.blur === "function") {
          document.activeElement.blur();
        }
        els.settings.hidden = false;
        els.settingsBackdrop.hidden = false;
        syncSettingsState();
      }

      function closeSettings() {
        els.settings.hidden = true;
        els.settingsBackdrop.hidden = true;
        syncSettingsState();
      }

      function syncSettingsState() {
        var open = !els.settings.hidden;
        document.body.classList.toggle("settings-open", open);
        els.writer.toggleAttribute("inert", open);
        els.formatbar.toggleAttribute("inert", open);
        els.writer.setAttribute("aria-hidden", String(open));
        els.formatbar.setAttribute("aria-hidden", String(open));
        els.topSettingsButton.setAttribute("aria-expanded", String(open));
        els.topSettingsButton.setAttribute("aria-label", open ? "Cerrar configuracion" : "Configuracion");
      }

      function syncWritingState() {
        var active = document.activeElement;
        document.body.classList.toggle("is-writing", active === els.title || active === els.summary || active === els.body || active === els.markdownCanvas);
      }

      function readViewMode() {
        try {
          return normalizeViewMode(window.localStorage.getItem(viewModeStorageKey));
        } catch (error) {
          return "render";
        }
      }

      function normalizeViewMode(value) {
        return value === "markdown" ? "markdown" : "render";
      }

      function applyViewMode(value, shouldFocus) {
        var viewMode = normalizeViewMode(value);
        if (activeViewMode === "markdown" && viewMode !== "markdown") {
          syncFieldsFromMarkdown();
        }
        activeViewMode = viewMode;
        els.paper.classList.toggle("markdown-mode", viewMode === "markdown");
        els.title.hidden = viewMode === "markdown";
        els.summary.hidden = viewMode === "markdown";
        els.body.hidden = viewMode === "markdown";
        els.markdownCanvas.hidden = viewMode !== "markdown";
        els.viewMarkdown.setAttribute("aria-pressed", String(viewMode === "markdown"));
        els.viewMarkdown.setAttribute("aria-label", viewMode === "markdown" ? "Desactivar Markdown" : "Activar Markdown");
        if (viewMode === "markdown") {
          syncMarkdownFromFields();
          resizeTextarea(els.markdownCanvas);
        } else {
          resizeEditorFields();
        }
        try {
          window.localStorage.setItem(viewModeStorageKey, viewMode);
        } catch (error) {
          // localStorage can be unavailable in private or restricted contexts.
        }
        if (shouldFocus) {
          focusEditorStart();
        }
      }

      function focusEditorStart() {
        window.setTimeout(function () {
          if (activeViewMode === "markdown") {
            els.markdownCanvas.focus();
            return;
          }
          if (els.title.value.trim()) {
            els.body.focus();
            return;
          }
          els.title.focus();
        }, 0);
      }

      function syncMarkdownFromFields() {
        if (activeViewMode !== "markdown") {
          return;
        }
        els.markdownCanvas.value = markdownFromFields();
        resizeTextarea(els.markdownCanvas);
      }

      function markdownFromFields() {
        var parts = [];
        var title = els.title.value.trim();
        var summary = els.summary.value.trim();
        var body = stripMatchingTitle(els.body.value, title).trimStart();

        if (title) {
          parts.push("# " + title);
        }
        if (summary) {
          parts.push(summary.split("\\n").map(function (line) {
            return "> " + line;
          }).join("\\n"));
        }
        if (body) {
          parts.push(body);
        }

        return parts.join("\\n\\n");
      }

      function stripMatchingTitle(value, title) {
        var body = String(value || "").replace(/\\r\\n/g, "\\n");
        var cleanTitle = title.trim().toLowerCase();
        if (!cleanTitle) return body;

        var lines = body.split("\\n");
        var first = (lines[0] || "").trim().replace(/^#\\s+/, "").trim().toLowerCase();
        if (first !== cleanTitle) {
          return body;
        }

        lines.shift();
        while (lines[0] !== undefined && !lines[0].trim()) {
          lines.shift();
        }
        return lines.join("\\n");
      }

      function syncFieldsFromMarkdown() {
        var parsed = parseMarkdownCanvas(els.markdownCanvas.value);
        els.title.value = parsed.title;
        els.summary.value = parsed.summary;
        els.body.value = parsed.body;
        syncGeneratedSlug();
        resizeEditorFields();
      }

      function parseMarkdownCanvas(value) {
        var lines = String(value || "").replace(/\\r\\n/g, "\\n").split("\\n");
        var index = 0;
        var title = "";
        var summaryLines = [];

        while (index < lines.length && !lines[index].trim()) {
          index += 1;
        }

        var titleMatch = (lines[index] || "").match(/^#\\s+(.+)$/);
        if (titleMatch) {
          title = titleMatch[1].trim();
          index += 1;
        }

        while (index < lines.length && !lines[index].trim()) {
          index += 1;
        }

        while (index < lines.length && /^> ?/.test(lines[index])) {
          summaryLines.push(lines[index].replace(/^> ?/, ""));
          index += 1;
        }

        while (index < lines.length && !lines[index].trim()) {
          index += 1;
        }

        return {
          title: title,
          summary: summaryLines.join("\\n").trim(),
          body: lines.slice(index).join("\\n").trimStart(),
        };
      }

      function readEditorSize() {
        try {
          return normalizeEditorSize(window.localStorage.getItem(editorSizeStorageKey));
        } catch (error) {
          return "small";
        }
      }

      function normalizeEditorSize(value) {
        return ["small", "medium", "large"].indexOf(value) === -1 ? "small" : value;
      }

      function applyEditorSize(value) {
        var size = normalizeEditorSize(value);
        document.body.dataset.editorSize = size;
        els.editorFontSize.value = size;
        try {
          window.localStorage.setItem(editorSizeStorageKey, size);
        } catch (error) {
          // localStorage can be unavailable in private or restricted contexts.
        }
        resizeEditorFields();
      }

      function resizeEditorFields() {
        window.requestAnimationFrame(function () {
          updateTopbarHeight();
          resizeTextarea(els.title);
          resizeTextarea(els.body);
        });
      }

      function updateTopbarHeight() {
        var topbar = document.querySelector(".topbar");
        if (!topbar) {
          return;
        }
        document.documentElement.style.setProperty("--topbar-height", topbar.offsetHeight + "px");
      }

      function resizeTextarea(textarea) {
        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }

      function setStatus(message, error) {
        els.status.textContent = message;
        els.status.classList.toggle("error", Boolean(error));
        if (error) {
          saveInProgress = false;
          saveFailed = true;
          syncSavedState();
          return;
        }
        if (message === "Saving") {
          saveInProgress = true;
          saveFailed = false;
          syncSavedState();
          return;
        }
        if (message === "Saved") {
          saveInProgress = false;
          saveFailed = false;
        }
        syncSavedState();
      }

      function markContentEdited() {
        saveFailed = false;
        if (els.arenaEnabled.checked && arenaState.state !== "unavailable" && arenaState.state !== "syncing") {
          arenaState = Object.assign({}, arenaState, { state: "pending", error: "" });
        }
        syncSavedState();
      }

      function currentSaveSnapshot() {
        return JSON.stringify({
          sourcePath: sourcePath,
          notebook: els.notebook.value,
          title: els.title.value,
          summary: els.summary.value,
          slug: els.slug.value,
          date: els.date.value,
          tags: els.tags.value,
          image: els.image.value,
          imageAlt: els.imageAlt.value,
          caption: els.caption.value,
          draft: !els.draft.checked,
          hidden: !els.hidden.checked,
          arenaEnabled: els.arenaEnabled.checked,
          arenaChannelId: els.arenaChannel.value,
          body: els.body.value,
        });
      }

      function syncSavedState() {
        if (saveInProgress) {
          setSavePill("saving", "Guardando");
          syncArenaUi();
          return;
        }
        if (saveFailed) {
          setSavePill("error", "Error");
          syncArenaUi();
          return;
        }
        if (savedSnapshot && currentSaveSnapshot() === savedSnapshot) {
          setSavePill("saved", "Sincronizado");
          syncArenaUi();
          return;
        }
        setSavePill("unsaved", "Sin guardar");
        syncArenaUi();
      }

      function setSavePill(state, label) {
        els.savedPill.dataset.state = state;
        els.savedPill.textContent = label;
      }

      function previewUrl() {
        if (savedUrl) {
          return siteOrigin + savedUrl;
        }
        if (sourcePath) {
          return siteOrigin + contentPathToUrl(sourcePath);
        }
        return "";
      }

      function syncPreviewButton() {
        var url = previewUrl();
        els.openSite.disabled = !url;
        els.openSite.hidden = !url;
        els.openSite.title = url ? "" : "Save before preview";
        document.body.classList.toggle("no-preview", !url);
        window.requestAnimationFrame(updateTopbarHeight);
      }

      function goToSavedPage() {
        var url = previewUrl();
        if (!url) {
          return;
        }
        window.location.assign(url);
      }

      function currentSeparator() {
        return els.notebook.value.endsWith("/posts") ? "_" : "-";
      }

      function syncGeneratedSlug() {
        if (mode === "new" && !slugTouched) {
          els.slug.value = slugify(els.title.value, currentSeparator());
        }
      }

      function ensureTitleBeforeSave() {
        if (els.title.value.trim()) {
          return true;
        }

        setStatus("Agrega un titulo para generar la ruta.", true);
        closeSettings();
        focusEditorStart();
        return false;
      }

      function isPhotoEditor() {
        if (kind === "notebook") {
          return false;
        }
        if (mode === "edit") {
          return postFormat === "image" ||
            Boolean(frontMatter.image) ||
            sourcePath.startsWith("content_es/fotografia/");
        }
        return postFormat === "image" ||
          els.notebook.value.endsWith("/fotografia") ||
          preferredNotebook.endsWith("/fotografia");
      }

      function isArenaEligible() {
        return kind !== "notebook";
      }

      function hasArenaMapping() {
        return Boolean(
          arenaState.blockId ||
          (Array.isArray(arenaState.blocks) && arenaState.blocks.length) ||
          frontMatter.arena_block_id ||
          (Array.isArray(frontMatter.arena_blocks) && frontMatter.arena_blocks.length)
        );
      }

      function syncPhotoEditor() {
        var photo = isPhotoEditor();
        els.photoFields.hidden = !photo;
        els.imageAltField.hidden = !photo;
        els.captionField.hidden = !photo;
        if (photo && mode === "new" && els.notebook.value === "content_es/fotografia" && !els.tags.value.trim()) {
          els.tags.value = "fotografia";
        }
        updatePhotoPreview();
        syncArenaSurfaceVisibility();
        syncDeleteControls();
      }

      function syncArenaSurfaceVisibility() {
        var hidden = !isArenaEligible();
        els.arenaSection.hidden = hidden;
        els.arenaDetailsButton.hidden = hidden;
        if (hidden) {
          closeArenaDetails();
          if (mode === "new" && els.arenaEnabled.checked) {
            els.arenaEnabled.checked = false;
            setArenaState({ state: "disabled", blockId: "", connectionId: "", blockUrl: "", blocks: [], error: "" });
          }
        }
      }

      function syncEditorKind() {
        var notebook = kind === "notebook";
        els.settingsTitle.textContent = notebook ? "Notebook" : "Propiedades";
        els.notebookChannelSection.hidden = !notebook;
        els.tagsField.hidden = notebook;
        els.imageAltField.hidden = true;
        els.captionField.hidden = true;
        els.insertDividerBefore.hidden = notebook;
        els.insertToolbarGroup.hidden = notebook;
        els.insertDividerAfter.hidden = notebook;
        els.toolbarImage.hidden = notebook;
        els.toolbarImage.disabled = notebook;
        if (notebook) {
          var channelUrl = String(frontMatter.arena_channel_url || "");
          els.notebookChannelLink.hidden = !channelUrl;
          if (channelUrl) els.notebookChannelLink.href = channelUrl;
          if (frontMatter.arena_channel_id) {
            els.createNotebookChannel.textContent = "Sincronizar notebook con Are.na";
            els.notebookChannelStatus.textContent = "Channel configurado. Reintentar no duplica publicaciones.";
          }
        }
        syncArenaSurfaceVisibility();
      }

      function updatePhotoPreview() {
        var image = els.image.value.trim();
        if (!image) {
          els.photoPreview.removeAttribute("src");
          syncDeleteControls();
          return;
        }
        els.photoPreview.src = image.charAt(0) === "/" ? siteOrigin + image : image;
        syncDeleteControls();
      }

      function syncDeleteControls() {
        var canDeletePage = mode === "edit" && Boolean(sourcePath);
        var image = els.image.value.trim();
        els.dangerZone.hidden = !canDeletePage;
        els.deletePage.innerHTML = '${ICONS.trash}<span>' + (kind === "notebook" ? "Eliminar notebook" : "Eliminar post") + '</span>';
        els.deleteImage.hidden = !image || !isUploadUrl(image);
      }

      function pulseButton(button) {
        if (!button) return;
        button.classList.remove("is-pressed");
        void button.offsetWidth;
        button.classList.add("is-pressed");
        window.setTimeout(function () {
          button.classList.remove("is-pressed");
        }, 220);
      }

      function setDeleteButtonBusy(label) {
        var labelNode = els.deletePage.querySelector("span");
        var oldText = labelNode ? labelNode.textContent : "";
        els.deletePage.classList.add("is-busy");
        els.deletePage.setAttribute("aria-busy", "true");
        if (labelNode) {
          labelNode.textContent = label;
        }

        return function () {
          els.deletePage.classList.remove("is-busy");
          els.deletePage.removeAttribute("aria-busy");
          if (labelNode) {
            labelNode.textContent = oldText;
          }
        };
      }

      function syncRouteControls(hasRoute) {
        els.slug.readOnly = true;
        els.slugField.hidden = !hasRoute;
        els.slugField.classList.toggle("is-readonly", Boolean(hasRoute));
        els.copySlug.hidden = !hasRoute;
      }

      function copyRoute() {
        var value = els.slug.value.trim();
        if (!value) {
          setStatus("Ruta vacia");
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () {
            setStatus("Ruta copiada");
          }).catch(function () {
            copyRouteWithSelection(value);
          });
          return;
        }

        copyRouteWithSelection(value);
      }

      function copyRouteWithSelection(value) {
        els.slug.focus();
        els.slug.select();
        try {
          document.execCommand("copy");
          setStatus("Ruta copiada");
        } catch (error) {
          window.prompt("Copia la ruta", value);
        }
        els.slug.blur();
      }

      function isUploadUrl(value) {
        var raw = String(value || "").trim();
        if (!raw) return false;
        try {
          if (/^https?:\\/\\//.test(raw)) {
            raw = new URL(raw).pathname;
          }
        } catch (error) {
          return false;
        }
        raw = raw.replace(/^\\/admin(?=\\/uploads\\/)/, "");
        return raw.indexOf("/uploads/") === 0 || raw.indexOf("static/uploads/") === 0;
      }

      function notebookPathFromSource() {
        return sourcePath.replace(/\\/_index\\.md$/, "");
      }

      function routeFromPath(relativePath) {
        return relativePath ? contentPathToUrl(relativePath) : "";
      }

      function deleteCurrentPage() {
        if (mode !== "edit" || !sourcePath) return;
        pulseButton(els.deletePage);
        var label = kind === "notebook" ? "notebook" : "post";
        var confirmation = window.prompt("Escribe BORRAR para eliminar este " + label + ".");
        if (confirmation !== "BORRAR") {
          setStatus("Eliminacion cancelada.");
          return;
        }

        var endpoint = kind === "notebook" ? "/api/delete-notebook" : "/api/delete-page";
        var path = kind === "notebook" ? notebookPathFromSource() : sourcePath;
        var clearBusy = setDeleteButtonBusy("Eliminando...");
        els.deletePage.disabled = true;
        setStatus("Deleting");
        postJson(endpoint, {
          path: path,
          deleteImages: els.deleteAttachedImages.checked,
        }).then(function (result) {
          var target = result.url || (kind === "notebook" ? "/es/" : "/es/");
          window.location.assign(siteOrigin + target);
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          els.deletePage.disabled = false;
          clearBusy();
        });
      }

      function deleteCurrentImage() {
        var image = els.image.value.trim();
        if (!isUploadUrl(image)) return;
        if (!window.confirm("Eliminar el archivo de imagen del repositorio?")) {
          return;
        }
        els.deleteImage.disabled = true;
        setStatus("Deleting image");
        postJson("/api/delete-image", {
          url: image,
        }).then(function () {
          els.image.value = "";
          els.imageAlt.value = "";
          els.caption.value = "";
          updatePhotoPreview();
          markContentEdited();
          setStatus("Image deleted");
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          els.deleteImage.disabled = false;
        });
      }

      function photoPayload() {
        return {
          image: els.image.value.trim(),
          imageAlt: els.imageAlt.value.trim(),
          caption: els.caption.value.trim(),
        };
      }

      function slugify(value, separator) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, separator)
          .replace(new RegExp(separator + "+", "g"), separator)
          .replace(new RegExp("^" + separator + "|" + separator + "$", "g"), "");
      }

      function splitTags(value) {
        return String(value || "")
          .split(",")
          .map(function (tag) { return tag.trim(); })
          .filter(Boolean);
      }

      function today() {
        return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      }

      function contentPathToUrl(relativePath) {
        var lang = relativePath.indexOf("content_es/") === 0 ? "es" : "en";
        var root = lang === "es" ? "content_es" : "content_en";
        var route = relativePath.slice(root.length).replace(/\\.md$/, "");
        route = route.replace(/\\/index$/, "/").replace(/\\/_index$/, "/");
        if (route.charAt(0) !== "/") route = "/" + route;
        var url = (lang === "es" ? "/es" : "") + route;
        return url.charAt(url.length - 1) === "/" ? url : url + "/";
      }
    })();
  </script>
</body>
</html>`;
  const normalizedApiBase = String(apiBase || "/api").replace(/\/+$/, "");
  return html.replaceAll('"/api/', '"' + normalizedApiBase + "/");
}
