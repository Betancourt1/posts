import assert from "node:assert/strict";
import test from "node:test";
import { imageEditorController } from "./image-editor-controller.js";
import { notebookEditorController } from "./notebook-editor-controller.js";
import { postEditorController } from "./post-editor-controller.js";

test("editor controllers expose mutually exclusive capabilities", () => {
  assert.equal(notebookEditorController.kind, "notebook");
  assert.equal(notebookEditorController.arenaEligible, false);
  assert.equal(notebookEditorController.requiresImage, false);

  assert.equal(postEditorController.kind, "post");
  assert.equal(postEditorController.arenaEligible, true);
  assert.equal(postEditorController.requiresImage, false);

  assert.equal(imageEditorController.kind, "image");
  assert.equal(imageEditorController.arenaEligible, true);
  assert.equal(imageEditorController.requiresImage, true);
});

test("editor controller contracts are immutable", () => {
  assert.equal(Object.isFrozen(notebookEditorController), true);
  assert.equal(Object.isFrozen(postEditorController), true);
  assert.equal(Object.isFrozen(imageEditorController), true);
});
