import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Miniflare } from "miniflare";

import { projectSource } from "../src/lib/content-projector.mjs";
import {
  contentStats,
  finishProjection,
  replaceProjectedSource,
} from "../src/lib/content-store.mjs";

const migrationPath = fileURLToPath(
  new URL("../db/migrations/0001_content_projection.sql", import.meta.url),
);

function migrationStatements(sql) {
  const statements = [];
  let current = [];
  let trigger = false;

  for (const line of sql.split("\n")) {
    if (!current.length && !line.trim()) continue;
    current.push(line);
    if (current.length === 1) trigger = /^CREATE TRIGGER\b/.test(line.trim());

    const complete = trigger
      ? line.trim() === "END;"
      : line.trim().endsWith(";");
    if (complete) {
      statements.push(current.join("\n"));
      current = [];
      trigger = false;
    }
  }

  return statements;
}

test("writes and replaces a projected source through the real D1 API", async () => {
  const miniflare = new Miniflare({
    compatibilityDate: "2026-07-13",
    d1Databases: { DB: "content-store-test" },
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
  });

  try {
    const db = await miniflare.getD1Database("DB");
    const migration = await readFile(migrationPath, "utf8");
    for (const statement of migrationStatements(migration)) {
      await db.prepare(statement).run();
    }
    const rawMarkdown = `---
title: Data Feminism
date: 2026-01-01
draft: false
tags: [book, data feminism, ética]
book_author: Catherine D'Ignazio
book_status: read
rating: 5
translationKey: book-data-feminism
---
**Author:** Catherine D'Ignazio

[Related](/zettelkasten/data-feminism/)
`;
    const firstProjection = projectSource({
      path: "content_en/books/data-feminism.md",
      rawMarkdown,
      blobSha: "first-blob",
      commitSha: "first-commit",
      projectorVersion: "1",
    });

    await replaceProjectedSource(db, firstProjection, null);
    await finishProjection(db);
    assert.deepEqual(await contentStats(db), {
      alias_routes: 0,
      canonical_routes: 2,
      documents: 2,
      searchable: 2,
      sources: 1,
    });

    const firstIds = await db
      .prepare("SELECT document_key, id FROM documents ORDER BY document_key")
      .all();
    assert.equal(firstIds.results.length, 2);
    assert.equal(
      await db.prepare("SELECT COUNT(*) AS count FROM tags").first("count"),
      6,
    );
    assert.equal(
      await db.prepare("SELECT COUNT(*) AS count FROM documents_fts WHERE documents_fts MATCH 'etica'").first("count"),
      2,
    );

    const replacement = projectSource({
      path: "content_en/books/data-feminism.md",
      rawMarkdown: rawMarkdown.replace("[Related]", "Updated [Related]"),
      blobSha: "second-blob",
      commitSha: "second-commit",
      projectorVersion: "1",
    });
    await replaceProjectedSource(db, replacement, null);
    await finishProjection(db);

    const secondIds = await db
      .prepare("SELECT document_key, id FROM documents ORDER BY document_key")
      .all();
    assert.deepEqual(secondIds.results, firstIds.results);
    assert.equal(
      await db.prepare("SELECT COUNT(*) AS count FROM routes").first("count"),
      2,
    );
    assert.equal(
      await db.prepare("SELECT COUNT(*) AS count FROM pragma_foreign_key_check").first("count"),
      0,
    );
  } finally {
    await miniflare.dispose();
  }
});

test("keeps one book projection within the incremental D1 query budget", async () => {
  let batchSize = 0;
  const db = {
    prepare(sql) {
      return {
        bind(...bindings) {
          return { bindings, sql };
        },
      };
    },
    async batch(statements) {
      batchSize = statements.length;
      return [];
    },
  };
  const projection = projectSource({
    path: "content_en/books/query-budget.md",
    rawMarkdown: `---
title: Query budget
draft: false
tags: [book, read, data]
book_author: Example
book_status: read
---
[One](/one/) [Two](/two/)
`,
    blobSha: "blob",
    commitSha: "commit",
    projectorVersion: "1",
  });

  await replaceProjectedSource(db, projection, null);
  assert.ok(batchSize <= 11, `expected at most 11 D1 statements, received ${batchSize}`);
});
