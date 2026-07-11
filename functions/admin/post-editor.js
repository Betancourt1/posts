import { postEditorHtml } from "../_lib/post-editor-template.js";
import { htmlResponse } from "../_lib/http.js";

export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return htmlResponse(postEditorHtml({
    siteOrigin: `${origin}/admin`,
    assetOrigin: origin,
    apiBase: "/admin/api",
  }));
}
