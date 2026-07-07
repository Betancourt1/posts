import { authorEditorHtml } from "../_lib/editor-template.js";
import { htmlResponse } from "../_lib/http.js";

export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;

  return htmlResponse(authorEditorHtml({
    siteOrigin: origin,
    assetOrigin: origin,
    apiBase: "/admin/api",
  }));
}
