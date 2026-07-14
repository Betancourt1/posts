import assert from "node:assert/strict";
import test from "node:test";
import { isBookContentPath, normalizeBookFrontMatter } from "./book-content.js";

test("book paths are limited to the bilingual book sections", () => {
  assert.equal(isBookContentPath("content_en/books/a-wizard-of-earthsea.md"), true);
  assert.equal(isBookContentPath("content_es/libros/un-mago-de-terramar.md"), true);
  assert.equal(isBookContentPath("content_es/posts/book.md"), false);
});

test("book Markdown derives progress, status, rating, summary, and tags", () => {
  const frontMatter = {
    title: "A Wizard of Earthsea",
    tags: ["book", "to-read", "fantasy"],
  };

  normalizeBookFrontMatter(
    "content_en/books/a-wizard-of-earthsea.md",
    frontMatter,
    [
      "**Author:** Ursula K. Le Guin",
      "**Progress:** 45%",
      "**My rating:** 4/5",
      "",
      "## My review",
      "",
      "Precise and beautiful.",
    ].join("\n"),
  );

  assert.equal(frontMatter.book_author, "Ursula K. Le Guin");
  assert.equal(frontMatter.book_progress, 45);
  assert.equal(frontMatter.book_status, "currently-reading");
  assert.equal(frontMatter.rating, 4);
  assert.equal(frontMatter.summary, "By Ursula K. Le Guin · Reading · 4/5");
  assert.deepEqual(frontMatter.tags, ["book", "currently-reading", "fantasy"]);
  assert.equal(frontMatter.translationKey, "book-a-wizard-of-earthsea");
});

test("Spanish books localize generated tags and support an empty rating", () => {
  const frontMatter = {
    title: "Los desposeídos",
    tags: ["libro", "leyendo", "ciencia-ficción"],
    rating: 5,
  };

  normalizeBookFrontMatter(
    "content_es/libros/los-desposeidos.md",
    frontMatter,
    [
      "**Autor:** Ursula K. Le Guin",
      "**Progreso:** 100%",
      "**Mi calificación:**",
    ].join("\n"),
  );

  assert.equal(frontMatter.book_progress, 100);
  assert.equal(frontMatter.book_status, "read");
  assert.equal(frontMatter.rating, undefined);
  assert.equal(frontMatter.summary, "De Ursula K. Le Guin · Leído");
  assert.deepEqual(frontMatter.tags, ["libro", "leído", "ciencia-ficción"]);
});

test("legacy currently-reading books can keep progress unquantified", () => {
  const frontMatter = {
    title: "Legacy book",
    book_author: "Author",
    book_status: "currently-reading",
    book_progress: 50,
    tags: ["book", "currently-reading"],
  };

  normalizeBookFrontMatter(
    "content_en/books/legacy-book.md",
    frontMatter,
    "**Author:** Author\n**Progress:** not set\n",
  );

  assert.equal(frontMatter.book_progress, undefined);
  assert.equal(frontMatter.book_status, "currently-reading");
});

test("Spanish books can keep currently-reading progress unset", () => {
  const frontMatter = {
    title: "Libro en curso",
    book_author: "Autor",
    book_status: "currently-reading",
    book_progress: 50,
    tags: ["libro", "leyendo"],
  };

  normalizeBookFrontMatter(
    "content_es/libros/libro-en-curso.md",
    frontMatter,
    "**Autor:** Autor\n**Progreso:** sin registrar\n",
  );

  assert.equal(frontMatter.book_progress, undefined);
  assert.equal(frontMatter.book_status, "currently-reading");
});

test("book progress rejects values outside the percentage range", () => {
  assert.throws(
    () => normalizeBookFrontMatter(
      "content_en/books/invalid.md",
      { book_author: "Author" },
      "**Author:** Author\n**Progress:** 101%\n",
    ),
    /entre 0% y 100%/,
  );
});
