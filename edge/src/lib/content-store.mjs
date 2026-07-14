import { uniqueTagRecords } from "./tag-slug.mjs";

function flag(value) {
  return value ? 1 : 0;
}

function json(value) {
  return JSON.stringify(value ?? {});
}

export async function sourceStates(db) {
  const result = await db
    .prepare("SELECT path, blob_sha, projector_version FROM sources ORDER BY path")
    .all();

  return new Map((result.results || []).map((row) => [row.path, row]));
}

export async function replaceProjectedSource(db, projection, runId) {
  const source = projection.source;
  const documentRows = projection.documents.map((document) => {
    const tags = uniqueTagRecords(document.tags);
    return {
      documentKey: document.documentKey,
      sourcePath: source.path,
      lang: document.lang,
      kind: document.kind,
      section: document.section || "",
      title: document.title || "",
      date: document.date || null,
      summary: document.summary || "",
      description: document.description || "",
      translationKey: document.translationKey || null,
      bodyMarkdown: document.bodyMarkdown || "",
      bodyText: document.bodyText || "",
      bodyHtml: document.bodyHtml || "",
      frontMatterJson: json(document.frontMatter),
      draft: flag(document.draft),
      hidden: flag(document.hidden),
      searchable: flag(document.searchable),
      tagsText: tags.map((tag) => tag.label).join(" "),
      generated: flag(document.generated),
    };
  });
  const routeRows = projection.documents.flatMap((document) =>
    (document.routes || []).map((route) => ({
      documentKey: document.documentKey,
      path: route.path,
      kind: route.kind,
    })),
  );
  const tagRowsByKey = new Map();
  const documentTagRows = [];
  const linkRows = [];

  for (const document of projection.documents) {
    for (const [position, tag] of uniqueTagRecords(document.tags).entries()) {
      tagRowsByKey.set(`${document.lang}\u0000${tag.slug}`, {
        lang: document.lang,
        label: tag.label,
        slug: tag.slug,
      });
      documentTagRows.push({
        documentKey: document.documentKey,
        lang: document.lang,
        slug: tag.slug,
        position,
      });
    }

    for (const [ordinal, link] of (document.links || []).entries()) {
      linkRows.push({
        documentKey: document.documentKey,
        ordinal,
        targetPath: link.targetPath || null,
        href: link.href,
        label: link.label || "",
        external: flag(link.external),
      });
    }
  }

  const statements = [
    db.prepare(`
      INSERT INTO sources (
        path, blob_sha, commit_sha, source_lang, raw_markdown,
        frontmatter_json, projector_version, last_seen_run_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        blob_sha = excluded.blob_sha,
        commit_sha = excluded.commit_sha,
        source_lang = excluded.source_lang,
        raw_markdown = excluded.raw_markdown,
        frontmatter_json = excluded.frontmatter_json,
        projector_version = excluded.projector_version,
        last_seen_run_id = excluded.last_seen_run_id
    `).bind(
      source.path,
      source.blobSha,
      source.commitSha || null,
      source.lang,
      source.normalizedMarkdown,
      json(source.frontMatter),
      source.projectorVersion,
      runId,
    ),
    db.prepare(`
      INSERT OR IGNORE INTO source_revisions (path, blob_sha, commit_sha)
      VALUES (?, ?, ?)
    `).bind(source.path, source.blobSha, source.commitSha || null),
    db.prepare(`
      DELETE FROM routes
      WHERE document_id IN (SELECT id FROM documents WHERE source_path = ?)
    `).bind(source.path),
    db.prepare(`
      DELETE FROM document_tags
      WHERE document_id IN (SELECT id FROM documents WHERE source_path = ?)
    `).bind(source.path),
    db.prepare(`
      DELETE FROM links
      WHERE source_document_id IN (SELECT id FROM documents WHERE source_path = ?)
    `).bind(source.path),
  ];

  statements.push(db.prepare(`
    INSERT INTO documents (
      document_key, source_path, lang, kind, section, title, date,
      summary, description, translation_key, body_markdown, body_text,
      body_html, frontmatter_json, draft, hidden, searchable, tags_text,
      generated, updated_at
    )
    SELECT
      json_extract(value, '$.documentKey'),
      json_extract(value, '$.sourcePath'),
      json_extract(value, '$.lang'),
      json_extract(value, '$.kind'),
      json_extract(value, '$.section'),
      json_extract(value, '$.title'),
      json_extract(value, '$.date'),
      json_extract(value, '$.summary'),
      json_extract(value, '$.description'),
      json_extract(value, '$.translationKey'),
      json_extract(value, '$.bodyMarkdown'),
      json_extract(value, '$.bodyText'),
      json_extract(value, '$.bodyHtml'),
      json_extract(value, '$.frontMatterJson'),
      json_extract(value, '$.draft'),
      json_extract(value, '$.hidden'),
      json_extract(value, '$.searchable'),
      json_extract(value, '$.tagsText'),
      json_extract(value, '$.generated'),
      CURRENT_TIMESTAMP
    FROM json_each(?)
    WHERE 1
    ON CONFLICT(document_key) DO UPDATE SET
      source_path = excluded.source_path,
      lang = excluded.lang,
      kind = excluded.kind,
      section = excluded.section,
      title = excluded.title,
      date = excluded.date,
      summary = excluded.summary,
      description = excluded.description,
      translation_key = excluded.translation_key,
      body_markdown = excluded.body_markdown,
      body_text = excluded.body_text,
      body_html = excluded.body_html,
      frontmatter_json = excluded.frontmatter_json,
      draft = excluded.draft,
      hidden = excluded.hidden,
      searchable = excluded.searchable,
      tags_text = excluded.tags_text,
      generated = excluded.generated,
      updated_at = CURRENT_TIMESTAMP
  `).bind(JSON.stringify(documentRows)));

  const documentKeys = projection.documents.map((document) => document.documentKey);
  if (documentKeys.length > 0) {
    statements.push(
      db.prepare(`
        DELETE FROM documents
        WHERE source_path = ?
          AND document_key NOT IN (${documentKeys.map(() => "?").join(", ")})
      `).bind(source.path, ...documentKeys),
    );
  } else {
    statements.push(db.prepare("DELETE FROM documents WHERE source_path = ?").bind(source.path));
  }

  if (routeRows.length) {
    statements.push(db.prepare(`
      INSERT INTO routes (path, document_id, kind)
      SELECT
        json_extract(rows.value, '$.path'),
        documents.id,
        json_extract(rows.value, '$.kind')
      FROM json_each(?) AS rows
      JOIN documents
        ON documents.document_key = json_extract(rows.value, '$.documentKey')
    `).bind(JSON.stringify(routeRows)));
  }

  const tagRows = [...tagRowsByKey.values()];
  if (tagRows.length) {
    statements.push(db.prepare(`
      INSERT INTO tags (lang, label, slug)
      SELECT
        json_extract(value, '$.lang'),
        json_extract(value, '$.label'),
        json_extract(value, '$.slug')
      FROM json_each(?)
      WHERE 1
      ON CONFLICT(lang, slug) DO UPDATE SET label = excluded.label
    `).bind(JSON.stringify(tagRows)));
  }

  if (documentTagRows.length) {
    statements.push(db.prepare(`
      INSERT INTO document_tags (document_id, tag_id, position)
      SELECT
        documents.id,
        tags.id,
        json_extract(rows.value, '$.position')
      FROM json_each(?) AS rows
      JOIN documents
        ON documents.document_key = json_extract(rows.value, '$.documentKey')
      JOIN tags
        ON tags.lang = json_extract(rows.value, '$.lang')
       AND tags.slug = json_extract(rows.value, '$.slug')
    `).bind(JSON.stringify(documentTagRows)));
  }

  if (linkRows.length) {
    statements.push(db.prepare(`
      INSERT INTO links (
        source_document_id, ordinal, target_path, target_document_id,
        href, label, external
      )
      SELECT
        documents.id,
        json_extract(rows.value, '$.ordinal'),
        json_extract(rows.value, '$.targetPath'),
        NULL,
        json_extract(rows.value, '$.href'),
        json_extract(rows.value, '$.label'),
        json_extract(rows.value, '$.external')
      FROM json_each(?) AS rows
      JOIN documents
        ON documents.document_key = json_extract(rows.value, '$.documentKey')
    `).bind(JSON.stringify(linkRows)));
  }

  await db.batch(statements);
}

export async function deleteSources(db, paths) {
  if (!paths.length) return;
  await db
    .prepare("DELETE FROM sources WHERE path IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(paths))
    .run();
}

export async function finishProjection(db) {
  await db.batch([
    db.prepare(`
      UPDATE links
      SET target_document_id = (
        SELECT routes.document_id FROM routes
        WHERE routes.path = links.target_path
        LIMIT 1
      )
      WHERE external = 0
    `),
    db.prepare(`
      UPDATE links
      SET target_document_id = (
        SELECT routes.document_id FROM routes
        WHERE routes.path = '/es' || links.target_path
        LIMIT 1
      )
      WHERE external = 0
        AND target_document_id IS NULL
        AND target_path LIKE '/%'
        AND target_path NOT LIKE '/es/%'
        AND source_document_id IN (
          SELECT id FROM documents WHERE lang = 'es'
        )
    `),
    db.prepare(`
      DELETE FROM tags
      WHERE id NOT IN (SELECT DISTINCT tag_id FROM document_tags)
    `),
  ]);
}

export async function contentStats(db) {
  const result = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM sources) AS sources,
      (SELECT COUNT(*) FROM documents) AS documents,
      (SELECT COUNT(*) FROM documents WHERE searchable = 1) AS searchable,
      (SELECT COUNT(*) FROM routes WHERE kind = 'canonical') AS canonical_routes,
      (SELECT COUNT(*) FROM routes WHERE kind = 'alias') AS alias_routes
  `).first();

  return result || {};
}
