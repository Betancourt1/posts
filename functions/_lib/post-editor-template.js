import { authorEditorHtml } from "./editor-template.js";

export function postEditorHtml(options = {}) {
  return authorEditorHtml({ ...options, editorKind: "post" });
}
