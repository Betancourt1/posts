import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { hasUsableCoverDimensions } from "../scripts/verify-book-covers.mjs";
import test from "node:test";

import {
  BOOK_BATCH_SIZE,
  bookMoreLabel,
  nextBookBatch,
} from "../client/books.js";
import { previewBookCoverUrl } from "../src/components/_utils.js";

const booksPath = new URL("../src/components/Books.astro", import.meta.url);
const bookRowPath = new URL("../src/components/BookRow.astro", import.meta.url);
const layoutPath = new URL("../src/layouts/SiteLayout.astro", import.meta.url);
const siteCssPath = new URL("../../static/css/site.css", import.meta.url);
const booksContentPath = new URL("../../content_en/books/", import.meta.url);

test("book cover verifier rejects placeholder dimensions", () => {
  assert.equal(hasUsableCoverDimensions({ width: 1, height: 1 }), false);
  assert.equal(hasUsableCoverDimensions({ width: 100, height: 100 }), true);
});

test("uses provider thumbnails only for book preview images", () => {
  assert.equal(
    previewBookCoverUrl("https://covers.openlibrary.org/b/isbn/9788433901828-L.jpg?default=false"),
    "https://covers.openlibrary.org/b/isbn/9788433901828-M.jpg?default=false",
  );
  assert.equal(
    previewBookCoverUrl("https://is1-ssl.mzstatic.com/image/thumb/example/cover.png/600x600bb.jpg"),
    "https://is1-ssl.mzstatic.com/image/thumb/example/cover.png/120x180bb.jpg",
  );
  assert.equal(
    previewBookCoverUrl("https://images-na.ssl-images-amazon.com/images/P/9788412943139.01.LZZZZZZZ.jpg"),
    "https://images-na.ssl-images-amazon.com/images/P/9788412943139.01._SL120_.jpg",
  );
  assert.equal(
    previewBookCoverUrl("https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/123i/456.jpg"),
    "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/123i/456._SX120_.jpg",
  );
  assert.equal(previewBookCoverUrl("/uploads/cover.jpg"), "/uploads/cover.jpg");
  assert.equal(previewBookCoverUrl("https://example.com/cover.jpg"), "https://example.com/cover.jpg");
  assert.equal(previewBookCoverUrl("https://EXAMPLE.com/a%2fb.jpg"), "https://EXAMPLE.com/a%2fb.jpg");
  assert.equal(
    previewBookCoverUrl("https://covers.openlibrary.org/b/isbn/example-X.jpg?size=%2f"),
    "https://covers.openlibrary.org/b/isbn/example-X.jpg?size=%2f",
  );
  assert.equal(previewBookCoverUrl("not a URL"), "not a URL");
});

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
  assert.match(bookRow, /src=\{previewBookCoverUrl\(book\.image\)\}/);
  assert.match(bookRow, /loading=\{initiallyHidden \? "lazy" : "eager"\}/);
  assert.match(layout, /isBooks[\s\S]*type="module" src="\/js\/books\.js"/);
  assert.match(css, /\.book-shelf-row\[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(css, /\.book-shelf-more-button:focus-visible/);
  assert.match(css, /\.book-cover img/);
  assert.doesNotMatch(css, /\.book-shelf-more summary|\.book-shelf-more:not\(\[open\]\)/);
});

test("every registered book has a direct HTTPS cover and accessible image text", async () => {
  const names = (await readdir(booksContentPath))
    .filter((name) => name.endsWith(".md") && name !== "_index.md");
  assert.equal(names.length, 98);

  for (const name of names) {
    const markdown = await readFile(new URL(name, booksContentPath), "utf8");
    assert.match(markdown, /^image: "https:\/\/.+"$/m, name);
    assert.match(markdown, /^image_alt: ".+"$/m, name);
  }
});
