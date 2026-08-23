import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { projectSource } from "../src/lib/content-projector.mjs";
import { uniqueTagRecords } from "../src/lib/tag-slug.mjs";

const edgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(edgeRoot, "..");
const outputPath = join(edgeRoot, ".generated", "seed.sql");
const projectorVersion = process.env.CONTENT_PROJECTOR_VERSION || "1";
const commitSha = process.env.CONTENT_COMMIT_SHA || execFileSync(
  "git",
  ["rev-parse", "HEAD"],
  { cwd: repositoryRoot, encoding: "utf8" },
).trim();

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function flag(value) {
  return value ? "1" : "0";
}

function gitBlobSha(content) {
  const bytes = Buffer.from(content);
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

async function markdownPaths(directory) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      paths.push(...await markdownPaths(path));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      paths.push(path);
    }
  }
  return paths;
}

function sourceSql(projection) {
  const source = projection.source;
  const statements = [
    `INSERT INTO sources (path, blob_sha, commit_sha, source_lang, raw_markdown, frontmatter_json, projector_version) VALUES (${[
      source.path,
      source.blobSha,
      source.commitSha,
      source.lang,
      source.normalizedMarkdown,
      JSON.stringify(source.frontMatter),
      source.projectorVersion,
    ].map(quote).join(", ")});`,
    `INSERT INTO source_revisions (path, blob_sha, commit_sha) VALUES (${[
      source.path,
      source.blobSha,
      source.commitSha,
    ].map(quote).join(", ")});`,
  ];

  for (const document of projection.documents) {
    const tags = uniqueTagRecords(document.tags);
    statements.push(`INSERT INTO documents (
      document_key, source_path, lang, kind, section, title, date, summary,
      description, translation_key, body_markdown, body_text, body_html,
      frontmatter_json, draft, hidden, searchable, tags_text, generated
    ) VALUES (${[
      document.documentKey,
      source.path,
      document.lang,
      document.kind,
      document.section || "",
      document.title || "",
      document.date || null,
      document.summary || "",
      document.description || "",
      document.translationKey || null,
      document.bodyMarkdown || "",
      document.bodyText || "",
      document.bodyHtml || "",
      JSON.stringify(document.frontMatter || {}),
    ].map(quote).join(", ")}, ${[
      flag(document.draft),
      flag(document.hidden),
      flag(document.searchable),
      quote(tags.map((tag) => tag.label).join(" ")),
      flag(document.generated),
    ].join(", ")});`);

    for (const route of document.routes || []) {
      statements.push(`INSERT INTO routes (path, document_id, kind)
        SELECT ${quote(route.path)}, id, ${quote(route.kind)}
        FROM documents WHERE document_key = ${quote(document.documentKey)};`);
    }

    for (const [position, tag] of tags.entries()) {
      statements.push(
        `INSERT INTO tags (lang, label, slug) VALUES (${quote(document.lang)}, ${quote(tag.label)}, ${quote(tag.slug)}) ON CONFLICT(lang, slug) DO UPDATE SET label = excluded.label;`,
        `INSERT INTO document_tags (document_id, tag_id, position)
          SELECT documents.id, tags.id, ${position}
          FROM documents, tags
          WHERE documents.document_key = ${quote(document.documentKey)}
            AND tags.lang = ${quote(document.lang)}
            AND tags.slug = ${quote(tag.slug)};`,
      );
    }

    for (const [ordinal, link] of (document.links || []).entries()) {
      statements.push(`INSERT INTO links (
        source_document_id, ordinal, target_path, target_document_id,
        href, label, external
      ) SELECT id, ${ordinal}, ${quote(link.targetPath)}, NULL, ${quote(link.href)}, ${quote(link.label || "")}, ${flag(link.external)}
        FROM documents WHERE document_key = ${quote(document.documentKey)};`);
    }
  }

  return statements;
}

const files = (
  await Promise.all([
    markdownPaths(join(repositoryRoot, "content_en")),
    markdownPaths(join(repositoryRoot, "content_es")),
  ])
).flat().sort();
const sources = [];

for (const filePath of files) {
  const rawMarkdown = await readFile(filePath, "utf8");
  sources.push(projectSource({
    path: relative(repositoryRoot, filePath).split("\\").join("/"),
    rawMarkdown,
    blobSha: gitBlobSha(rawMarkdown),
    commitSha,
    projectorVersion,
  }));
}

const documents = sources.flatMap((source) => source.documents);
const stats = {
  sources: sources.length,
  documents: documents.length,
  searchable: documents.filter((document) => document.searchable).length,
  canonicalRoutes: documents.flatMap((document) => document.routes).filter((route) => route.kind === "canonical").length,
  aliasRoutes: documents.flatMap((document) => document.routes).filter((route) => route.kind === "alias").length,
};
const expected = {
  sources: 300,
  documents: 397,
  searchable: 373,
  canonicalRoutes: 397,
  aliasRoutes: 107,
};

if (JSON.stringify(stats) !== JSON.stringify(expected)) {
  throw new Error(`Projection counts changed: ${JSON.stringify({ expected, actual: stats })}`);
}

const statements = [
  "PRAGMA foreign_keys = ON;",
  "DELETE FROM sources;",
  "DELETE FROM tags;",
  "DELETE FROM sync_runs;",
  ...sources.flatMap(sourceSql),
  `UPDATE links SET target_document_id = (
    SELECT routes.document_id FROM routes
    WHERE routes.path = links.target_path LIMIT 1
  ) WHERE external = 0;`,
  `UPDATE links SET target_document_id = (
    SELECT routes.document_id FROM routes
    WHERE routes.path = '/es' || links.target_path LIMIT 1
  ) WHERE external = 0
    AND target_document_id IS NULL
    AND target_path LIKE '/%'
    AND target_path NOT LIKE '/es/%'
    AND source_document_id IN (SELECT id FROM documents WHERE lang = 'es');`,
  "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM document_tags);",
  `INSERT INTO sync_runs (commit_sha, trigger, status, finished_at)
    VALUES (${quote(commitSha)}, 'manual', 'complete', CURRENT_TIMESTAMP);`,
  "",
];

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, statements.join("\n"));
console.log(JSON.stringify({ outputPath, commitSha, ...stats }, null, 2));
