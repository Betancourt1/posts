import assert from "node:assert/strict";
import test from "node:test";
import { onRequestPost } from "../src/lib/writing-preview.mjs";
import { invokeAuthorPagesFunction } from "../src/lib/pages-function-adapter.mjs";

function request(payload) {
  return new Request("https://example.com/admin/api/preview", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
  });
}

test("unsaved preview shares math, code, diagram and media rendering without storage", async () => {
  const response = await onRequestPost({ request: request({
    title: "Preview", lang: "es", theme: "light",
    sourcePath: "content_es/posts/2026/septiembre/example.md",
    body: "$x^2$\n\n```python\nprint(42)\n```\n\n```mermaid\nflowchart LR\nA --> B\n```\n\n![Layers](./layers.svg)",
  }) });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { html } = await response.json();
  assert.match(html, /lang="es" data-theme="light"/);
  assert.match(html, /<base href="https:\/\/example.com\/es\/posts\/2026\/septiembre\/example\/">/);
  assert.match(html, /class="katex"/);
  assert.match(html, /hljs-built_in/);
  assert.match(html, /data-mermaid/);
  assert.match(html, /src="\.\/layers.svg"/);
  assert.match(html, /src="https:\/\/example.com\/js\/technical-content.js"/);
});

test("preview escapes title and rejects active Markdown HTML", async () => {
  const response = await onRequestPost({ request: request({
    title: '</title><script>alert("title")</script>',
    body: '<script>alert("body")</script>\n\n![x](javascript:alert)\n\n```interactive\n{"src":"/visuals/model.html","title":"Model"}\n```',
  }) });
  const { html } = await response.json();
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /raw HTML omitted/);
  assert.doesNotMatch(html, /<script>alert|src="javascript:/);
  assert.match(html, /sandbox="allow-scripts"/);
});

test("preview rejects invalid requests and remains behind author authentication", async () => {
  assert.equal((await onRequestPost({ request: request({ body: null }) })).status, 400);
  const response = await invokeAuthorPagesFunction(onRequestPost, {
    request: request({ body: "Draft" }),
    env: { CF_ACCESS_DOMAIN: "https://example.cloudflareaccess.com", CF_ACCESS_AUD: "audience", AUTHOR_EMAIL: "author@example.com" },
  });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
