import { editorCoreClientScript } from "../_lib/editor-core-client.js";

export function onRequestGet() {
  return new Response(editorCoreClientScript, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/javascript; charset=utf-8",
    },
  });
}
