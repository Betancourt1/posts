import { writingEditorHtml } from "./writing-editor-template.js";
import { postEditorController } from "./post-editor-controller.js";

export function postEditorHtml(options = {}) {
  return writingEditorHtml({ ...options, editorController: postEditorController });
}
