import assert from "node:assert/strict";
import test from "node:test";
import { contentExcerpt } from "../src/lib/content-excerpt.mjs";

test("list excerpts prefer summaries, remove a repeated title, and end at a word boundary", () => {
  assert.equal(contentExcerpt({ title: "Title", summary: "Chosen summary", bodyText: "Title Other text" }), "Chosen summary");
  assert.equal(contentExcerpt({ title: "Title", bodyMarkdown: "# Title\n\nUseful introduction.", bodyText: "Title\nUseful introduction." }), "Useful introduction.");
  assert.equal(contentExcerpt({ title: "The future", bodyMarkdown: "The future will be different.", bodyText: "The future will be different." }), "The future will be different.");
  const excerpt = contentExcerpt({ title: "Title", bodyText: "A readable excerpt. ".repeat(30) });
  assert.ok(excerpt.length <= 240);
  assert.match(excerpt, /(?:A|readable|excerpt\.)…$/);
});

test("book excerpts use reader-facing metadata instead of catalog fields in either locale", () => {
  for (const [lang, expected] of [["en", "Ada · Now reading"], ["es", "Ada · Leyendo ahora"]]) {
    assert.equal(contentExcerpt({ section: "books", lang, frontMatter: { book_author: "Ada", book_status: "currently-reading" }, bodyText: "ISBN: 123 Pages: 300" }), expected);
  }
});
