import { authorEditorHtml } from "./editor-template.js";

export function notebookEditorHtml(options = {}) {
  return authorEditorHtml({ ...options, editorKind: "notebook" });
}
