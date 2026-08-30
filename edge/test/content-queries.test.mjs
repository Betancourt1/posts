import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Miniflare } from "miniflare";

import {
  archiveItems,
  archiveMonthCounts,
  backlinks,
  documentTags,
  graphRows,
  infrastructureRows,
  latestSyncTimestamp,
  navSections,
  normalizeRoute,
  recentPosts,
  resolveDocument,
  searchDocuments,
  sectionItems,
  tagIndex,
  tagResults,
  translationPeer,
} from "../src/lib/content-queries.mjs";
import { projectSource } from "../src/lib/content-projector.mjs";
import {
  archiveMonths,
  loadNotFoundPage,
  loadPublicPage,
} from "../src/lib/public-page.mjs";
import {
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

    const complete = trigger ? line.trim() === "END;" : line.trim().endsWith(";");
    if (complete) {
      statements.push(current.join("\n"));
      current = [];
      trigger = false;
    }
  }

  return statements;
}

async function testDatabase() {
  const miniflare = new Miniflare({
    compatibilityDate: "2026-07-13",
    d1Databases: { DB: "content-queries-test" },
    modules: true,
    script: "export default { fetch() { return new Response('ok') } }",
  });
  const db = await miniflare.getD1Database("DB");
  const migration = await readFile(migrationPath, "utf8");
  for (const statement of migrationStatements(migration)) {
    await db.prepare(statement).run();
  }

  const sources = [
    ["content_en/_index.md", `---
title: Home
draft: false
---
Welcome.
`],
    ["content_en/posts/_index.md", `---
title: Writing
draft: false
---
English writing.
`],
    ["content_en/books/_index.md", `---
title: Books
draft: false
---
Books.
`],
    ["content_en/archives/_index.md", `---
title: Archives
draft: false
---
Archives.
`],
    ["content_es/archives/_index.md", `---
title: Archivos
draft: false
---
Archivos.
`],
    ["content_en/tags/_index.md", `---
title: Tags
draft: false
---
Tags.
`],
    ["content_en/zettelkasten/_index.md", `---
title: Zettelkasten
draft: true
hidden: true
---
Hidden section.
`],
    ["content_en/draft-only/_index.md", `---
title: Draft only
draft: true
---
Draft navigation section.
`],
    ["content_en/hidden-only/_index.md", `---
title: Hidden only
draft: false
hidden: true
---
Hidden navigation section.
`],
    [
      "content_en/guestbook/_index.md",
      await readFile(new URL("../../content_en/guestbook/_index.md", import.meta.url), "utf8"),
    ],
    ["content_es/posts/_index.md", `---
title: Escritos
draft: false
---
Escritos en español.
`],
    [
      "content_es/visitas/_index.md",
      await readFile(new URL("../../content_es/visitas/_index.md", import.meta.url), "utf8"),
    ],
    ["content_en/posts/ethical-data.md", `---
title: Ethical Data
date: 2026-07-10
draft: false
summary: A practical ethics note.
tags: [ethics, book]
translationKey: ethical-data
aliases: [/old-ethical-data]
---
Ethical systems need care. [Target](/posts/target/)
`],
    ["content_es/posts/datos-eticos.md", `---
title: Datos éticos
date: 2026-07-09
draft: false
summary: Una nota sobre datos.
tags: [ethics, essays]
translationKey: ethical-data
---
La ética de datos necesita cuidado.
`],
    ["content_en/posts/target.md", `---
title: Destination
date: 2026-07-08
draft: false
tags: [knowledge, note]
---
The linked destination.
`],
    ["content_en/posts/draft-link.md", `---
title: Draft link
date: 2026-07-12
draft: true
tags: [ethics]
---
[Target](/posts/target/)
`],
    ["content_en/posts/hidden-link.md", `---
title: Hidden link
date: 2026-07-11
draft: false
hidden: true
tags: [ethics]
---
[Target](/posts/target/)
`],
  ];

  for (const [index, [path, rawMarkdown]] of sources.entries()) {
    await replaceProjectedSource(db, projectSource({
      path,
      rawMarkdown,
      blobSha: `blob-${index}`,
      commitSha: "fixture-commit",
      projectorVersion: "1",
    }), null);
  }
  await finishProjection(db);
  await db.batch([
    db.prepare(`
      INSERT INTO sync_runs (commit_sha, trigger, status, finished_at)
      VALUES ('old', 'manual', 'complete', '2026-07-12 10:00:00')
    `),
    db.prepare(`
      INSERT INTO sync_runs (commit_sha, trigger, status, finished_at)
      VALUES ('failed', 'webhook', 'failed', '2026-07-13 10:00:00')
    `),
    db.prepare(`
      INSERT INTO sync_runs (commit_sha, trigger, status, finished_at)
      VALUES ('new', 'webhook', 'complete', '2026-07-14 04:00:00')
    `),
  ]);

  return { db, miniflare };
}

function tracedDatabase(db) {
  const queries = [];
  return {
    queries,
    db: {
      prepare(query) {
        queries.push(String(query));
        return db.prepare(query);
      },
    },
  };
}

test("normalizes request routes without changing file-like paths", () => {
  assert.equal(normalizeRoute("posts//ethical-data?view=raw"), "/posts/ethical-data/");
  assert.equal(normalizeRoute("//posts///ethical-data"), "/posts/ethical-data/");
  assert.equal(normalizeRoute("https://example.com/es"), "/es/");
  assert.equal(normalizeRoute("/posts/ethical-data/index.html"), "/posts/ethical-data/");
  assert.equal(normalizeRoute("/uploads/photo.jpg"), "/uploads/photo.jpg");
  assert.equal(normalizeRoute("/%C3%A9tica"), "/ética/");
});

test("reads the projected public site through the real D1 API", async (t) => {
  const { db, miniflare } = await testDatabase();
  t.after(() => miniflare.dispose());

  await t.test("resolves canonical and alias routes with the public draft gate", async () => {
    const canonical = await resolveDocument(db, "/posts/ethical-data");
    const alias = await resolveDocument(db, "/old-ethical-data/");

    assert.equal(canonical.path, "/posts/ethical-data/");
    assert.equal(canonical.canonicalPath, "/posts/ethical-data/");
    assert.equal(canonical.routeKind, "canonical");
    assert.equal(canonical.sourcePath, "content_en/posts/ethical-data.md");
    assert.equal(canonical.frontMatter.summary, "A practical ethics note.");
    assert.deepEqual(canonical.tags.map((tag) => tag.label), ["ethics", "book"]);
    assert.equal(alias.routeKind, "alias");
    assert.equal(alias.requestedPath, "/old-ethical-data/");
    assert.equal(alias.canonicalPath, canonical.canonicalPath);

    assert.equal(await resolveDocument(db, "/posts/draft-link/"), null);
    assert.equal(
      (await resolveDocument(db, "/posts/draft-link/", { includeDrafts: true })).title,
      "Draft link",
    );
    assert.equal(
      (await resolveDocument(db, "/posts/hidden-link/")).hidden,
      true,
      "hidden pages remain directly addressable",
    );
  });

  await t.test("returns ordered tags and the translated peer", async () => {
    const english = await resolveDocument(db, "/posts/ethical-data/");
    assert.deepEqual(
      (await documentTags(db, english.id)).map(({ label, slug, position }) => ({
        label,
        slug,
        position,
      })),
      [
        { label: "ethics", slug: "ethics", position: 0 },
        { label: "book", slug: "book", position: 1 },
      ],
    );

    const spanish = await translationPeer(db, english.id);
    assert.equal(spanish.lang, "es");
    assert.equal(spanish.path, "/es/posts/datos-eticos/");
    assert.equal(spanish.frontMatter.translationKey, "ethical-data");
    assert.deepEqual(spanish.tags.map((tag) => tag.label), ["ethics", "essays"]);
  });

  await t.test("pairs Guestbook and Visitas as localized views of one wall", async () => {
    const english = await resolveDocument(db, "/guestbook/");
    const spanish = await translationPeer(db, english.id);

    assert.equal(english.frontMatter.translationKey, "guestbook");
    assert.equal(spanish.path, "/es/visitas/");
    assert.equal(spanish.frontMatter.translationKey, "guestbook");
    assert.equal((await translationPeer(db, spanish.id)).path, "/guestbook/");
  });

  await t.test("builds section, navigation, archive, and taxonomy lists", async () => {
    const section = await sectionItems(db, "en", "posts");
    assert.deepEqual(section.map((document) => document.title), [
      "Ethical Data",
      "Destination",
    ]);
    assert.equal(section[0].path, "/posts/ethical-data/");
    assert.equal(section[0].frontMatter.translationKey, "ethical-data");
    assert.equal(section[0].tags[0].slug, "ethics");

    const sectionWithBody = await sectionItems(db, "en", "posts", { body: true });
    assert.match(sectionWithBody[0].bodyMarkdown, /Ethical systems need care/);

    const navigation = await navSections(db, "en");
    assert.deepEqual(navigation.map((document) => document.title), [
      "Books",
      "Guestbook",
      "Home",
      "Writing",
    ]);
    assert.deepEqual(Object.keys(navigation[0]).sort(), ["path", "section", "title"]);
    assert.deepEqual(
      (await navSections(db, "en", { includeDrafts: true })).map(({ title }) => title),
      ["Books", "Draft only", "Guestbook", "Home", "Writing"],
    );
    assert.deepEqual(
      (await navSections(db, "en", { includeHidden: true })).map(({ title }) => title),
      ["Books", "Guestbook", "Hidden only", "Home", "Writing"],
    );
    assert.deepEqual(
      (await navSections(db, "en", { includeDrafts: true, includeHidden: true }))
        .map(({ title }) => title),
      ["Books", "Draft only", "Guestbook", "Hidden only", "Home", "Writing", "Zettelkasten"],
    );

    const archives = await archiveItems(db, "en");
    assert.deepEqual(
      archives.map(({ title, year }) => [title, year]),
      [["Ethical Data", "2026"], ["Destination", "2026"]],
    );
    assert.equal(archives[0].frontMatter.translationKey, "ethical-data");
    assert.deepEqual(archives[0].tags.map(({ label }) => label), ["ethics", "book"]);

    for (const lang of ["en", "es"]) {
      for (const options of [
        {},
        { includeDrafts: true },
        { includeHidden: true },
        { includeDrafts: true, includeHidden: true },
      ]) {
        assert.deepEqual(
          await archiveMonthCounts(db, lang, options),
          archiveMonths(await archiveItems(db, lang, options)),
          `${lang} archive counts must preserve ${JSON.stringify(options)} visibility`,
        );
      }
    }

    const tags = await tagIndex(db, "en");
    assert.equal(tags.find((tag) => tag.slug === "ethics").count, 1);
    assert.equal(tags.find((tag) => tag.slug === "knowledge").count, 1);
    assert.deepEqual(
      (await tagResults(db, "en", "ethics")).map((document) => document.path),
      ["/posts/ethical-data/"],
    );
    const recent = await recentPosts(db, "en", { limit: 10 });
    assert.deepEqual(recent.map((document) => document.title), [
      "Ethical Data",
      "Destination",
    ]);

    const publicWriting = await loadPublicPage(db, "/posts/");
    assert.deepEqual(publicWriting.items.map((document) => document.title), [
      "Ethical Data",
      "Destination",
    ]);
    const adminWriting = await loadPublicPage(db, "/posts/", {
      includeDrafts: true,
      includeHiddenListItems: true,
    });
    assert.deepEqual(adminWriting.items.map((document) => document.title), [
      "Draft link",
      "Hidden link",
      "Ethical Data",
      "Destination",
    ]);
    assert.deepEqual(
      (await loadPublicPage(db, "/", { includeHiddenListItems: true })).items,
      (await loadPublicPage(db, "/")).items,
      "list-only visibility must not change the home feed",
    );
    assert.deepEqual(
      (await loadPublicPage(db, "/books/", { includeHiddenListItems: true })).items,
      (await loadPublicPage(db, "/books/")).items,
      "list-only visibility must not change non-list sections",
    );

    assert.deepEqual(
      (await tagResults(db, "es", "ethics")).map((document) => document.title),
      ["Datos éticos"],
    );
  });

  await t.test("serves backlinks, FTS search, graph, infrastructure, and freshness rows", async () => {
    const target = await resolveDocument(db, "/posts/target/");
    const inbound = await backlinks(db, target.id);
    assert.deepEqual(inbound.map((document) => document.title), ["Ethical Data"]);
    assert.equal(inbound[0].linkLabel, "Target");
    assert.equal(inbound[0].path, "/posts/ethical-data/");

    const englishSearch = await searchDocuments(db, "ethic", "en", 5);
    assert.deepEqual(englishSearch.map((document) => document.title), ["Ethical Data"]);
    assert.equal(englishSearch[0].path, "/posts/ethical-data/");
    assert.match(englishSearch[0].excerpt, /Ethical systems/);
    assert.deepEqual(await searchDocuments(db, "!!!", "en"), []);
    assert.deepEqual(
      (await searchDocuments(db, "etica", "es")).map((document) => document.title),
      ["Datos éticos"],
      "unicode61 removes diacritics for matching",
    );

    const graph = await graphRows(db, "en");
    assert.deepEqual(graph.map((document) => document.title), ["Destination", "Ethical Data"]);
    assert.deepEqual(
      graph.find((document) => document.title === "Ethical Data").tags,
      [{ label: "ethics", slug: "ethics", path: "/tags/ethics/" }],
      "generic book status tags are omitted from the graph",
    );
    assert.deepEqual(
      graph.find((document) => document.title === "Destination").tags,
      [{ label: "knowledge", slug: "knowledge", path: "/tags/knowledge/" }],
      "generic note tags are omitted from the graph",
    );

    const infrastructure = await infrastructureRows(db, "en");
    assert.deepEqual(infrastructure.map((document) => document.title), [
      "Destination",
      "Ethical Data",
    ]);
    assert.match(
      infrastructure.find((document) => document.title === "Ethical Data").bodyMarkdown,
      /Target/,
    );
    assert.equal(await latestSyncTimestamp(db), "2026-07-14 04:00:00");
  });

  await t.test("uses aggregate archive counts only for shared page chrome", async () => {
    const aggregateQuery = (query) => query.includes("WITH archive_rows AS");
    const fullArchiveQuery = (query) => query.includes("END AS year");

    for (const [label, load] of [
      ["normal page", (tracedDb) => loadPublicPage(tracedDb, "/posts/ethical-data/")],
      ["Spanish page", (tracedDb) => loadPublicPage(tracedDb, "/es/posts/datos-eticos/")],
      ["admin draft page", (tracedDb) => loadPublicPage(
        tracedDb,
        "/posts/draft-link/",
        { includeDrafts: true },
      )],
      ["tag page", (tracedDb) => loadPublicPage(tracedDb, "/tags/ethics/")],
      ["not-found page", (tracedDb) => loadNotFoundPage(tracedDb, "/missing/")],
    ]) {
      const trace = tracedDatabase(db);
      const model = await load(trace.db);
      assert.ok(model, `${label} should load`);
      assert.equal(trace.queries.filter(aggregateQuery).length, 1, `${label} should aggregate months`);
      assert.equal(trace.queries.filter(fullArchiveQuery).length, 0, `${label} should not hydrate archives`);
    }

    for (const route of ["/archives/", "/es/archives/"]) {
      const trace = tracedDatabase(db);
      const archivePage = await loadPublicPage(trace.db, route);
      assert.ok(archivePage, `${route} should load`);
      assert.equal(trace.queries.filter(aggregateQuery).length, 0);
      assert.equal(trace.queries.filter(fullArchiveQuery).length, 1);
      assert.deepEqual(archivePage.archiveMonths, archiveMonths(archivePage.items));
      assert.ok(archivePage.items[0].tags.length > 0);
    }
  });
});

test("archive month aggregation preserves ordering, validation, and input limits", async (t) => {
  const { db, miniflare } = await testDatabase();
  t.after(() => miniflare.dispose());

  const extraSources = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.UTC(2025, index, 15)).toISOString().slice(0, 10);
    return [`content_en/posts/month-${index}.md`, `---
title: Month ${index}
date: ${date}
draft: false
---
Monthly fixture.
`];
  });
  extraSources.push(
    ["content_en/posts/malformed-date.md", `---
title: Malformed date
date: not-a-date
draft: false
---
Malformed date fixture.
`],
    ["content_en/posts/short-month.md", `---
title: Short month
date: 2026-7-01
draft: false
---
Short month fixture.
`],
    ["content_en/posts/undated.md", `---
title: Undated
draft: false
---
Undated fixture.
`],
  );

  for (const [index, [path, rawMarkdown]] of extraSources.entries()) {
    await replaceProjectedSource(db, projectSource({
      path,
      rawMarkdown,
      blobSha: `extra-blob-${index}`,
      commitSha: "extra-fixture-commit",
      projectorVersion: "1",
    }), null);
  }
  await finishProjection(db);

  for (const options of [{}, { limit: 5 }, { limit: 1000 }, { limit: 5000 }]) {
    assert.deepEqual(
      await archiveMonthCounts(db, "en", options),
      archiveMonths(await archiveItems(db, "en", options)),
      `aggregate must match capped archive input for ${JSON.stringify(options)}`,
    );
  }

  const months = await archiveMonthCounts(db, "en");
  assert.equal(months.length, 12);
  assert.deepEqual(months, [...months].sort((left, right) => right.key.localeCompare(left.key)));
  assert.ok(months.every(({ key }) => /^\d{4}-\d{2}$/.test(key)));
  assert.ok(months.every(({ count }) => typeof count === "number"));
});
