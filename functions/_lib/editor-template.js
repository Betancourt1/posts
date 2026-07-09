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
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Author Editor</title>
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
      z-index: 10;
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
      background: rgba(0, 0, 0, 0.54);
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
    .saved-pill[data-state="error"]::before {
      background: var(--danger);
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
      background: #fff1e9;
      color: #ff671f;
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
      --bg: #ffffff;
      --panel: #ffffff;
      --panel-2: #f2f2f2;
      --ink: #303030;
      --muted: #777777;
      --line: #eeeeee;
      --accent: #ff671f;
      --field: #ffffff;
    }
    .reference-theme .topbar {
      height: 4.55rem;
      border-bottom: 0;
      background: #ffffff;
      padding: 0 1.35rem;
    }
    .reference-theme .brand {
      gap: 0.75rem;
    }
    .reference-theme .brand strong {
      display: none;
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
      background: #ff671f;
      color: #ffffff;
    }
    .reference-theme .shell {
      min-height: calc(100vh - 9.3rem);
      display: block;
      background: #ffffff;
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
      color: #303030;
      font-family: var(--editor-font);
      font-size: var(--editor-body-size);
      line-height: 1.72;
    }
    .reference-theme .body-input::placeholder {
      color: #b7b7b7;
    }
    .reference-theme .settings {
      position: fixed;
      right: 1.2rem;
      bottom: 4.45rem;
      z-index: 30;
      width: min(22rem, calc(100vw - 2.4rem));
      max-height: min(38rem, calc(100vh - 6rem));
      border: 1px solid #e6e6e6;
      border-radius: 0.65rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.12);
    }
    .reference-theme .settings[hidden] {
      display: none !important;
    }
    .reference-theme .field input,
    .reference-theme .field select {
      border-color: #e5e5e5;
      background: #ffffff;
      color: #303030;
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
      background: #0b0c0f;
      color: #cfcfd2;
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
        padding: 5.1rem 1.5rem calc(7rem + env(safe-area-inset-bottom));
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
        min-height: 4.75rem;
        height: 4.75rem;
        display: grid;
        grid-template-columns: 2.75rem minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.65rem;
        padding: 0.85rem 1rem;
        z-index: 12;
      }
      .brand {
        display: contents;
      }
      .back-button {
        grid-column: 1;
        width: 2.75rem;
        min-width: 2.75rem;
        min-height: 2.75rem;
        color: var(--ink);
      }
      .saved-pill,
      .reference-theme .saved-pill {
        grid-column: 2;
        justify-self: center;
        max-width: min(9.8rem, 38vw);
        min-height: 1.8rem;
        border: 0;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 600;
      }
      .top-actions {
        grid-column: 3;
        width: auto;
        gap: 0.45rem;
      }
      .top-actions button,
      .reference-theme .top-actions button {
        flex: 0 0 auto;
        min-height: 2.6rem;
        border: 1px solid rgba(255, 255, 255, 0.68);
        border-radius: 0.55rem;
        background: transparent;
        padding: 0 0.75rem;
        color: var(--ink);
      }
      .top-actions .markdown-toggle,
      .reference-theme .top-actions .markdown-toggle {
        width: 2.2rem;
        min-width: 2.2rem !important;
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
        min-width: 2.25rem !important;
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
      body.no-preview .topbar {
        grid-template-columns: 2.75rem minmax(0, 1fr) auto;
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
  </style>
</head>
<body class="reference-theme" data-theme="dark">
  <header class="topbar">
    <div class="brand">
      <button type="button" class="back-button" id="back" aria-label="Back">${ICONS.back}</button>
      <strong>Author Editor</strong>
      <span class="saved-pill" id="saved-pill">Saved</span>
      <span class="status" id="status">Loading</span>
    </div>
    <div class="top-actions">
      <button type="button" class="markdown-toggle" id="view-markdown" aria-pressed="false" aria-label="Activar Markdown" title="Markdown">${ICONS.code}</button>
      <button type="button" class="mobile-settings-button" id="top-settings-button" aria-controls="settings" aria-expanded="false" aria-label="Configuracion">...</button>
      <button type="button" id="open-site">Abrir sitio</button>
      <button type="button" class="primary" id="save"><span class="save-label-desktop">Guardar</span><span class="save-label-mobile">Guardar</span></button>
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
  </main>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode") || "new";
      var kind = params.get("kind") || "post";
      var postFormat = params.get("format") || "";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var siteOrigin = params.get("site") || ${JSON.stringify(SITE_ORIGIN)};
      var sourcePath = params.get("path") || "";
      var preferredNotebook = params.get("notebook") || "";
      var frontMatter = {};
      var savedUrl = "";
      var slugTouched = false;
      var editorSizeStorageKey = "authorEditorFontSize";
      var viewModeStorageKey = "authorEditorViewMode";
      var activeViewMode = "render";
      var savedSnapshot = null;
      var saveInProgress = false;
      var saveFailed = false;
      var bodyHistory = [];
      var bodyHistoryIndex = -1;
      var restoringBodyHistory = false;
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
        summary: document.getElementById("summary"),
        draft: document.getElementById("draft"),
        hidden: document.getElementById("hidden"),
        dangerZone: document.getElementById("danger-zone"),
        deleteAttachedImages: document.getElementById("delete-attached-images"),
        deletePage: document.getElementById("delete-page"),
        undo: document.querySelector('[data-format="undo"]'),
        redo: document.querySelector('[data-format="redo"]'),
        save: document.getElementById("save"),
        openSite: document.getElementById("open-site"),
        imageFile: document.getElementById("image-file"),
        path: document.getElementById("path"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        applyEditorSize(readEditorSize());
        applyViewMode(readViewMode());
        bind();
        syncSettingsState();
        syncWritingState();
        syncPreviewButton();
        syncEditorKind();
        loadNotebooks().then(function () {
          if (mode === "edit") {
            return loadExisting();
          }

          setupNewPost();
          return null;
        }).catch(function (error) {
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
        els.save.addEventListener("click", save);
        els.editorFontSize.addEventListener("change", function () {
          applyEditorSize(els.editorFontSize.value);
        });
        els.viewMarkdown.addEventListener("click", function () {
          applyViewMode(activeViewMode === "markdown" ? "render" : "markdown", true);
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
          if (event.key === "Escape" && !els.settings.hidden) {
            closeSettings();
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
        return fetch(path, options || {}).then(function (response) {
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
        return request("/api/notebooks").then(function (payload) {
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
        });
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
        savedSnapshot = currentSaveSnapshot();
        saveInProgress = false;
        saveFailed = false;
        setStatus("New post");
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
          syncDeleteControls();
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

        var action = mode === "edit" ? saveExisting() : createPost();

        action.then(function (result) {
          savedUrl = result.url || savedUrl;
          sourcePath = result.path || sourcePath;
          els.path.textContent = sourcePath;
          mode = "edit";
          els.notebookField.hidden = true;
          els.slug.value = routeFromPath(sourcePath);
          syncRouteControls(true);
          savedSnapshot = currentSaveSnapshot();
          setStatus("Saved");
          syncPreviewButton();
          syncDeleteControls();
          goToSavedPage();
        }).catch(function (error) {
          setStatus(error.message, true);
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
          delete nextFrontMatter.draft;
        }

        if (!els.hidden.checked) {
          nextFrontMatter.hidden = true;
        } else {
          delete nextFrontMatter.hidden;
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
          frontMatter = nextFrontMatter;
          return result;
        });
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
          body: els.body.value,
        });
      }

      function syncSavedState() {
        if (saveInProgress) {
          setSavePill("saving", "Guardando");
          return;
        }
        if (saveFailed) {
          setSavePill("error", "Error");
          return;
        }
        if (savedSnapshot && currentSaveSnapshot() === savedSnapshot) {
          setSavePill("saved", "Sincronizado");
          return;
        }
        setSavePill("unsaved", "Sin guardar");
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
        return postFormat === "image" ||
          Boolean(frontMatter.image) ||
          els.notebook.value.endsWith("/fotografia") ||
          preferredNotebook.endsWith("/fotografia");
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
        syncDeleteControls();
      }

      function syncEditorKind() {
        var notebook = kind === "notebook";
        els.settingsTitle.textContent = notebook ? "Notebook" : "Propiedades";
        els.tagsField.hidden = notebook;
        els.imageAltField.hidden = true;
        els.captionField.hidden = true;
        els.insertDividerBefore.hidden = notebook;
        els.insertToolbarGroup.hidden = notebook;
        els.insertDividerAfter.hidden = notebook;
        els.toolbarImage.hidden = notebook;
        els.toolbarImage.disabled = notebook;
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
