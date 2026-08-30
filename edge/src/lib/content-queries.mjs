import { renderMarkdown } from "./content-projector.mjs";

const SUPPORTED_BODY_TONE = /\{\{(?:green|blue|amber)\|[^{}\n]+\}\}/;

const GRAPH_IGNORED_TAGS = new Set([
  "book",
  "read",
  "currently-reading",
  "to-read",
  "essays",
  "essay",
  "note",
  "quote",
  "libro",
  "leído",
  "leyendo",
  "por-leer",
  "ensayo",
  "nota",
  "zettelkasten",
  "cita",
]);

function documentColumns(alias, { body = false } = {}) {
  return `
    ${alias}.id,
    ${alias}.document_key AS documentKey,
    ${alias}.source_path AS sourcePath,
    ${alias}.lang,
    ${alias}.kind,
    ${alias}.section,
    ${alias}.title,
    ${alias}.date,
    ${alias}.summary,
    ${alias}.description,
    ${alias}.translation_key AS translationKey,
    ${body ? `${alias}.body_markdown AS bodyMarkdown,
    ${alias}.body_text AS bodyText,
    ${alias}.body_html AS bodyHtml,` : ""}
    ${alias}.frontmatter_json AS frontmatterJson,
    ${alias}.draft,
    ${alias}.hidden,
    ${alias}.searchable,
    ${alias}.generated,
    ${alias}.updated_at AS updatedAt,
    COALESCE((
      SELECT json_group_array(json_object(
        'label', ordered_tags.label,
        'slug', ordered_tags.slug
      ))
      FROM (
        SELECT tags.label, tags.slug
        FROM document_tags
        JOIN tags ON tags.id = document_tags.tag_id
        WHERE document_tags.document_id = ${alias}.id
        ORDER BY document_tags.position
      ) AS ordered_tags
    ), '[]') AS tagsJson
  `;
}

function parseJson(value, fallback, field) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new TypeError(`Invalid ${field} JSON in the content projection.`, {
      cause: error,
    });
  }
}

function hydrateDocument(row) {
  if (!row) return null;

  const { frontmatterJson, tagsJson, ...document } = row;
  const hydrated = {
    ...document,
    draft: Boolean(document.draft),
    hidden: Boolean(document.hidden),
    searchable: Boolean(document.searchable),
    generated: Boolean(document.generated),
    frontMatter: parseJson(frontmatterJson, {}, "front matter"),
    tags: parseJson(tagsJson, [], "tags"),
  };

  if (
    typeof hydrated.bodyMarkdown === "string"
    && SUPPORTED_BODY_TONE.test(hydrated.bodyMarkdown)
  ) {
    const rendered = renderMarkdown(
      hydrated.bodyMarkdown,
      hydrated.canonicalPath || hydrated.path || "/",
    );
    hydrated.bodyHtml = rendered.bodyHtml;
    hydrated.bodyText = rendered.bodyText;
  }

  return hydrated;
}

function hydrateDocuments(result) {
  return (result.results || []).map(hydrateDocument);
}

function language(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized !== "en" && normalized !== "es") {
    throw new TypeError(`Unsupported content language: ${value}`);
  }
  return normalized;
}

function positiveLimit(value, fallback, maximum = 1000) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(number)));
}

function visibilityOptions(options = {}) {
  return {
    includeDrafts: options.includeDrafts ? 1 : 0,
    includeHidden: options.includeHidden ? 1 : 0,
  };
}

function documentId(value) {
  const id = Number(value && typeof value === "object" ? value.id : value);
  if (!Number.isInteger(id) || id < 1) {
    throw new TypeError(`Invalid document id: ${value}`);
  }
  return id;
}

function decodedPath(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

export function normalizeRoute(value) {
  let input = value instanceof URL ? value.pathname : String(value ?? "").trim();
  if (!input) return "/";

  input = input.replaceAll("\\", "/");
  let path;
  if (/^https?:\/\//i.test(input)) {
    try {
      path = new URL(input).pathname;
    } catch {
      path = input.split(/[?#]/, 1)[0];
    }
  } else {
    path = input.split(/[?#]/, 1)[0];
  }

  path = decodedPath(path).normalize("NFC").replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  if (path === "/es") path = "/es/";

  const lastSegment = path.split("/").filter(Boolean).at(-1) || "";
  if (path !== "/" && !path.endsWith("/") && !lastSegment.includes(".")) {
    path += "/";
  }

  return path;
}

export async function resolveDocument(db, path, options = {}) {
  const normalizedPath = normalizeRoute(path);
  const { includeDrafts } = visibilityOptions(options);
  const row = await db.prepare(`
    SELECT
      ${documentColumns("d", { body: true })},
      requested.kind AS routeKind,
      requested.path AS requestedPath,
      canonical.path AS canonicalPath,
      canonical.path AS path
    FROM routes AS requested
    JOIN documents AS d ON d.id = requested.document_id
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE requested.path = ?
      AND (? = 1 OR d.draft = 0)
    LIMIT 1
  `).bind(normalizedPath, includeDrafts).first();

  return hydrateDocument(row);
}

export async function documentTags(db, id) {
  const result = await db.prepare(`
    SELECT tags.id, tags.lang, tags.label, tags.slug, document_tags.position
    FROM document_tags
    JOIN tags ON tags.id = document_tags.tag_id
    WHERE document_tags.document_id = ?
    ORDER BY document_tags.position
  `).bind(documentId(id)).all();

  return result.results || [];
}

export async function translationPeer(db, id, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const row = await db.prepare(`
    SELECT
      ${documentColumns("peer")},
      canonical.path AS canonicalPath,
      canonical.path AS path
    FROM documents AS current
    JOIN documents AS peer
      ON peer.translation_key = current.translation_key
     AND peer.lang <> current.lang
    JOIN routes AS canonical
      ON canonical.document_id = peer.id
     AND canonical.kind = 'canonical'
    WHERE current.id = ?
      AND current.translation_key IS NOT NULL
      AND current.translation_key <> ''
      AND (? = 1 OR current.draft = 0)
      AND (? = 1 OR peer.draft = 0)
      AND (? = 1 OR peer.hidden = 0)
    ORDER BY peer.generated, canonical.path
    LIMIT 1
  `).bind(
    documentId(id),
    includeDrafts,
    includeDrafts,
    includeHidden,
  ).first();

  return hydrateDocument(row);
}

export async function sectionItems(db, lang, section, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const includeBody = options.body === true;
  const limit = positiveLimit(options.limit, 500);
  const selectedLanguage = language(lang);

  if (options.includeLanguageFallback) {
    const result = await db.prepare(`
      WITH ranked AS (
        SELECT
          d.id,
          canonical.path,
          ROW_NUMBER() OVER (
            PARTITION BY COALESCE(NULLIF(d.translation_key, ''), d.document_key)
            ORDER BY
              CASE WHEN d.lang = ? THEN 0 ELSE 1 END,
              d.generated ASC,
              canonical.path ASC,
              d.id ASC
          ) AS language_rank
        FROM documents AS d
        JOIN routes AS canonical
          ON canonical.document_id = d.id
         AND canonical.kind = 'canonical'
        WHERE d.section = ?
          AND d.kind = 'page'
          AND (? = 1 OR d.draft = 0)
          AND (? = 1 OR d.hidden = 0)
      )
      SELECT
        ${documentColumns("d", { body: includeBody })},
        ranked.path AS path
      FROM ranked
      JOIN documents AS d ON d.id = ranked.id
      WHERE ranked.language_rank = 1
      ORDER BY
        CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
        d.date DESC,
        d.title COLLATE NOCASE DESC,
        ranked.path DESC
      LIMIT ?
    `).bind(
      selectedLanguage,
      String(section || "").trim(),
      includeDrafts,
      includeHidden,
      limit,
    ).all();

    return hydrateDocuments(result);
  }

  const result = await db.prepare(`
    SELECT
      ${documentColumns("d", { body: includeBody })},
      canonical.path AS path
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE d.lang = ?
      AND d.section = ?
      AND d.kind = 'page'
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    ORDER BY
      CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
      d.date DESC,
      d.title COLLATE NOCASE DESC,
      canonical.path DESC
    LIMIT ?
  `).bind(
    selectedLanguage,
    String(section || "").trim(),
    includeDrafts,
    includeHidden,
    limit,
  ).all();

  return hydrateDocuments(result);
}

export async function navSections(db, lang, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const result = await db.prepare(`
    SELECT
      d.title,
      d.section,
      canonical.path AS path
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE d.lang = ?
      AND (
        d.kind = 'section'
        OR (
          d.kind IN ('home', 'page')
          AND canonical.path IN ('/', '/es/', '/about/', '/es/about/', '/cv/', '/es/cv/')
        )
      )
      AND d.section NOT IN ('archives', 'tags')
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    ORDER BY d.title COLLATE NOCASE, canonical.path
  `).bind(language(lang), includeDrafts, includeHidden).all();

  return result.results || [];
}

export async function archiveItems(db, lang, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const limit = positiveLimit(options.limit, 1000);
  const result = await db.prepare(`
    SELECT
      ${documentColumns("d")},
      canonical.path AS path,
      CASE
        WHEN d.date IS NULL OR d.date = '' THEN NULL
        ELSE substr(d.date, 1, 4)
      END AS year
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE d.lang = ?
      AND d.kind = 'page'
      AND d.section <> ''
      AND d.section <> 'about'
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    ORDER BY
      CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
      d.date DESC,
      d.title COLLATE NOCASE DESC,
      canonical.path DESC
    LIMIT ?
  `).bind(language(lang), includeDrafts, includeHidden, limit).all();

  return hydrateDocuments(result);
}

export async function archiveMonthCounts(db, lang, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const limit = positiveLimit(options.limit, 1000);
  const result = await db.prepare(`
    WITH archive_rows AS (
      SELECT substr(d.date, 1, 7) AS month
      FROM documents AS d
      JOIN routes AS canonical
        ON canonical.document_id = d.id
       AND canonical.kind = 'canonical'
      WHERE d.lang = ?
        AND d.kind = 'page'
        AND d.section <> ''
        AND d.section <> 'about'
        AND (? = 1 OR d.draft = 0)
        AND (? = 1 OR d.hidden = 0)
      ORDER BY
        CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
        d.date DESC,
        d.title COLLATE NOCASE DESC,
        canonical.path DESC
      LIMIT ?
    )
    SELECT month AS key, COUNT(*) AS count
    FROM archive_rows
    WHERE month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `).bind(language(lang), includeDrafts, includeHidden, limit).all();

  return (result.results || []).map(({ key, count }) => ({
    key,
    count: Number(count),
  }));
}

export async function recentPosts(db, lang, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const limit = positiveLimit(options.limit, 10);
  const result = await db.prepare(`
    SELECT
      ${documentColumns("d")},
      canonical.path AS path
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE d.lang = ?
      AND d.kind = 'page'
      AND d.section <> ''
      AND d.section NOT IN ('about', 'cv')
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    ORDER BY
      CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
      d.date DESC,
      d.title COLLATE NOCASE DESC,
      canonical.path DESC
    LIMIT ?
  `).bind(language(lang), includeDrafts, includeHidden, limit).all();

  return hydrateDocuments(result);
}

export async function tagIndex(db, lang, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const result = await db.prepare(`
    SELECT tags.id, tags.lang, tags.label, tags.slug, COUNT(*) AS count
    FROM tags
    JOIN document_tags ON document_tags.tag_id = tags.id
    JOIN documents AS d ON d.id = document_tags.document_id
    WHERE tags.lang = ?
      AND d.kind = 'page'
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    GROUP BY tags.id, tags.lang, tags.label, tags.slug
    ORDER BY tags.label COLLATE NOCASE, tags.slug
  `).bind(language(lang), includeDrafts, includeHidden).all();

  return result.results || [];
}

export async function tagResults(db, lang, slug, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const limit = positiveLimit(options.limit, 500);
  let normalizedSlug = String(slug || "").trim();
  try {
    normalizedSlug = decodeURIComponent(normalizedSlug);
  } catch {
    // A malformed encoded slug cannot match a stored tag.
  }
  normalizedSlug = normalizedSlug.normalize("NFC");

  const result = await db.prepare(`
    SELECT
      ${documentColumns("d", { body: true })},
      canonical.path AS path,
      selected_tag.label AS tagLabel,
      selected_tag.slug AS tagSlug
    FROM tags AS selected_tag
    JOIN document_tags ON document_tags.tag_id = selected_tag.id
    JOIN documents AS d ON d.id = document_tags.document_id
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE selected_tag.lang = ?
      AND selected_tag.slug = ?
      AND d.kind = 'page'
      AND (? = 1 OR d.draft = 0)
      AND (? = 1 OR d.hidden = 0)
    ORDER BY
      CASE WHEN d.date IS NULL OR d.date = '' THEN 1 ELSE 0 END,
      d.date DESC,
      d.title COLLATE NOCASE DESC,
      canonical.path DESC
    LIMIT ?
  `).bind(
    language(lang),
    normalizedSlug,
    includeDrafts,
    includeHidden,
    limit,
  ).all();

  return hydrateDocuments(result);
}

export async function backlinks(db, id, options = {}) {
  const { includeDrafts, includeHidden } = visibilityOptions(options);
  const result = await db.prepare(`
    SELECT
      ${documentColumns("source")},
      canonical.path AS path,
      inbound.ordinal AS linkOrdinal,
      link.href AS linkHref,
      link.label AS linkLabel
    FROM documents AS target
    JOIN (
      SELECT source_document_id, MIN(ordinal) AS ordinal
      FROM links
      WHERE target_document_id = ?
      GROUP BY source_document_id
    ) AS inbound
    JOIN documents AS source ON source.id = inbound.source_document_id
    JOIN links AS link
      ON link.source_document_id = inbound.source_document_id
     AND link.ordinal = inbound.ordinal
    JOIN routes AS canonical
      ON canonical.document_id = source.id
     AND canonical.kind = 'canonical'
    WHERE target.id = ?
      AND source.id <> target.id
      AND source.lang = target.lang
      AND (? = 1 OR source.draft = 0)
      AND (? = 1 OR source.hidden = 0)
    ORDER BY
      CASE WHEN source.date IS NULL OR source.date = '' THEN 1 ELSE 0 END,
      source.date DESC,
      source.title COLLATE NOCASE,
      canonical.path
  `).bind(
    documentId(id),
    documentId(id),
    includeDrafts,
    includeHidden,
  ).all();

  return hydrateDocuments(result);
}

function ftsQuery(value) {
  const terms = String(value || "")
    .normalize("NFC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.slice(0, 8);
  if (!terms?.length) return null;
  return terms.map((term) => `"${term}"*`).join(" AND ");
}

export async function searchDocuments(db, query, lang, limit = 20) {
  const match = ftsQuery(query);
  if (!match) return [];

  const result = await db.prepare(`
    SELECT
      ${documentColumns("d")},
      canonical.path AS path,
      bm25(documents_fts, 8.0, 4.0, 1.0, 2.0) AS rank,
      snippet(documents_fts, 2, '', '', ' … ', 24) AS excerpt
    FROM documents_fts
    JOIN documents AS d ON d.id = documents_fts.rowid
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE documents_fts MATCH ?
      AND d.lang = ?
      AND d.searchable = 1
      AND d.draft = 0
      AND d.hidden = 0
    ORDER BY rank, d.date DESC, d.title COLLATE NOCASE, canonical.path
    LIMIT ?
  `).bind(match, language(lang), positiveLimit(limit, 20, 100)).all();

  return hydrateDocuments(result);
}

function tagPath(lang, slug) {
  return lang === "es" ? `/es/tags/${slug}/` : `/tags/${slug}/`;
}

export async function graphRows(db, lang) {
  const normalizedLanguage = language(lang);
  const result = await db.prepare(`
    SELECT
      d.id AS documentId,
      d.title,
      canonical.path,
      tags.label AS tagLabel,
      tags.slug AS tagSlug,
      document_tags.position AS tagPosition
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    JOIN document_tags ON document_tags.document_id = d.id
    JOIN tags ON tags.id = document_tags.tag_id
    WHERE d.lang = ?
      AND d.kind = 'page'
      AND d.draft = 0
      AND d.hidden = 0
    ORDER BY d.title COLLATE NOCASE, canonical.path, document_tags.position
  `).bind(normalizedLanguage).all();

  const documents = new Map();
  for (const row of result.results || []) {
    const label = String(row.tagLabel || "");
    if (GRAPH_IGNORED_TAGS.has(label.toLocaleLowerCase(normalizedLanguage))) continue;

    if (!documents.has(row.documentId)) {
      documents.set(row.documentId, {
        documentId: row.documentId,
        title: row.title,
        path: row.path,
        tags: [],
      });
    }
    documents.get(row.documentId).tags.push({
      label,
      slug: row.tagSlug,
      path: tagPath(normalizedLanguage, row.tagSlug),
    });
  }

  return [...documents.values()];
}

export async function infrastructureRows(db, lang) {
  const result = await db.prepare(`
    SELECT
      ${documentColumns("d", { body: true })},
      canonical.path AS path
    FROM documents AS d
    JOIN routes AS canonical
      ON canonical.document_id = d.id
     AND canonical.kind = 'canonical'
    WHERE d.lang = ?
      AND d.kind = 'page'
      AND d.draft = 0
      AND d.hidden = 0
    ORDER BY d.section COLLATE NOCASE, d.title COLLATE NOCASE, canonical.path
  `).bind(language(lang)).all();

  return hydrateDocuments(result);
}

export async function latestSyncTimestamp(db) {
  const row = await db.prepare(`
    SELECT finished_at AS finishedAt
    FROM sync_runs
    WHERE status = 'complete'
      AND finished_at IS NOT NULL
    ORDER BY id DESC
    LIMIT 1
  `).first();

  return row?.finishedAt || null;
}
