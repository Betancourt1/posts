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

const SIDENOTE_DEFINITION = /^\[\^([a-zA-Z0-9_-]+)\]:[ \t]+(.+?)\s*$/;
const SIDENOTE_REFERENCE_PART = /(\[\^(?:[a-zA-Z0-9_-]+)\])/g;
const SIDENOTE_TONE = /\{\{(green|blue|amber)\|([^{}\n]+)\}\}/g;
const SIDENOTE_TONE_OPEN = "\uE100";
const SIDENOTE_TONE_CLOSE = "\uE101";

function createSafeRenderer({ sidenotes = null, hideSidenoteReferences = false, allowSidenoteTones = false } = {}) {
  const renderer = new Renderer();
  const renderSafeLink = renderer.link.bind(renderer);
  const renderSafeImage = renderer.image.bind(renderer);
  const renderSafeText = renderer.text.bind(renderer);
  let linkDepth = 0;

  renderer.html = () => "<!-- raw HTML omitted -->";
  renderer.link = function link(token) {
    const href = safeMarkdownUrl(token.href);
    linkDepth += 1;
    try {
      if (!href) return this.parser.parseInline(token.tokens || []);
      return `${renderSafeLink({ ...token, href })}\n`;
    } finally {
      linkDepth -= 1;
    }
  };
  renderer.image = function image(token) {
    const href = safeMarkdownUrl(token.href);
    if (!href) return escapeHtml(token.text);
    return renderSafeImage({ ...token, href });
  };
  renderer.text = function text(token) {
    const source = String(token.text ?? token.raw ?? "");
    const renderFragment = (part) => renderSafeText({
      ...token,
      raw: part,
      text: part,
      tokens: undefined,
    });
    const pattern = allowSidenoteTones
      ? new RegExp(`(${SIDENOTE_TONE_OPEN}(?:green|blue|amber)${SIDENOTE_TONE_CLOSE}|${SIDENOTE_TONE_CLOSE})`, "g")
      : SIDENOTE_REFERENCE_PART;

    return source.split(pattern).map((part) => {
      if (allowSidenoteTones) {
        if (part === SIDENOTE_TONE_CLOSE) return "</span>";
        const tone = part.match(new RegExp(`^${SIDENOTE_TONE_OPEN}(green|blue|amber)${SIDENOTE_TONE_CLOSE}$`))?.[1];
        if (tone) return `<span class="sidenote-tone sidenote-tone--${tone}">`;
        return renderFragment(part);
      }

      const reference = part.match(/^\[\^([a-zA-Z0-9_-]+)\]$/);
      if (!reference) return renderFragment(part);
      const definition = sidenotes?.definitions.get(reference[1]);
      if (!definition) return renderFragment(part);
      if (linkDepth > 0) return renderFragment(part);
      if (hideSidenoteReferences) return "";

      let note = sidenotes.byId.get(definition.id);
      if (!note) {
        note = { ...definition, number: sidenotes.ordered.length + 1, references: [] };
        sidenotes.byId.set(note.id, note);
        sidenotes.ordered.push(note);
      }
      const occurrence = note.references.length + 1;
      const referenceId = `sidenote-ref-${note.number}-${occurrence}`;
      note.references.push(referenceId);
      return `<sup class="sidenote-reference"><a id="${referenceId}" href="#sidenote-${note.number}" role="doc-noteref">[${note.number}]</a></sup>`;
    }).join("");
  };

  return renderer;
}

function extractSidenoteDefinitions(markdown) {
  const definitions = new Map();
  const bodyLines = [];
  let fence = null;

  for (const line of String(markdown ?? "").split("\n")) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = { character: marker[0], length: marker.length };
      else if (fence.character === marker[0] && marker.length >= fence.length) fence = null;
      bodyLines.push(line);
      continue;
    }

    const match = !fence && line.match(SIDENOTE_DEFINITION);
    if (!match) {
      bodyLines.push(line);
      continue;
    }

    if (!definitions.has(match[1])) {
      definitions.set(match[1], { id: match[1], markdown: match[2] });
    }
  }

  return { markdown: bodyLines.join("\n"), definitions };
}

function markSidenoteTones(markdown) {
  return String(markdown ?? "")
    .replace(/[\uE000-\uF8FF]/g, "")
    .replace(SIDENOTE_TONE, (_, tone, text) =>
      `${SIDENOTE_TONE_OPEN}${tone}${SIDENOTE_TONE_CLOSE}${text}${SIDENOTE_TONE_CLOSE}`);
}

function plainSidenoteMarkdown(markdown) {
  return String(markdown ?? "").replace(SIDENOTE_TONE, "$2");
}

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

function textFromTokens(tokens, { sidenoteDefinitions = null } = {}) {
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
      if (Array.isArray(token.tokens)) return textFromTokens(token.tokens, { sidenoteDefinitions });
      if (Array.isArray(token.items)) {
        return token.items
          .map((item) => textFromTokens(item.tokens ?? [], { sidenoteDefinitions }))
          .join("\n");
      }
      if (Array.isArray(token.header) || Array.isArray(token.rows)) {
        const cells = [...(token.header ?? []), ...(token.rows ?? []).flat()];
        return cells
          .map((cell) => textFromTokens(cell.tokens ?? [], { sidenoteDefinitions }))
          .join(" ");
      }
      if (token.type === "text" && sidenoteDefinitions) {
        return String(token.text ?? "").replace(SIDENOTE_REFERENCE_PART, (reference) => {
          const id = reference.slice(2, -1);
          return sidenoteDefinitions.has(id) ? "" : reference;
        });
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

function collectLinks(tokens, links, canonicalPath) {
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
}

function renderSidenoteEndnotes(sidenotes, links, canonicalPath) {
  if (!sidenotes.ordered.length) return "";

  const items = sidenotes.ordered.map((note) => {
    const markedNote = markSidenoteTones(note.markdown);
    const noteTokens = marked.lexer(markedNote, MARKED_OPTIONS);
    collectLinks(noteTokens, links, canonicalPath);
    const noteHtml = marked.parseInline(markedNote, {
      ...MARKED_OPTIONS,
      renderer: createSafeRenderer({ allowSidenoteTones: true }),
    });
    const backlinks = note.references.map((referenceId, index) =>
      `<a class="sidenote-backlink" href="#${referenceId}" role="doc-backlink">↩${note.references.length > 1 ? ` ${index + 1}` : ""}</a>`
    ).join(" ");
    return `<li class="sidenote-item" id="sidenote-${note.number}" data-sidenote-number="${note.number}"><span class="sidenote-number" aria-hidden="true">${String(note.number).padStart(2, "0")}</span><span class="sidenote-copy">${noteHtml}<span class="sidenote-backlinks">${backlinks}</span></span></li>`;
  }).join("");

  return `<section class="sidenote-endnotes" role="doc-endnotes"><ol class="sidenote-list">${items}</ol></section>`;
}

export function renderMarkdown(bodyMarkdown, canonicalPath = "/") {
  const extracted = extractSidenoteDefinitions(bodyMarkdown);
  const tokens = marked.lexer(extracted.markdown, MARKED_OPTIONS);
  const links = [];
  const sidenotes = {
    definitions: extracted.definitions,
    ordered: [],
    byId: new Map(),
  };

  collectLinks(tokens, links, canonicalPath);
  const bodyHtml = marked.parser(tokens, {
    ...MARKED_OPTIONS,
    renderer: createSafeRenderer({ sidenotes }),
  });
  const endnotesHtml = renderSidenoteEndnotes(sidenotes, links, canonicalPath);
  const noteText = sidenotes.ordered.map((note) => {
    const noteTokens = marked.lexer(plainSidenoteMarkdown(note.markdown), MARKED_OPTIONS);
    return textFromTokens(noteTokens).trim();
  }).filter(Boolean).join("\n");

  return {
    bodyHtml: bodyHtml + endnotesHtml,
    bodyText: [textFromTokens(tokens, { sidenoteDefinitions: extracted.definitions }).replace(/[ \t]+\n/g, "\n").trim(), noteText]
      .filter(Boolean)
      .join("\n"),
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
  const extracted = extractSidenoteDefinitions(applyLegacySummaryTypography(markdown));
  const tokens = marked.lexer(extracted.markdown, MARKED_OPTIONS);
  const renderer = createSafeRenderer({
    sidenotes: { definitions: extracted.definitions, ordered: [], byId: new Map() },
    hideSidenoteReferences: true,
  });
  if (!wordLimit) {
    return marked.parser(tokens, { ...MARKED_OPTIONS, renderer });
  }

  const summaryTokens = [];
  let words = 0;
  for (const token of tokens) {
    summaryTokens.push(token);
    if (token.type === "space") continue;
    words += textFromTokens([token]).trim().split(/\s+/).filter(Boolean).length;
    if (words >= wordLimit) break;
  }
  return marked.parser(summaryTokens, { ...MARKED_OPTIONS, renderer });
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
      tags: normalizeTags(frontMatter.tags),
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
