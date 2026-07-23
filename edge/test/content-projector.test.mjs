import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  parseMarkdown,
  projectSource,
  renderMarkdown,
  renderMarkdownSummary,
  routeForSource,
} from "../src/lib/content-projector.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

async function fixture(relativePath) {
  return readFile(path.join(REPO_ROOT, relativePath), "utf8");
}

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

test("parses nested YAML while normalizing BOM and Windows newlines", () => {
  const parsed = parseMarkdown(
    '\uFEFF---\r\ntitle: "Nested"\r\ndraft: false\r\narena_blocks:\r\n  - src: /one.jpg\r\n    block_id: "17"\r\n---\r\n\r\nHello\r\n',
  );

  assert.equal(parsed.frontMatter.title, "Nested");
  assert.deepEqual(parsed.frontMatter.arena_blocks, [
    { src: "/one.jpg", block_id: "17" },
  ]);
  assert.equal(parsed.bodyMarkdown, "Hello\n");
  assert.doesNotMatch(parsed.normalizedMarkdown, /\r|\uFEFF/);
});

test("treats legacy Markdown without front matter as body content", () => {
  const parsed = parseMarkdown("Legacy title\r\n\r\nText");

  assert.deepEqual(parsed.frontMatter, {});
  assert.equal(parsed.bodyMarkdown, "Legacy title\n\nText");
});

test("renders taxonomy summaries", () => {
  assert.equal(
    renderMarkdownSummary('Quote "one" and escaped \\"two\\"... [note](/note/)'),
    '<p>Quote “one” and escaped &quot;two&quot;… <a href="/note/">note</a>\n</p>\n',
  );

  const automatic = renderMarkdownSummary(
    `# Heading\n\n> ${"summary ".repeat(70).trim()}\n\nThis block is outside the summary.`,
    { wordLimit: 70 },
  );
  assert.match(automatic, /<h1>Heading<\/h1>/);
  assert.match(automatic, /<blockquote>/);
  assert.doesNotMatch(automatic, /outside the summary/);
});

test("derives localized routes, content kinds, and visibility", () => {
  const hidden = projectSource({
    path: "content_es/posts/2026/julio/no_post_secret.md",
    blobSha: "abc123",
    rawMarkdown:
      '---\ntitle: Secreto\ndraft: false\nsearch: true\ntags: [idea, idea, "ética"]\n---\n[Inicio](/es/)\n',
  });
  const document = hidden.documents[0];

  assert.equal(hidden.source.blobSha, "abc123");
  assert.equal(document.documentKey, "content_es/posts/2026/julio/no_post_secret.md::es");
  assert.equal(document.lang, "es");
  assert.equal(document.kind, "page");
  assert.equal(document.section, "posts");
  assert.equal(
    document.translationKey,
    "source:posts/2026/julio/no_post_secret.md",
  );
  assert.equal(document.hidden, true);
  assert.equal(document.draft, false);
  assert.equal(document.searchable, false);
  assert.deepEqual(document.tags, ["idea", "ética"]);
  assert.deepEqual(document.routes, [
    { path: "/es/posts/2026/julio/no_post_secret/", kind: "canonical" },
  ]);
  assert.equal(document.links[0].targetPath, "/es/");

  assert.equal(routeForSource("content_en/_index.md"), "/");
  assert.equal(routeForSource("content_es/lit/_index.md"), "/es/lit/");
  assert.equal(routeForSource("content_en/about/index.md"), "/about/");
  assert.equal(
    routeForSource("content_en/posts/original.md", { slug: "replacement" }),
    "/posts/replacement/",
  );
});

test("preserves nested photo metadata from a real source", async () => {
  const relativePath = "content_es/fotografia/afuera-del-trabajo.md";
  const projected = projectSource({
    path: relativePath,
    rawMarkdown: await fixture(relativePath),
  });
  const document = projected.documents[0];

  assert.equal(document.routes[0].path, "/es/fotografia/afuera-del-trabajo/");
  assert.equal(document.frontMatter.arena_blocks[0].block_id, "47777997");
  assert.equal(document.frontMatter.arena_enabled, true);
  assert.equal(document.hidden, false);
  assert.equal(document.searchable, true);
});

test("localizes aliases and extracts links from Marked tokens", async () => {
  const relativePath = "content_es/lit/alan-moore.md";
  const projected = projectSource({
    path: relativePath,
    rawMarkdown: await fixture(relativePath),
  });
  const document = projected.documents[0];

  assert.deepEqual(document.routes, [
    { path: "/es/lit/alan-moore/", kind: "canonical" },
    { path: "/es/zettelkasten/alan-moore/", kind: "alias" },
  ]);
  assert.equal(document.links.length, 1);
  assert.deepEqual(document.links[0], {
    href: "/zettelkasten/ser-buen-humano-antes-que-buen-escritor/",
    label: "ser buen humano antes que buen escritor",
    targetPath: "/zettelkasten/ser-buen-humano-antes-que-buen-escritor/",
    external: false,
  });
  assert.match(document.bodyHtml, /<blockquote>/);
  assert.match(document.bodyText, /Alan Moore/);
  assert.match(document.bodyText, /Notas\nser buen humano/);

  const rendered = renderMarkdown(
    "[Relative](../two/) and <https://example.com>. ` [Not a link](/ignored/) `",
    "/es/lit/one/",
  );
  assert.deepEqual(rendered.links, [
    {
      href: "../two/",
      label: "Relative",
      targetPath: "/es/lit/two/",
      external: false,
    },
    {
      href: "https://example.com",
      label: "https://example.com",
      targetPath: null,
      external: true,
    },
  ]);
});

test("blocks raw HTML and unsafe Markdown URL schemes", () => {
  const rendered = renderMarkdown(`Before

<script>alert("raw")</script>

[unsafe](jav&#x61;script:alert(1))

![unsafe image](data:text/html,boom)

[safe](https://example.com)
`);

  assert.doesNotMatch(rendered.bodyHtml, /<script|javascript:|data:text\/html/i);
  assert.match(rendered.bodyHtml, /<!-- raw HTML omitted -->/);
  assert.match(rendered.bodyHtml, /<a href="https:\/\/example\.com">safe<\/a>/);
});

test("generates the canonical English book as a matching Spanish document", async () => {
  const relativePath = "content_en/books/nada-que-temer.md";
  const projected = projectSource({
    path: relativePath,
    rawMarkdown: await fixture(relativePath),
  });

  assert.equal(projected.documents.length, 2);
  const [english, spanish] = projected.documents;
  assert.equal(english.routes[0].path, "/books/nada-que-temer/");
  assert.equal(english.generated, false);
  assert.equal(spanish.documentKey, `${relativePath}::es`);
  assert.equal(spanish.routes[0].path, "/es/libros/nada-que-temer/");
  assert.equal(spanish.section, "libros");
  assert.equal(spanish.generated, true);
  assert.equal(spanish.summary, "De Julian Barnes · Leído · 5/5");
  assert.deepEqual(spanish.tags, [
    "libro",
    "leído",
    "ensayo",
    "muerte",
    "religión",
    "memoria",
    "familia",
  ]);
  assert.equal(spanish.frontMatter.source_path, relativePath);
  assert.equal(spanish.frontMatter.source_body, english.bodyMarkdown);
  assert.match(spanish.bodyMarkdown, /\*\*Autor:\*\* Julian Barnes/);
  assert.match(spanish.bodyMarkdown, /## Mi reseña/);
  assert.deepEqual(spanish.links.at(-1), {
    href: "https://www.goodreads.com/book/show/8994891",
    label: "Ver en Goodreads",
    targetPath: null,
    external: true,
  });
});

test("projects the complete repository with the migration count contract", async () => {
  const roots = ["content_en", "content_es"].map((root) => path.join(REPO_ROOT, root));
  const files = (await Promise.all(roots.map(markdownFiles))).flat().sort();
  const projections = await Promise.all(
    files.map(async (absolutePath) => {
      const relativePath = path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
      return projectSource({
        path: relativePath,
        rawMarkdown: await readFile(absolutePath, "utf8"),
      });
    }),
  );
  const documents = projections.flatMap((projection) => projection.documents);
  const routes = documents.flatMap((document) => document.routes);

  assert.equal(files.length, 219);
  assert.equal(documents.length, 316);
  assert.equal(documents.filter((document) => document.searchable).length, 295);
  assert.equal(routes.filter((route) => route.kind === "canonical").length, 316);
  assert.equal(routes.filter((route) => route.kind === "alias").length, 44);
});
