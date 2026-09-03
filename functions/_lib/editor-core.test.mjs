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
    setTimeout,
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
  assert.deepEqual(Array.from(core.splitTags("#photo, macro nature")), ["photo", "macro", "nature"]);
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

test("EditorCore preserves projection failure details and saved state", async () => {
  const core = loadCore(async () => ({
    ok: false,
    json: async () => ({
      error: "GitHub was updated, but the live content projection failed.",
      projectionFailed: true,
      detail: "D1 unavailable",
      saved: {
        path: "content_en/fotografia/saved.md",
        url: "/fotografia/saved/",
      },
    }),
  }));
  const client = core.create({ apiBase: "/admin/api", siteOrigin: "https://example.com/admin" });

  await assert.rejects(client.postJson("/create-post", {}), (error) => {
    assert.equal(
      error.message,
      "GitHub was updated, but the live content projection failed. D1 unavailable",
    );
    assert.equal(error.projectionFailed, true);
    assert.equal(error.detail, "D1 unavailable");
    assert.equal(error.saved.path, "content_en/fotografia/saved.md");
    assert.equal(error.saved.url, "/fotografia/saved/");
    return true;
  });
});

test("EditorCore waits for both canonical and uncached public state", async () => {
  const statuses = [404, 404, 200, 200];
  const requests = [];
  const core = loadCore(async (url, options) => {
    requests.push({ url, options });
    const status = statuses.shift();
    return { ok: status >= 200 && status < 300, status };
  });
  const client = core.create({ apiBase: "/admin/api", siteOrigin: "https://example.com/admin" });

  const result = await client.waitForPublicState("https://example.com/es/post/", {
    exists: true,
    intervalMs: 0,
    timeoutMs: 1000,
  });

  assert.equal(result.exists, true);
  assert.equal(result.attempts, 2);
  assert.equal(requests.length, 4);
  assert.equal(requests[0].url, "https://example.com/es/post/");
  assert.match(requests[1].url, /author_verify=/);
  assert.equal(requests[0].options.cache, "no-store");
});

test("EditorCore verifies deletion only after both URLs return 404", async () => {
  const statuses = [200, 404, 404, 404];
  const core = loadCore(async () => {
    const status = statuses.shift();
    return { ok: status >= 200 && status < 300, status };
  });

  const result = await core.waitForPublicState("https://example.com/es/post/", {
    exists: false,
    intervalMs: 0,
    timeoutMs: 1000,
  });

  assert.equal(result.exists, false);
  assert.equal(result.attempts, 2);
  assert.equal(result.canonicalStatus, 404);
});

test("EditorCore is served as a protected admin asset", async () => {
  const response = getEditorCore();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("content-type"), /text\/javascript/);
  assert.equal(await response.text(), editorCoreClientScript);
});
