import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { editorCoreClientScript } from "./editor-core-client.js";
import { onRequestGet as getEditorCore } from "../admin/editor-core.js";

const source = editorCoreClientScript;

function loadCore(fetch = () => Promise.reject(new Error("Unexpected fetch"))) {
  const context = {
    Date,
    Error,
    Intl,
    JSON,
    Object,
    RegExp,
    String,
    fetch,
    window: {},
  };
  vm.runInNewContext(source, context);
  return context.window.EditorCore;
}

test("EditorCore resolves API paths for production and local editors", () => {
  const core = loadCore();
  assert.equal(core.requestPath("/admin/api", "/api/notebooks"), "/admin/api/notebooks");
  assert.equal(core.requestPath("/admin/api", "/admin/api/notebooks"), "/admin/api/notebooks");
  assert.equal(core.requestPath("/api", "/notebooks"), "/api/notebooks");
});

test("EditorCore owns content navigation rules", () => {
  const core = loadCore();
  assert.equal(core.notebookPathForContent("content_es/posts/2026/julio/nota.md"), "content_es/posts");
  assert.equal(core.notebookPathForContent("content_es/fotografia/mariposa.md"), "content_es/fotografia");
  assert.equal(
    core.adminNotebookUrl("https://example.com/admin", "content_es/fotografia"),
    "https://example.com/admin/es/fotografia/",
  );
  assert.equal(core.publicContentUrl("https://example.com/admin", "/es/fotografia/mariposa/"), "https://example.com/es/fotografia/mariposa/");
});

test("EditorCore shares deterministic text helpers", () => {
  const core = loadCore();
  assert.equal(core.slugify("Árbol y Flor", "-"), "arbol-y-flor");
  assert.equal(core.slugify("Árbol y Flor", "_"), "arbol_y_flor");
  assert.deepEqual(Array.from(core.splitTags("#foto, macro naturaleza")), ["foto", "macro", "naturaleza"]);
});

test("EditorCore API client rejects application errors", async () => {
  const requests = [];
  const core = loadCore(async (url, options) => {
    requests.push({ url, options });
    return {
      ok: true,
      json: async () => ({ error: "fallo controlado" }),
    };
  });
  const client = core.create({ apiBase: "/admin/api", siteOrigin: "https://example.com/admin" });

  await assert.rejects(client.postJson("/api/save-page", { path: "fixture.md" }), /fallo controlado/);
  assert.equal(requests[0].url, "/admin/api/save-page");
  assert.equal(requests[0].options.method, "POST");
});

test("EditorCore is served as a protected admin asset", async () => {
  const response = getEditorCore();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type"), /text\/javascript/);
  assert.equal(await response.text(), editorCoreClientScript);
});
