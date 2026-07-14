import YAML from "yaml";
import { marked, Renderer, walkTokens } from "marked";

const CONTENT_ROOTS = {
  content_en: "en",
  content_es: "es",
};

const BOOK_STATUS_LABELS_ES = {
  read: "Leído",
  "currently-reading": "Leyendo",
  "to-read": "Por leer",
};

const BOOK_TAGS_ES = {
  book: "libro",
  read: "leído",
  "currently-reading": "leyendo",
  "to-read": "por-leer",
};

const BOOK_BODY_REPLACEMENTS_ES = [
  ["**Progress:** not set", "**Progreso:** sin registrar"],
  ["**Status:** Currently reading", "**Estado:** Leyendo"],
  ["**Status:** Want to read", "**Estado:** Por leer"],
  ["**Status:** Read", "**Estado:** Leído"],
  ["**Additional contributors:**", "**Colaboradores adicionales:**"],
  ["**Author:**", "**Autor:**"],
  ["**Progress:**", "**Progreso:**"],
  ["**My rating:**", "**Mi calificación:**"],
  ["**Added:**", "**Añadido:**"],
  ["**Finished:**", "**Terminado:**"],
  ["**Published:**", "**Publicado:**"],
  ["**Publisher:**", "**Editorial:**"],
  ["**Format:**", "**Formato:**"],
  ["**Pages:**", "**Páginas:**"],
  ["## My review", "## Mi reseña"],
  ["[View on Goodreads]", "[Ver en Goodreads]"],
];

const MARKED_OPTIONS = {
  breaks: true,
  gfm: true,
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeMarkdownUrl(value) {
  const url = String(value || "").trim();
  if (!url) return null;
  if (/^(?:https?:|mailto:|tel:|\/\/|\/|\.\.?\/|#|\?)/i.test(url)) return url;
  return url.includes(":") ? null : url;
}

const SAFE_RENDERER = new Renderer();
const renderSafeLink = SAFE_RENDERER.link.bind(SAFE_RENDERER);
const renderSafeImage = SAFE_RENDERER.image.bind(SAFE_RENDERER);

SAFE_RENDERER.html = () => "<!-- raw HTML omitted -->";
SAFE_RENDERER.link = function link(token) {
  const href = safeMarkdownUrl(token.href);
  if (!href) return this.parser.parseInline(token.tokens || []);
  return `${renderSafeLink({ ...token, href })}\n`;
};
SAFE_RENDERER.image = function image(token) {
  const href = safeMarkdownUrl(token.href);
  if (!href) return escapeHtml(token.text);
  return renderSafeImage({ ...token, href });
};

export function normalizeMarkdown(rawMarkdown) {
  return String(rawMarkdown ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

export function parseMarkdown(rawMarkdown) {
  const normalizedMarkdown = normalizeMarkdown(rawMarkdown);
  const lines = normalizedMarkdown.split("\n");

  if (lines[0]?.trim() !== "---") {
    return {
      normalizedMarkdown,
      frontMatter: {},
      bodyMarkdown: normalizedMarkdown,
    };
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && ["---", "..."].includes(line.trim()),
  );

  if (closingIndex === -1) {
    return {
      normalizedMarkdown,
      frontMatter: {},
      bodyMarkdown: normalizedMarkdown,
    };
  }

  const yamlSource = lines.slice(1, closingIndex).join("\n");
  const parsed = YAML.parse(yamlSource, { prettyErrors: true, strict: true });

  if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) {
    throw new TypeError("Markdown front matter must be a YAML mapping.");
  }

  return {
    normalizedMarkdown,
    frontMatter: parsed ?? {},
    bodyMarkdown: lines.slice(closingIndex + 1).join("\n").replace(/^\n/, ""),
  };
}

export function normalizeContentPath(value) {
  const sourcePath = String(value ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .normalize("NFC");
  const parts = sourcePath.split("/");

  if (
    parts.some((part) => !part || part === "." || part === "..") ||
    !Object.hasOwn(CONTENT_ROOTS, parts[0]) ||
    !sourcePath.endsWith(".md")
  ) {
    throw new TypeError(`Unsupported content path: ${value}`);
  }

  return sourcePath;
}

function normalizePagePath(value, lang) {
  let route = String(value ?? "")
    .trim()
    .split(/[?#]/, 1)[0]
    .replace(/\\/g, "/")
    .normalize("NFC");

  if (!route.startsWith("/")) route = `/${route}`;
  route = route.replace(/\/{2,}/g, "/");

  if (lang === "es" && route !== "/es" && !route.startsWith("/es/")) {
    route = `/es${route}`;
  }

  if (route === "/es") route = "/es/";
  if (route === "") route = "/";

  const lastSegment = route.split("/").filter(Boolean).at(-1) ?? "";
  if (route !== "/" && !route.endsWith("/") && !lastSegment.includes(".")) {
    route += "/";
  }

  return route;
}

function sourceParts(sourcePath) {
  const normalizedPath = normalizeContentPath(sourcePath);
  const [root, ...relativeParts] = normalizedPath.split("/");
  const filename = relativeParts.at(-1);
  const stem = filename.slice(0, -3);

  return {
    sourcePath: normalizedPath,
    lang: CONTENT_ROOTS[root],
    relativeParts,
    filename,
    stem,
  };
}

export function routeForSource(sourcePath, frontMatter = {}) {
  const parts = sourceParts(sourcePath);

  if (typeof frontMatter.url === "string" && frontMatter.url.trim()) {
    return normalizePagePath(frontMatter.url, parts.lang);
  }

  const routeParts = parts.relativeParts.slice(0, -1);
  if (!["_index", "index"].includes(parts.stem)) {
    const slug =
      typeof frontMatter.slug === "string" && frontMatter.slug.trim()
        ? frontMatter.slug.trim().replace(/^\/+|\/+$/g, "")
        : parts.stem;
    routeParts.push(slug);
  }

  return normalizePagePath(routeParts.join("/"), parts.lang);
}

function kindForSource(sourcePath) {
  const { relativeParts, stem } = sourceParts(sourcePath);

  if (relativeParts.length === 1 && stem === "_index") return "home";
  if (stem === "_index") return "section";
  return "page";
}

function sectionForSource(sourcePath) {
  const { relativeParts } = sourceParts(sourcePath);
  return relativeParts.length > 1 ? relativeParts[0] : null;
}

function normalizeAliases(value, lang, canonicalPath) {
  const aliases = Array.isArray(value) ? value : value == null ? [] : [value];
  const seen = new Set([canonicalPath]);

  return aliases.flatMap((alias) => {
    if (typeof alias !== "string" || !alias.trim()) return [];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(alias.trim())) return [];

    const path = normalizePagePath(alias, lang);
    if (seen.has(path)) return [];
    seen.add(path);
    return [path];
  });
}

function normalizeTags(value) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const seen = new Set();

  return values.flatMap((tag) => {
    const normalized = String(tag ?? "").trim().normalize("NFC");
    if (!normalized || seen.has(normalized)) return [];
    seen.add(normalized);
    return [normalized];
  });
}

function optionalText(value) {
  return value === undefined || value === null ? null : String(value);
}

function textFromTokens(tokens) {
  const hasBlockTokens = tokens.some((token) =>
    [
      "blockquote",
      "code",
      "heading",
      "hr",
      "list",
      "paragraph",
      "space",
      "table",
    ].includes(token?.type),
  );

  return tokens
    .map((token) => {
      if (!token || token.type === "html") return "";
      if (token.type === "br") return "\n";
      if (token.type === "image") return String(token.text ?? "");
      if (Array.isArray(token.tokens)) return textFromTokens(token.tokens);
      if (Array.isArray(token.items)) {
        return token.items.map((item) => textFromTokens(item.tokens ?? [])).join("\n");
      }
      if (Array.isArray(token.header) || Array.isArray(token.rows)) {
        const cells = [...(token.header ?? []), ...(token.rows ?? []).flat()];
        return cells.map((cell) => textFromTokens(cell.tokens ?? [])).join(" ");
      }
      return typeof token.text === "string" ? token.text : "";
    })
    .join(hasBlockTokens ? "\n" : "");
}

function normalizeInternalTarget(href, canonicalPath) {
  try {
    const resolved = new URL(href, `https://content.invalid${canonicalPath}`);
    return resolved.pathname.normalize("NFC");
  } catch {
    return null;
  }
}

export function renderMarkdown(bodyMarkdown, canonicalPath = "/") {
  const tokens = marked.lexer(String(bodyMarkdown ?? ""), MARKED_OPTIONS);
  const links = [];

  walkTokens(tokens, (token) => {
    if (token.type !== "link") return;

    const href = String(token.href ?? "");
    const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href);
    links.push({
      href,
      label: textFromTokens(token.tokens ?? []).trim() || String(token.text ?? ""),
      targetPath: external ? null : normalizeInternalTarget(href, canonicalPath),
      external,
    });
  });

  return {
    bodyHtml: marked.parser(tokens, { ...MARKED_OPTIONS, renderer: SAFE_RENDERER }),
    bodyText: textFromTokens(tokens).replace(/[ \t]+\n/g, "\n").trim(),
    links,
  };
}

function applyLegacySummaryTypography(markdown) {
  const escapedQuote = "\uE000";
  return String(markdown ?? "")
    .replaceAll('\\"', escapedQuote)
    .replace(/"([^"\n]+)"/g, "“$1”")
    .replaceAll("...", "…")
    .replaceAll(escapedQuote, '"');
}

export function renderMarkdownSummary(markdown, { wordLimit } = {}) {
  const tokens = marked.lexer(applyLegacySummaryTypography(markdown), MARKED_OPTIONS);
  if (!wordLimit) {
    return marked.parser(tokens, { ...MARKED_OPTIONS, renderer: SAFE_RENDERER });
  }

  const summaryTokens = [];
  let words = 0;
  for (const token of tokens) {
    summaryTokens.push(token);
    if (token.type === "space") continue;
    words += textFromTokens([token]).trim().split(/\s+/).filter(Boolean).length;
    if (words >= wordLimit) break;
  }
  return marked.parser(summaryTokens, { ...MARKED_OPTIONS, renderer: SAFE_RENDERER });
}

function createDocument({
  sourcePath,
  lang,
  kind,
  section,
  frontMatter,
  bodyMarkdown,
  generated,
  canonicalPath,
}) {
  const draft = frontMatter.draft === true;
  const basename = sourcePath.split("/").at(-1);
  const hidden = frontMatter.hidden === true || basename.startsWith("no_post");
  const searchable =
    kind === "page" && !draft && !hidden && frontMatter.search !== false;
  const aliases = normalizeAliases(frontMatter.aliases, lang, canonicalPath);
  const rendered = renderMarkdown(bodyMarkdown, canonicalPath);
  const explicitTranslationKey = optionalText(frontMatter.translationKey)?.trim();
  const implicitTranslationKey = `source:${sourceParts(sourcePath).relativeParts.join("/")}`;

  return {
    documentKey: `${sourcePath}::${lang}`,
    sourcePath,
    lang,
    kind,
    section,
    title: optionalText(frontMatter.title),
    date: optionalText(frontMatter.date),
    summary: optionalText(frontMatter.summary),
    description: optionalText(frontMatter.description),
    translationKey: explicitTranslationKey || implicitTranslationKey,
    bodyMarkdown,
    bodyText: rendered.bodyText,
    bodyHtml: rendered.bodyHtml,
    frontMatter,
    draft,
    hidden,
    searchable,
    tags: normalizeTags(frontMatter.tags),
    generated,
    routes: [
      { path: canonicalPath, kind: "canonical" },
      ...aliases.map((path) => ({ path, kind: "alias" })),
    ],
    links: rendered.links,
  };
}

function isCanonicalEnglishBook(sourcePath) {
  return /^content_en\/books\/[^/]+\.md$/.test(sourcePath) &&
    !sourcePath.endsWith("/_index.md");
}

export function generateSpanishBook(frontMatter, bodyMarkdown) {
  const translatedBody = BOOK_BODY_REPLACEMENTS_ES.reduce(
    (body, [from, to]) => body.replaceAll(from, to),
    bodyMarkdown,
  );
  const author = optionalText(frontMatter.book_author) ?? "";
  const status = BOOK_STATUS_LABELS_ES[frontMatter.book_status] ?? "";
  let summary = `De ${author} · ${status}`;

  if (frontMatter.rating) summary += ` · ${frontMatter.rating}/5`;

  return {
    bodyMarkdown: translatedBody,
    frontMatter: {
      ...frontMatter,
      source_body: bodyMarkdown,
      summary,
      tags: normalizeTags(frontMatter.tags).map((tag) => BOOK_TAGS_ES[tag] ?? tag),
    },
  };
}

export function projectSource({
  path,
  rawMarkdown,
  blobSha = null,
  commitSha = null,
  projectorVersion = "1",
}) {
  const sourcePath = normalizeContentPath(path);
  const { lang } = sourceParts(sourcePath);
  const parsed = parseMarkdown(rawMarkdown);
  const canonicalPath = routeForSource(sourcePath, parsed.frontMatter);
  const documents = [
    createDocument({
      sourcePath,
      lang,
      kind: kindForSource(sourcePath),
      section: sectionForSource(sourcePath),
      frontMatter: parsed.frontMatter,
      bodyMarkdown: parsed.bodyMarkdown,
      generated: false,
      canonicalPath,
    }),
  ];

  if (isCanonicalEnglishBook(sourcePath)) {
    const book = generateSpanishBook(parsed.frontMatter, parsed.bodyMarkdown);
    book.frontMatter.source_path = sourcePath;
    const stem = sourcePath.split("/").at(-1).slice(0, -3);

    documents.push(
      createDocument({
        sourcePath,
        lang: "es",
        kind: "page",
        section: "libros",
        frontMatter: book.frontMatter,
        bodyMarkdown: book.bodyMarkdown,
        generated: true,
        canonicalPath: normalizePagePath(`libros/${stem}`, "es"),
      }),
    );
  }

  return {
    source: {
      path: sourcePath,
      blobSha: blobSha == null ? null : String(blobSha),
      commitSha: commitSha == null ? null : String(commitSha),
      projectorVersion: String(projectorVersion),
      lang,
      normalizedMarkdown: parsed.normalizedMarkdown,
      frontMatter: parsed.frontMatter,
      bodyMarkdown: parsed.bodyMarkdown,
    },
    documents,
  };
}
