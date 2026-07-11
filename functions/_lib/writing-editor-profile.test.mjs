import assert from "node:assert/strict";
import test from "node:test";
import { writingEditorProfile } from "./writing-editor-profile.js";

test("writing editor profiles keep notebook and post capabilities separate", () => {
  const notebook = writingEditorProfile("notebook");
  const post = writingEditorProfile("post");

  assert.deepEqual(notebook, {
    kind: "notebook",
    notebook: true,
    arenaEligible: false,
    settingsTitle: "Notebook",
    deleteLabel: "Eliminar notebook",
    deleteEndpoint: "/api/delete-notebook",
  });
  assert.deepEqual(post, {
    kind: "post",
    notebook: false,
    arenaEligible: true,
    settingsTitle: "Propiedades",
    deleteLabel: "Eliminar post",
    deleteEndpoint: "/api/delete-page",
  });
});

test("unknown writing editor kinds cannot create a third implicit profile", () => {
  assert.equal(writingEditorProfile("image").kind, "post");
  assert.equal(writingEditorProfile("unknown").kind, "post");
});
