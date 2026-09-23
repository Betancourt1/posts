import { renderMarkdown, routeForSource } from "./content-projector.mjs";
import { errorResponse, jsonResponse, readJson } from "../../../functions/_lib/http.js";

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export async function onRequestPost({ request }) {
  try {
    const payload = await readJson(request);
    if (typeof payload.body !== "string") throw new Error("El contenido debe ser Markdown.");
    const lang = payload.lang === "es" ? "es" : "en";
    const theme = payload.theme === "light" ? "light" : "dark";
    const origin = new URL(request.url).origin;
    const path = payload.sourcePath
      ? routeForSource(payload.sourcePath, payload.frontMatter || {})
      : lang === "es" ? "/es/" : "/";
    const { bodyHtml } = renderMarkdown(payload.body, path);
    const title = escapeHtml(payload.title || "");
    const html = `<!doctype html><html lang="${lang}" data-theme="${theme}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<base href="${escapeHtml(new URL(path, origin).href)}"><title>${title}</title>
<link rel="stylesheet" href="${origin}/css/site.css">
<link rel="stylesheet" href="${origin}/vendor/katex/katex.min.css">
<style>body{padding:24px;margin:0}main{max-width:68ch;margin:auto}.post-body{max-width:100%}</style>
</head><body><main><h1>${title}</h1><div class="post-body">${bodyHtml}</div></main>
<script type="module" src="${origin}/js/technical-content.js"></script></body></html>`;
    // bodyHtml feeds the editor's read-only HTML view; it is shown as text, never injected.
    return jsonResponse({ html, bodyHtml });
  } catch (error) {
    return errorResponse(error);
  }
}
