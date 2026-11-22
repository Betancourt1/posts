import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { Miniflare } from "miniflare";

import {
  archiveMonthCounts,
  archiveItems,
  backlinks,
  documentTags,
  graphRows,
  infrastructureRows,
  latestSyncTimestamp,
  navSections,
  normalizeRoute,
  recentPosts,
  homePosts,
  resolveDocument,
  searchDocuments,
  sectionItems,
  tagIndex,
  tagResults,
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
      await readFile(new URL("../../content/guestbook/_index.md", import.meta.url), "utf8"),
    ],
    ["content_es/posts/_index.md", `---
title: Escritos
draft: false
---
Escritos en español.
`],
    [
      "content_es/visitas/_index.md",
      await readFile(new URL("../../content/guestbook/_index--legacy.md", import.meta.url), "utf8"),
    ],
    ["content_en/posts/ethical-data.md", `---
title: Ethical Data
essay: true
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
essay: true
date: 2026-07-09
draft: false
summary: Una nota sobre datos.
tags: [ethics, essays]
translationKey: ethical-data
---
La ética de datos necesita cuidado.
`],
    ["content_es/posts/solo-espanol.md", `---
title: Solo en español
essay: false
technical: true
date: 2026-07-13
draft: false
tags: [solo-es]
---
Esta publicación solo existe en español.
`],
    ["content_es/posts/borrador-solo-espanol.md", `---
title: Borrador solo en español
date: 2026-07-14
draft: true
hidden: true
tags: [borrador-es]
---
Este borrador solo existe en español.
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

test("one catalog shares the latest essay and pins across legacy source folders", async (t) => {
  const { db, miniflare } = await testDatabase();
  t.after(() => miniflare.dispose());
  await replaceProjectedSource(db, projectSource({ path: "content_es/_index.md", rawMarkdown: "---\ntitle: Inicio\n---\n", blobSha: "home-es", commitSha: "fixture", projectorVersion: "1" }), null);
  async function put(lang, name, metadata) {
    await replaceProjectedSource(db, projectSource({
      path: `content_${lang}/posts/${name}.md`,
      rawMarkdown: `---\ntitle: ${name}\ndraft: false\n${metadata}\n---\nUnchanged article body.`,
      blobSha: "pin-fixture", commitSha: "fixture", projectorVersion: "1",
    }), null);
  }
  for (const lang of ["en", "es"]) {
    for (let index = 0; index < 12; index++) await put(lang, `recent-${index}`, "date: 2026-09-20");
    await put(lang, "latest-essay", "date: 2026-09-19\nessay: true\npinned: true");
    await put(lang, "technical", "date: 2026-09-20\nessay: true\ntechnical: true");
  }
  await put("es", "spanish-latest", "date: 2026-09-20\nessay: true");
  await put("en", "older-pin", "date: 2020-01-01\npinned: true");
  await put("es", "older-pin", "date: 2020-01-01");
  await put("en", "tie-pin", "date: 2020-01-01\ntranslationKey: shared-tie-pin");
  await put("es", "spanish-tie-pin", "date: 2020-01-01\ntranslationKey: shared-tie-pin\npinned: true");
  await put("en", "untranslated-pin", "date: 2019-01-01\npinned: true");
  await put("en", "hidden-translation", "date: 2018-01-01\npinned: true");
  await put("es", "hidden-translation", "date: 2018-01-01\nhidden: true");
  await put("en", "hidden-pin", "date: 2026-09-21\npinned: true\nhidden: true");
  await put("es", "hidden-pin", "date: 2026-09-21");
  await put("en", "draft-pin", "date: 2026-09-21\npinned: true");
  await put("es", "draft-pin", "date: 2026-09-21");
  await db.prepare("UPDATE documents SET draft = 1 WHERE lang = 'en' AND title = 'draft-pin'").run();

  const projects = await sectionItems(db, "proyectos-profesionales");
  const blog = await sectionItems(db, "posts");
  assert.ok(projects.some(item => item.path === "/posts/technical/"));
  assert.ok(blog.every(item => item.frontMatter.technical !== true));
  assert.ok(blog.some(item => item.path === "/posts/spanish-latest/"));

  const paths = [
    "/posts/spanish-latest/", "/posts/latest-essay/", "/posts/tie-pin/",
    "/posts/older-pin/", "/posts/untranslated-pin/", "/posts/hidden-translation/",
  ];
  const selected = await homePosts(db);
  assert.deepEqual(selected.map(item => item.path), paths);
  assert.equal(selected[0].latestEssay, 1);
  const home = await loadPublicPage(db, "/");
  const authorHome = await loadPublicPage(db, "/", { includeDrafts: true, includeHidden: true });
  assert.deepEqual(home.items.map(item => item.path), paths);
  assert.deepEqual(authorHome.items.map(item => item.path), paths);
  assert.deepEqual(home.recentItems.map(item => item.id), (await recentPosts(db)).map(item => item.id));
  assert.equal(home.recentItems.length, 10);
  assert.ok(home.recentItems.every(item => !item.draft && !item.hidden));
  assert.ok(authorHome.recentItems.some(item => item.draft || item.hidden));
  assert.deepEqual(await loadPublicPage(db, "/es/"), { redirect: "/" });
  assert.deepEqual(await loadPublicPage(db, "/es/posts/latest-essay/"), { redirect: "/posts/latest-essay/" });
  assert.deepEqual(await loadPublicPage(db, "/es/tags/ethics/"), { redirect: "/tags/ethics/" });
  assert.deepEqual(await loadPublicPage(db, "/es/posts/spanish-latest/"), { redirect: "/posts/spanish-latest/" });
  assert.equal((await loadPublicPage(db, "/posts/spanish-latest/")).path, "/posts/spanish-latest/");

  await put("en", "older-pin", "date: 2020-01-01\npinned: false");
  await put("en", "tie-pin", "date: 2020-01-01\ntranslationKey: shared-tie-pin\npinned: false");
  assert.ok((await homePosts(db)).every(item => !["older-pin", "tie-pin"].includes(item.title)));
  assert.equal((await resolveDocument(db, "/posts/older-pin/")).bodyMarkdown.trim(), "Unchanged article body.");
});

test("published legacy pages and colliding drafts have different canonical URLs", async (t) => {
  const { db, miniflare } = await testDatabase();
  t.after(() => miniflare.dispose());
  const entries = [
    ["content/posts/2025/noviembre/conversatorio.md", "Un conversatorio", "", "Conversatorio publicado."],
    ["content/posts/2025/noviembre/conversatorio--draft.md", "Private version", "draft: true\nhidden: true\n", "Work in progress."],
    ["content_es/about/index.md", "Sobre mí", "", "Una biografía alternativa."],
    ["content_en/about/index.md", "About", "", "English biography."],
  ];
  for (const [path, title, flags, body] of entries) {
    await replaceProjectedSource(db, projectSource({
      path, rawMarkdown: `---\ntitle: ${title}\n${flags}---\n${body}`,
      blobSha: path, commitSha: "fixture", projectorVersion: "1",
    }), null);
  }

  const path = "/posts/2025/noviembre/conversatorio/";
  const alternate = path + "alternate/";
  const author = { includeDrafts: true };
  assert.deepEqual(await loadPublicPage(db, "/es" + path), { redirect: path });
  for (const options of [{}, author]) {
    const page = await loadPublicPage(db, path, options);
    assert.equal(page.path, path);
    assert.equal(page.page.canonicalPath, path);
    assert.equal(page.page.sourcePath, "content/posts/2025/noviembre/conversatorio.md");
    assert.equal(page.page.bodyMarkdown.trim(), "Conversatorio publicado.");
  }
  assert.equal(await loadPublicPage(db, alternate), null);
  const draft = await loadPublicPage(db, alternate, author);
  assert.equal(draft.title, "Private version");
  assert.equal(draft.page.sourcePath, "content/posts/2025/noviembre/conversatorio--draft.md");
  assert.equal(await loadPublicPage(db, path.replace(/\/$/, "--draft/")), null);
  assert.deepEqual(await loadPublicPage(db, "/es/about/"), { redirect: "/about/" });
  assert.equal((await loadPublicPage(db, "/about/")).title, "About");
  for (const mainPath of [
    "/about/",
    "/posts/2026/septiembre/tecno_fatalismo/",
    "/proyectos-profesionales/mibici_junio_2026/",
  ]) {
    assert.deepEqual(await loadPublicPage(db, mainPath + "alternate/"), { redirect: mainPath });
  }
  assert.deepEqual((await searchDocuments(db, "conversatorio")).map(item => item.path), [path]);
  await db.prepare("UPDATE documents SET draft = 1 WHERE source_path = 'content_en/about/index.md'").run();
  assert.equal(await loadPublicPage(db, "/about/"), null);
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

  await t.test("returns ordered tags for both authored records", async () => {
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

    const spanish = await resolveDocument(db, "/es/posts/datos-eticos/");
    assert.equal(spanish.catalogKey, english.catalogKey);
    assert.equal(spanish.path, "/es/posts/datos-eticos/");
    assert.equal(spanish.frontMatter.translationKey, "ethical-data");
    assert.deepEqual(spanish.tags.map((tag) => tag.label), ["ethics", "essays"]);
    assert.deepEqual((await resolveDocument(db, "/posts/ethical-data/", { tags: false })).tags, []);
  });

  await t.test("preserves the Visitas alias for Guestbook", async () => {
    const english = await resolveDocument(db, "/guestbook/");
    const spanish = await resolveDocument(db, "/es/visitas/");

    assert.equal(english.frontMatter.translationKey, "guestbook");
    assert.equal(spanish.path, "/es/visitas/");
    assert.equal(spanish.frontMatter.translationKey, "guestbook");
    assert.deepEqual(await loadPublicPage(db, "/es/visitas/"), { redirect: "/guestbook/" });
  });

  await t.test("builds section, navigation, archive, and taxonomy lists", async () => {
    const section = await sectionItems(db, "posts");
    assert.deepEqual(section.map((document) => document.title), [
      "Ethical Data",
      "Destination",
    ]);
    assert.equal(section[0].path, "/posts/ethical-data/");
    assert.equal(section[0].frontMatter.translationKey, "ethical-data");
    assert.equal(section[0].tags[0].slug, "ethics");

    const sectionWithBody = await sectionItems(db, "posts", { body: true });
    assert.match(sectionWithBody[0].bodyMarkdown, /Ethical systems need care/);

    const navigation = await navSections(db);
    assert.deepEqual(navigation.map((document) => document.title), [
      "Books",
      "Guestbook",
      "Home",
      "Writing",
    ]);
    assert.deepEqual(Object.keys(navigation[0]).sort(), ["path", "section", "title"]);
    assert.deepEqual(
      (await navSections(db, { includeDrafts: true })).map(({ title }) => title),
      ["Books", "Draft only", "Guestbook", "Home", "Writing"],
    );
    assert.deepEqual(
      (await navSections(db, { includeHidden: true })).map(({ title }) => title),
      ["Books", "Guestbook", "Hidden only", "Home", "Writing"],
    );
    assert.deepEqual(
      (await navSections(db, { includeDrafts: true, includeHidden: true }))
        .map(({ title }) => title),
      ["Books", "Draft only", "Guestbook", "Hidden only", "Home", "Writing", "Zettelkasten"],
    );

    const archives = await archiveItems(db);
    assert.deepEqual(
      archives.map(({ title, year }) => [title, year]),
      [["Solo en español", "2026"], ["Ethical Data", "2026"], ["Destination", "2026"]],
    );
    assert.deepEqual(
      (await archiveItems(db, { tags: false })).map((document) => document.tags),
      [[], [], []],
    );
    assert.deepEqual(await archiveMonthCounts(db), [{ key: "2026-07", count: 3 }]);
    assert.deepEqual(
      await archiveMonthCounts(db, { includeDrafts: true, includeHidden: true }),
      [{ key: "2026-07", count: 6 }],
    );
    assert.ok((await navSections(db, { tags: false }))
      .every((document) => !Object.hasOwn(document, "tags")));
    assert.equal(archives[1].frontMatter.translationKey, "ethical-data");
    assert.deepEqual(archives[1].tags.map(({ label }) => label), ["ethics", "book"]);

    for (const options of [
      {}, { includeDrafts: true }, { includeHidden: true }, { includeDrafts: true, includeHidden: true },
    ]) {
      assert.deepEqual(await archiveMonthCounts(db, options), archiveMonths(await archiveItems(db, options)));
    }

    const tags = await tagIndex(db);
    assert.equal(tags.find((tag) => tag.slug === "ethics").count, 1);
    assert.equal(tags.find((tag) => tag.slug === "knowledge").count, 1);
    assert.deepEqual(
      (await tagResults(db, "ethics")).map((document) => document.path),
      ["/posts/ethical-data/"],
    );
    const recent = await recentPosts(db, { limit: 10 });
    assert.deepEqual(recent.map((document) => document.title), [
      "Solo en español",
      "Ethical Data",
      "Destination",
    ]);

    const projects = await sectionItems(db, "proyectos-profesionales");
    assert.deepEqual(projects.map(item => item.path), ["/posts/solo-espanol/"]);
    const publicEnglishWriting = await loadPublicPage(db, "/posts/");
    assert.deepEqual(publicEnglishWriting.items.map((document) => document.title), [
      "Ethical Data",
      "Destination",
    ]);
    assert.deepEqual(publicEnglishWriting.items.map((document) => document.path), [
      "/posts/ethical-data/",
      "/posts/target/",
    ]);
    assert.deepEqual(await loadPublicPage(db, "/es/posts/"), { redirect: "/posts/" });
    assert.deepEqual(await loadPublicPage(db, "/es/visitas/"), { redirect: "/guestbook/" });
    assert.deepEqual(await loadPublicPage(db, "/es/posts/datos-eticos/"), { redirect: "/posts/datos-eticos/" });
    const legacyArticle = await loadPublicPage(db, "/posts/datos-eticos/");
    assert.equal(legacyArticle.title, "Datos éticos");
    assert.match(legacyArticle.page.bodyMarkdown, /La ética de datos/);
    const adminOptions = { includeDrafts: true, includeHiddenListItems: true };
    const adminEnglishWriting = await loadPublicPage(db, "/posts/", adminOptions);
    assert.deepEqual(adminEnglishWriting.items.map((document) => document.title), [
      "Borrador solo en español",
      "Draft link",
      "Hidden link",
      "Ethical Data",
      "Destination",
    ]);
    assert.equal(adminEnglishWriting.items[0].path, "/posts/borrador-solo-espanol/");

    assert.deepEqual(await loadPublicPage(db, "/es/posts/", adminOptions), { redirect: "/posts/" });
    assert.equal(new Set(adminEnglishWriting.items.map(item => item.catalogKey)).size, adminEnglishWriting.items.length);
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
      (await tagResults(db, "solo-es")).map((document) => document.title),
      ["Solo en español"],
    );
  });

  await t.test("serves backlinks, FTS search, graph, infrastructure, and freshness rows", async () => {
    const target = await resolveDocument(db, "/posts/target/");
    const inbound = await backlinks(db, target.id);
    assert.deepEqual(inbound.map((document) => document.title), ["Ethical Data"]);
    assert.equal(inbound[0].linkLabel, "Target");
    assert.equal(inbound[0].path, "/posts/ethical-data/");

    const englishSearch = await searchDocuments(db, "ethic", 5);
    assert.deepEqual(englishSearch.map((document) => document.title), ["Ethical Data"]);
    assert.equal(englishSearch[0].path, "/posts/ethical-data/");
    assert.match(englishSearch[0].excerpt, /Ethical systems/);
    assert.deepEqual(await searchDocuments(db, "!!!"), []);
    assert.deepEqual(
      (await searchDocuments(db, "espanol")).map((document) => document.title),
      ["Solo en español"],
      "the shared search includes original-language content",
    );
    assert.deepEqual((await searchDocuments(db, "etica")).map(item => item.path), ["/posts/datos-eticos/"]);


    const graph = await graphRows(db);
    assert.deepEqual(graph.map((document) => document.title), ["Destination", "Ethical Data", "Solo en español"]);
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

    const infrastructure = await infrastructureRows(db);
    assert.deepEqual(infrastructure.map((document) => document.title), [
      "Destination",
      "Ethical Data",
      "Solo en español",
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
      ["original-language page", (tracedDb) => loadPublicPage(tracedDb, "/posts/datos-eticos/")],
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

    const trace = tracedDatabase(db);
    const archivePage = await loadPublicPage(trace.db, "/archives/");
    assert.ok(archivePage);
    assert.equal(trace.queries.filter(aggregateQuery).length, 0);
    assert.equal(trace.queries.filter(fullArchiveQuery).length, 1);
    assert.deepEqual(archivePage.archiveMonths, archiveMonths(archivePage.items));
    assert.deepEqual(archivePage.items.flatMap(item => item.tags), []);
    assert.deepEqual(await loadPublicPage(db, "/es/archives/"), { redirect: "/archives/" });
  });

  await t.test("repairs stale colored bodies while preserving the no-tone fast path", async () => {
    await db.batch([
      db.prepare(`
        UPDATE documents
        SET body_markdown = ?, body_text = ?, body_html = ?
        WHERE source_path = 'content_en/posts/hidden-link.md'
      `).bind(
        "Styled {{green|visible}}, {{blue|**strong**}}, and `{{amber|code}}`. Unsupported {{purple|plain}}.",
        "STALE {{green|visible}}",
        "<p>STALE {{green|visible}}</p>",
      ),
      db.prepare(`
        UPDATE documents
        SET body_text = 'stored fast-path text',
            body_html = '<p data-fast-path>stored fast-path html</p>'
        WHERE source_path = 'content_en/posts/target.md'
      `),
    ]);

    const repaired = await resolveDocument(db, "/posts/hidden-link/");
    assert.equal(repaired.path, "/posts/hidden-link/");
    assert.equal(repaired.canonicalPath, "/posts/hidden-link/");
    assert.equal(repaired.draft, false);
    assert.equal(repaired.hidden, true);
    assert.equal(repaired.searchable, false);
    assert.match(repaired.bodyHtml, /sidenote-tone--green">visible<\/span>/);
    assert.match(repaired.bodyHtml, /sidenote-tone--blue"><strong>strong<\/strong><\/span>/);
    assert.match(repaired.bodyHtml, /<code>\{\{amber\|code\}\}<\/code>/);
    assert.match(repaired.bodyHtml, /\{\{purple\|plain\}\}/);
    assert.doesNotMatch(repaired.bodyHtml, /STALE/);
    assert.match(repaired.bodyText, /Styled visible, strong, and code/);
    assert.doesNotMatch(repaired.bodyText, /STALE|\{\{(?:green|blue|amber)\|/);

    const bodyItems = await sectionItems(db, "posts", {
      body: true,
      includeHidden: true,
    });
    assert.match(
      bodyItems.find((document) => document.sourcePath === "content_en/posts/hidden-link.md").bodyHtml,
      /sidenote-tone--green">visible<\/span>/,
    );

    const fastPath = await resolveDocument(db, "/posts/target/");
    assert.equal(fastPath.bodyText, "stored fast-path text");
    assert.equal(fastPath.bodyHtml, "<p data-fast-path>stored fast-path html</p>");
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
      await archiveMonthCounts(db, options),
      archiveMonths(await archiveItems(db, options)),
      `aggregate must match capped archive input for ${JSON.stringify(options)}`,
    );
  }

  const months = await archiveMonthCounts(db);
  assert.equal(months.length, 12);
  assert.deepEqual(months, [...months].sort((left, right) => right.key.localeCompare(left.key)));
  assert.ok(months.every(({ key }) => /^\d{4}-\d{2}$/.test(key)));
  assert.ok(months.every(({ count }) => typeof count === "number"));
});
