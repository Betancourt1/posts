import { resolveEditorPath } from "../_lib/editor-routing.js";

export function onRequestGet({ request }) {
  const url = new URL(request.url);
  url.pathname = resolveEditorPath(url.searchParams, "/admin");
  return Response.redirect(url.toString(), 302);
}
