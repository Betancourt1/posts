import { authorEditorHtml } from "../_lib/editor-template.js";
import { htmlResponse } from "../_lib/http.js";

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  const origin = url.origin;
  const path = url.searchParams.get("path") || "";

  if (/^content_(es|en)\/fotografia\/.+\.md$/.test(path)) {
    url.pathname = "/admin/image-editor";
    return Response.redirect(url.toString(), 302);
  }

  return htmlResponse(authorEditorHtml({
    siteOrigin: `${origin}/admin`,
    assetOrigin: origin,
    apiBase: "/admin/api",
  }));
}
