import { writingEditorHtml } from "./writing-editor-template.js";

export function postEditorHtml(options = {}) {
  return writingEditorHtml({ ...options, editorKind: "post" });
}
