import assert from "node:assert/strict";
import test from "node:test";
import {
  contentEditorKind,
  editorPath,
  normalizeEditorKind,
  resolveEditorPath,
} from "./editor-routing.js";

test("contentEditorKind gives notebooks priority over their section", () => {
  assert.equal(contentEditorKind({
    path: "content_es/fotografia/_index.md",
    kind: "notebook",
  }), "notebook");
  assert.equal(contentEditorKind({
    path: "content_en/fotografia/_index.md",
    kind: "post",
  }), "notebook");
});

test("contentEditorKind separates image posts from writing posts", () => {
  assert.equal(contentEditorKind({ path: "content_es/fotografia/mariposa.md" }), "image");
  assert.equal(contentEditorKind({ path: "content_es/posts/2026/julio/nota.md" }), "post");
  assert.equal(contentEditorKind({
    path: "content_es/proyectos/diagrama.md",
    format: "image",
  }), "image");
});

test("explicit editor kinds are normalized without guessing new values", () => {
  assert.equal(normalizeEditorKind("photo"), "image");
  assert.equal(normalizeEditorKind("NOTEBOOK"), "notebook");
  assert.equal(normalizeEditorKind("unknown"), "");
  assert.equal(editorPath("notebook", "/admin/"), "/admin/notebook-editor");
});

test("resolveEditorPath keeps compatibility URLs deterministic", () => {
  const notebook = new URLSearchParams({
    path: "content_es/fotografia/_index.md",
    kind: "notebook",
  });
  const photo = new URLSearchParams({
    path: "content_es/fotografia/mariposa.md",
    kind: "post",
  });

  assert.equal(resolveEditorPath(notebook, "/admin"), "/admin/notebook-editor");
  assert.equal(resolveEditorPath(photo, "/admin"), "/admin/image-editor");
});
