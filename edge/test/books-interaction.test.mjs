import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import {
  BOOK_BATCH_SIZE,
  bookMoreLabel,
  nextBookBatch,
} from "../client/books.js";

const booksPath = new URL("../src/components/Books.astro", import.meta.url);
const bookRowPath = new URL("../src/components/BookRow.astro", import.meta.url);
const layoutPath = new URL("../src/layouts/SiteLayout.astro", import.meta.url);
const siteCssPath = new URL("../../static/css/site.css", import.meta.url);
const booksContentPath = new URL("../../content_en/books/", import.meta.url);

test("reveals books in independent batches of six", () => {
  assert.equal(BOOK_BATCH_SIZE, 6);
  assert.deepEqual(nextBookBatch(13), {
    revealCount: 6,
    nextRemaining: 7,
    nextLabelCount: 6,
  });
  assert.deepEqual(nextBookBatch(5), {
    revealCount: 5,
    nextRemaining: 0,
    nextLabelCount: 0,
  });

  const firstShelf = nextBookBatch(8);
  const secondShelf = nextBookBatch(77);
  assert.equal(firstShelf.nextRemaining, 2);
  assert.equal(secondShelf.nextRemaining, 71);
});

test("localizes the next batch label", () => {
  assert.equal(bookMoreLabel("Show {count} more", 6), "Show 6 more");
  assert.equal(bookMoreLabel("Show {count} more", 2), "Show 2 more");
  assert.equal(bookMoreLabel("Mostrar {count} más", 6), "Mostrar 6 más");
});

test("renders hidden rows and a progressive button for each shelf", async () => {
  const [books, bookRow, layout, css] = await Promise.all([
    readFile(booksPath, "utf8"),
    readFile(bookRowPath, "utf8"),
    readFile(layoutPath, "utf8"),
    readFile(siteCssPath, "utf8"),
  ]);

  assert.match(books, /data-book-shelf/);
  assert.match(books, /remainingBooks\.map[\s\S]*initiallyHidden/);
  assert.match(books, /data-book-more/);
  assert.match(books, /Math\.min\(batchSize, remainingBooks\.length\)/);
  assert.doesNotMatch(books, /<details|<summary/);
  assert.match(bookRow, /data-book-extra=\{initiallyHidden/);
  assert.match(bookRow, /hidden=\{initiallyHidden\}/);
  assert.match(bookRow, /book\.image/);
  assert.match(bookRow, /loading="lazy"/);
  assert.match(layout, /isBooks[\s\S]*type="module" src="\/js\/books\.js"/);
  assert.match(css, /\.book-shelf-row\[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(css, /\.book-shelf-more-button:focus-visible/);
  assert.match(css, /\.book-cover img/);
  assert.doesNotMatch(css, /\.book-shelf-more summary|\.book-shelf-more:not\(\[open\]\)/);
});

test("every registered book has a direct HTTPS cover and accessible image text", async () => {
  const names = (await readdir(booksContentPath))
    .filter((name) => name.endsWith(".md") && name !== "_index.md");
  assert.equal(names.length, 97);

  for (const name of names) {
    const markdown = await readFile(new URL(name, booksContentPath), "utf8");
    assert.match(markdown, /^image: "https:\/\/.+"$/m, name);
    assert.match(markdown, /^image_alt: ".+"$/m, name);
  }
});
