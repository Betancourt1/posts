import { writingEditorHtml } from "./writing-editor-template.js";
import { notebookEditorController } from "./notebook-editor-controller.js";

export function notebookEditorHtml(options = {}) {
  return writingEditorHtml({ ...options, editorController: notebookEditorController });
}
