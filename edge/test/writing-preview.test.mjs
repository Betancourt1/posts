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
  const { html, bodyHtml } = await response.json();
  assert.match(html, /lang="es" data-theme="light"/);
  assert.equal(typeof bodyHtml, "string");
  assert.ok(html.includes(bodyHtml), "the HTML view shows exactly the rendered article body");
  assert.match(bodyHtml, /class="katex"/);
  assert.doesNotMatch(bodyHtml, /<html|<head|site\.css/);
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

test("blog previews include the automatic outline for new and saved drafts without publishing", async () => {
  for (const lang of ["en", "es"]) {
    for (const sourcePath of [null, `content_${lang}/posts/2026/septiembre/draft.md`]) {
      const response = await onRequestPost({ request: request({
        title: "Draft", lang, section: "posts", sourcePath, frontMatter: { draft: true },
        body: "## One section\n\nA short draft.",
      }) });
      const { html, bodyHtml } = await response.json();
      assert.match(html, /class="article-outline" data-min-headings="1" data-preview="true"/);
      assert.ok(html.includes(lang === "es" ? "En este artículo" : "In this article"));
      assert.match(html, /src="https:\/\/example.com\/js\/article-outline.js"/);
      assert.doesNotMatch(bodyHtml, /article-outline/);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  }
  for (const payload of [
    { sourcePath: "content_en/posts/_index.md" },
    { section: "", sourcePath: "content_en/posts/_index.md" },
    { section: "", sourcePath: null },
    { sourcePath: "content_es/zettelkasten/example.md" },
  ]) {
    const response = await onRequestPost({ request: request({ ...payload, body: "## Section\n\nText." }) });
    assert.doesNotMatch((await response.json()).html, /article-outline/);
  }
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
