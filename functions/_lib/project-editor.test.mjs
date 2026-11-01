import assert from "node:assert/strict";
import test from "node:test";
import { postEditorHtml } from "./post-editor-template.js";
import { projectCaseSkeleton, projectEditorScript } from "./project-editor.js";

const html = postEditorHtml();

test("project panel keeps its ids and adds namespaced fields without duplicating any editor id", () => {
  for (const id of [
    "project-editor", "project-status", "project-role", "project-period", "project-org", "project-order",
    "project-featured", "project-stack", "project-highlights", "project-highlight-add", "project-rows",
    "project-add", "writing-load", "writing-select", "writing-status", "project-preview", "project-template",
    "project-row", "project-highlight-row",
  ]) assert.equal(html.split(`id="${id}"`).length - 1, 1, id);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], "no duplicated ids in the editor");
  assert.match(html, /#project-editor \[hidden\] \{ display: none !important; \}/);
});

test("project editor is wired into the shared save, snapshot and draft lifecycle", () => {
  assert.match(html, /bindProjectEditor\(markContentEdited, request, function \(\) \{[\s\S]{0,200}\}, \{\s*title: function/);
  assert.match(html, /function markContentEdited\(\) \{\s*saveFailed = false;\s*if \(isProject\(\)\) projectEditor\.sync\(\);/);
  assert.match(html, /projectEditor\.load\(Object\.assign\(projectEditor\.read\(\), stored\.project\)\)/);
  assert.match(html, /insert: function \(markdown\) \{ insertAtCursor\(activeTextArea\(\), markdown\); markContentEdited\(\); \}/);
  assert.match(html, /bodyEmpty: function \(\) \{ return !editorBodyValue\(\)\.trim\(\); \}/);
  assert.match(html, /project: isProject\(\) \? projectEditor\.read\(\) : undefined/);
});

test("project editor script builds its preview from text nodes only", () => {
  assert.doesNotMatch(projectEditorScript, /innerHTML|insertAdjacentHTML|outerHTML/);
  assert.doesNotMatch(projectEditorScript, /\$\{|`/, "source stays safe inside the String.raw editor template");
  assert.doesNotThrow(() => new Function(projectEditorScript));
});

test("case skeleton starts at h2 because the page title is the h1", () => {
  for (const text of Object.values(projectCaseSkeleton)) {
    assert.doesNotMatch(text, /^# /m);
    assert.equal(text.match(/^## /gm).length, 4);
  }
});
