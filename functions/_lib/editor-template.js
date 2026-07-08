function iconSvg(paths) {
  return `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const ICONS = Object.freeze({
  back: iconSvg(`<path d="m15 18-6-6 6-6" />`),
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
  typewriter: iconSvg(`<path d="M12 3v18" /><path d="M8 7h8" /><path d="M8 17h8" /><path d="M4 12h16" />`),
  settings: iconSvg(`<path d="M9.7 4.1a2.3 2.3 0 0 1 4.6 0 2.3 2.3 0 0 0 3.3 1.9 2.3 2.3 0 0 1 2.3 4 2.3 2.3 0 0 0 0 3.8 2.3 2.3 0 0 1-2.3 4 2.3 2.3 0 0 0-3.3 1.9 2.3 2.3 0 0 1-4.6 0 2.3 2.3 0 0 0-3.3-1.9 2.3 2.3 0 0 1-2.3-4 2.3 2.3 0 0 0 0-3.8 2.3 2.3 0 0 1 2.3-4 2.3 2.3 0 0 0 3.3-1.9" /><circle cx="12" cy="12" r="3" />`),
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
    button {
      border: 1px solid var(--line);
      border-radius: 0.4rem;
      background: var(--panel-2);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      min-height: 2.35rem;
      padding: 0.4rem 0.72rem;
    }
    button:hover {
      border-color: var(--accent);
      color: var(--accent);
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
    .typewriter-toggle.is-active {
      border-color: var(--accent);
      color: var(--accent);
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
    .writer.is-typewriter {
      align-items: flex-start;
      padding-top: 1.5rem;
    }
    .writer.is-typewriter .paper {
      width: min(44rem, 100%);
    }
    .writer.is-typewriter .body-input {
      min-height: calc(100vh - 11rem);
      padding-top: 34vh;
      padding-bottom: 42vh;
      border-left: 1px solid transparent;
      overflow: auto;
      resize: vertical;
    }
    .settings {
      border-left: 1px solid var(--line);
      background: var(--panel);
      padding: 1rem;
      overflow: auto;
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
    .bottom-right {
      position: fixed;
      bottom: 1.2rem;
      z-index: 20;
      display: flex;
      gap: 0.55rem;
    }
    .bottom-right {
      right: 1.2rem;
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
    .reference-theme .writer.is-typewriter .body-input {
      min-height: calc(100vh - 17rem);
      padding-top: 30vh;
      padding-bottom: 36vh;
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
        padding: 2.4rem 1.5rem calc(7rem + env(safe-area-inset-bottom));
      }
      .formatbar {
        justify-content: flex-start;
        padding: 0 0.85rem;
        position: sticky;
        top: var(--topbar-height);
        z-index: 9;
      }
      .formatbar::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 2.25rem;
        pointer-events: none;
        background: linear-gradient(to right, rgba(0, 0, 0, 0), var(--bg));
      }
      .formatbar-inner {
        width: max-content;
        justify-content: flex-start;
      }
      .formatbar button {
        width: 2.75rem;
        min-width: 2.75rem;
        min-height: 2.75rem;
      }
      .topbar {
        align-items: flex-start;
        height: auto;
        flex-direction: column;
        padding: 0.85rem 1rem;
        z-index: 12;
      }
      .reference-theme .topbar {
        height: auto;
        padding: 0.85rem 1rem;
      }
      .reference-theme .saved-pill {
        max-width: calc(100vw - 8rem);
      }
      .top-actions {
        width: 100%;
      }
      .top-actions button {
        flex: 1;
      }
      body.no-preview .topbar {
        align-items: center;
        flex-direction: row;
        gap: 0.75rem;
      }
      body.no-preview .brand {
        flex: 1 1 auto;
      }
      body.no-preview .top-actions {
        flex: 0 0 auto;
        width: auto;
      }
      body.no-preview .top-actions button {
        min-width: min(10.5rem, 45vw);
      }
      .top-actions button[hidden] {
        display: none;
      }
      .bottom-right {
        right: 1rem;
        bottom: calc(0.85rem + env(safe-area-inset-bottom));
      }
      .bottom-right .utility-button {
        min-height: 2.75rem;
      }
      body.is-writing .bottom-right .utility-button {
        width: 2.75rem;
        padding: 0;
        border-radius: 999px;
        opacity: 0.86;
      }
      body.is-writing .bottom-right .utility-button span {
        display: none;
      }
      body.settings-open .bottom-right {
        display: none;
      }
      .reference-theme .settings {
        inset: auto 0 0 0;
        width: 100%;
        max-height: min(72vh, 34rem);
        border-right: 0;
        border-bottom: 0;
        border-left: 0;
        border-radius: 1rem 1rem 0 0;
        padding: 1rem 1rem calc(1rem + env(safe-area-inset-bottom));
        box-shadow: 0 -1rem 3rem rgba(0, 0, 0, 0.24);
      }
      .reference-theme .writer.is-typewriter {
        padding-top: 1rem;
      }
      .reference-theme .writer.is-typewriter .body-input {
        min-height: calc(100vh - 13rem);
        padding-top: 20vh;
        padding-bottom: 28vh;
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
      <button type="button" id="open-site">Preview</button>
      <button type="button" class="primary" id="save">Continue</button>
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
      <span class="divider"></span>
      <span class="toolbar-group" aria-label="Insert">
        <button type="button" id="toolbar-image" title="Image" aria-label="Image">${ICONS.image}</button>
      </span>
      <span class="divider"></span>
      <span class="toolbar-group" aria-label="View">
        <button type="button" id="typewriter" class="typewriter-toggle" title="Typewriter" aria-label="Typewriter">${ICONS.typewriter}</button>
      </span>
    </div>
  </nav>
  <main class="shell">
    <section class="writer">
      <article class="paper">
        <textarea class="title-input" id="title" rows="2" placeholder="Title"></textarea>
        <input class="subtitle-input" id="summary" type="text" placeholder="Add a subtitle..." />
        <textarea class="body-input" id="body" placeholder="Start writing..."></textarea>
      </article>
    </section>
    <aside class="settings" id="settings" hidden>
      <div class="settings-header">
        <h2>Post Settings</h2>
        <button type="button" class="settings-close" id="settings-close" aria-label="Close settings">&times;</button>
      </div>
      <label class="field" id="notebook-field">
        <span>Notebook</span>
        <select id="notebook"></select>
      </label>
      <label class="field">
        <span>Slug</span>
        <input id="slug" type="text" />
      </label>
      <label class="field">
        <span>Date</span>
        <input id="date" type="date" />
      </label>
      <label class="field">
        <span>Tags</span>
        <input id="tags" type="text" placeholder="ensayo, politica" />
      </label>
      <label class="field">
        <span>Editor font size</span>
        <select id="editor-font-size">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label class="check">
        <input id="draft" type="checkbox" />
        <span>Draft</span>
      </label>
      <label class="check">
        <input id="hidden" type="checkbox" />
        <span>Hidden</span>
      </label>
      <div class="utility">
        <input id="image-file" type="file" accept="image/*" hidden />
        <div class="path" id="path"></div>
      </div>
    </aside>
  </main>
  <div class="bottom-right">
    <button type="button" class="utility-button" id="settings-button" aria-controls="settings" aria-expanded="false" aria-label="Open settings">${ICONS.settings}<span>Settings</span></button>
  </div>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode") || "new";
      var kind = params.get("kind") || "post";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var siteOrigin = params.get("site") || ${JSON.stringify(SITE_ORIGIN)};
      var sourcePath = params.get("path") || "";
      var preferredNotebook = params.get("notebook") || "";
      var frontMatter = {};
      var savedUrl = "";
      var slugTouched = false;
      var editorSizeStorageKey = "authorEditorFontSize";
      var savedSnapshot = null;
      var saveInProgress = false;
      var saveFailed = false;
      var bodyHistory = [];
      var bodyHistoryIndex = -1;
      var restoringBodyHistory = false;
      var els = {
        status: document.getElementById("status"),
        savedPill: document.getElementById("saved-pill"),
        writer: document.querySelector(".writer"),
        back: document.getElementById("back"),
        title: document.getElementById("title"),
        body: document.getElementById("body"),
        settings: document.getElementById("settings"),
        settingsButton: document.getElementById("settings-button"),
        settingsClose: document.getElementById("settings-close"),
        toolbarImage: document.getElementById("toolbar-image"),
        notebookField: document.getElementById("notebook-field"),
        notebook: document.getElementById("notebook"),
        slug: document.getElementById("slug"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        editorFontSize: document.getElementById("editor-font-size"),
        summary: document.getElementById("summary"),
        draft: document.getElementById("draft"),
        hidden: document.getElementById("hidden"),
        typewriter: document.getElementById("typewriter"),
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
        bind();
        syncSettingsState();
        syncWritingState();
        syncPreviewButton();
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
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
          resizeTextarea(els.title);
          markContentEdited();
        });
        els.slug.addEventListener("input", function () {
          slugTouched = true;
          markContentEdited();
        });
        els.notebook.addEventListener("change", function () {
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
          markContentEdited();
        });
        els.save.addEventListener("click", save);
        els.typewriter.addEventListener("click", toggleTypewriter);
        els.editorFontSize.addEventListener("change", function () {
          applyEditorSize(els.editorFontSize.value);
        });
        els.body.addEventListener("input", function () {
          if (!restoringBodyHistory) {
            recordBodyHistory();
          }
          resizeTextarea(els.body);
          centerTypewriterLine();
        });
        [els.title, els.summary, els.body].forEach(function (input) {
          input.addEventListener("focus", syncWritingState);
          input.addEventListener("blur", function () {
            window.setTimeout(syncWritingState, 0);
          });
        });
        [els.summary, els.date, els.tags].forEach(function (input) {
          input.addEventListener("input", markContentEdited);
        });
        [els.draft, els.hidden].forEach(function (input) {
          input.addEventListener("change", markContentEdited);
        });
        els.body.addEventListener("click", centerTypewriterLine);
        els.body.addEventListener("keyup", centerTypewriterLine);
        window.addEventListener("resize", resizeEditorFields);
        els.openSite.addEventListener("click", function () {
          var url = previewUrl();
          if (!url) {
            return;
          }
          window.open(url, "_blank", "noopener");
        });
        els.settingsButton.addEventListener("click", function () {
          toggleSettings();
        });
        els.settingsClose.addEventListener("click", closeSettings);
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
        els.date.value = today();
        els.draft.checked = true;
        els.hidden.checked = false;
        savedSnapshot = null;
        saveInProgress = false;
        saveFailed = false;
        setStatus("New post");
        resetBodyHistory();
        syncSavedState();
        syncPreviewButton();
        resizeEditorFields();
        els.title.focus();
      }

      function loadExisting() {
        return request("/api/page?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          frontMatter = payload.frontMatter || {};
          savedUrl = payload.url || "";
          els.notebookField.hidden = true;
          els.title.value = frontMatter.title || "";
          els.slug.value = "";
          els.slug.disabled = true;
          els.date.value = frontMatter.date || today();
          els.tags.value = (frontMatter.tags || []).join(", ");
          els.summary.value = frontMatter.summary || frontMatter.description || "";
          els.draft.checked = frontMatter.draft === true;
          els.hidden.checked = frontMatter.hidden === true;
          els.body.value = payload.body || "";
          els.path.textContent = payload.path || "";
          savedSnapshot = currentSaveSnapshot();
          saveInProgress = false;
          saveFailed = false;
          setStatus("Editing " + (payload.path || ""));
          resetBodyHistory();
          syncSavedState();
          syncPreviewButton();
          resizeEditorFields();
          els.body.focus();
        });
      }

      function save() {
        els.save.disabled = true;
        setStatus("Saving");

        var action = mode === "edit" ? saveExisting() : createPost();

        action.then(function (result) {
          savedUrl = result.url || savedUrl;
          sourcePath = result.path || sourcePath;
          els.path.textContent = sourcePath;
          mode = "edit";
          els.notebookField.hidden = true;
          els.slug.disabled = true;
          savedSnapshot = currentSaveSnapshot();
          setStatus("Saved");
          syncPreviewButton();
          goToSavedPage();
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          els.save.disabled = false;
        });
      }

      function createPost() {
        return postJson("/api/create-post", {
          notebook: els.notebook.value,
          title: els.title.value,
          slug: els.slug.value,
          date: els.date.value,
          tags: els.tags.value,
          summary: els.summary.value,
          draft: els.draft.checked,
          hidden: els.hidden.checked,
          body: els.body.value || "# " + els.title.value + "\\n",
        });
      }

      function saveExisting() {
        var nextFrontMatter = Object.assign({}, frontMatter, {
          title: els.title.value,
          date: els.date.value,
        });

        if (els.draft.checked) {
          nextFrontMatter.draft = true;
        } else {
          delete nextFrontMatter.draft;
        }

        if (els.hidden.checked) {
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
          postJson("/api/upload-image", {
            name: file.name,
            alt: file.name.replace(/\\.[^.]+$/, ""),
            data: reader.result,
          }).then(function (result) {
            insertAtCursor(els.body, result.markdown + "\\n");
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
        recordBodyHistory();
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
        centerTypewriterLine();
        recordBodyHistory();
      }

      function applyFormat(format) {
        if (format === "undo") {
          undoBody();
          return;
        }
        if (format === "redo") {
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
        if (format === "align") {
          toggleTypewriter();
          return;
        }
        setStatus("Use Markdown for " + format);
      }

      function wrapSelection(before, after) {
        recordBodyHistory();
        var start = els.body.selectionStart || 0;
        var end = els.body.selectionEnd || 0;
        var selected = els.body.value.slice(start, end) || "text";
        replaceBodyRange(start, end, before + selected + after, start + before.length, start + before.length + selected.length);
        resizeTextarea(els.body);
        centerTypewriterLine();
        recordBodyHistory();
      }

      function prefixCurrentLine(prefix) {
        recordBodyHistory();
        var cursor = els.body.selectionStart || 0;
        var lineStart = els.body.value.lastIndexOf("\\n", cursor - 1) + 1;
        replaceBodyRange(lineStart, lineStart, prefix, cursor + prefix.length, cursor + prefix.length);
        resizeTextarea(els.body);
        centerTypewriterLine();
        recordBodyHistory();
      }

      function replaceBodyRange(start, end, text, selectionStart, selectionEnd) {
        els.body.value = els.body.value.slice(0, start) + text + els.body.value.slice(end);
        els.body.focus();
        els.body.selectionStart = selectionStart;
        els.body.selectionEnd = selectionEnd;
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
        centerTypewriterLine();
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

      function toggleTypewriter() {
        var active = !els.writer.classList.contains("is-typewriter");
        els.writer.classList.toggle("is-typewriter", active);
        els.typewriter.classList.toggle("is-active", active);
        resizeEditorFields();
        centerTypewriterLine();
      }

      function toggleSettings() {
        if (els.settings.hidden) {
          openSettings();
          return;
        }
        closeSettings();
      }

      function openSettings() {
        els.settings.hidden = false;
        syncSettingsState();
      }

      function closeSettings() {
        els.settings.hidden = true;
        syncSettingsState();
      }

      function syncSettingsState() {
        var open = !els.settings.hidden;
        document.body.classList.toggle("settings-open", open);
        els.settingsButton.setAttribute("aria-expanded", String(open));
        els.settingsButton.setAttribute("aria-label", open ? "Close settings" : "Open settings");
      }

      function syncWritingState() {
        var active = document.activeElement;
        document.body.classList.toggle("is-writing", active === els.title || active === els.summary || active === els.body);
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
        if (textarea === els.body && els.writer.classList.contains("is-typewriter")) {
          textarea.style.height = "";
          return;
        }

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }

      function centerTypewriterLine() {
        if (!els.writer.classList.contains("is-typewriter")) {
          return;
        }

        window.requestAnimationFrame(function () {
          var computed = window.getComputedStyle(els.body);
          var lineHeight = parseFloat(computed.lineHeight) || 32;
          var cursor = els.body.selectionStart || 0;
          var line = els.body.value.slice(0, cursor).split("\\n").length - 1;
          var target = Math.max(0, (line * lineHeight) - (els.body.clientHeight / 2) + lineHeight);
          els.body.scrollTop = target;
        });
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
          draft: els.draft.checked,
          hidden: els.hidden.checked,
          body: els.body.value,
        });
      }

      function syncSavedState() {
        if (saveInProgress) {
          setSavePill("saving", "Saving");
          return;
        }
        if (saveFailed) {
          setSavePill("error", "Error");
          return;
        }
        if (savedSnapshot && currentSaveSnapshot() === savedSnapshot) {
          setSavePill("saved", "Saved");
          return;
        }
        setSavePill("unsaved", "Unsaved");
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
