import { writingEditorHtml } from "./writing-editor-template.js";

export function notebookEditorHtml(options = {}) {
  return writingEditorHtml({ ...options, editorKind: "notebook" });
}
