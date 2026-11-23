/**
 * @typedef {import("./types").TagItem} TagItem
 */

export function displayDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value);
}

export function tagSlug(tag) {
  if (tag.slug) return tag.slug;
  return tag.label
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function tagHref(tag) {
  if (tag.href) return tag.href;
  return `/tags/${tagSlug(tag)}/`;
}

export function safeJson(value) {
  return JSON.stringify(value ?? {}).replaceAll("<", "\\u003c");
}

export function plainExcerpt(value, length = 92) {
  const plain = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length - 1).trimEnd()}…` : plain;
}

export function normalizeBookProgress(value) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;

  const progress = Number(value);
  if (!Number.isFinite(progress)) return null;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export function previewBookCoverUrl(value) {
  if (typeof value !== "string" || !value.startsWith("https://")) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  const originalPathname = url.pathname;

  if (url.hostname === "covers.openlibrary.org") {
    url.pathname = url.pathname.replace(/-L(\.jpe?g)$/i, "-M$1");
  } else if (url.hostname === "is1-ssl.mzstatic.com") {
    url.pathname = url.pathname.replace(/\/600x600bb\.jpg$/i, "/120x180bb.jpg");
  } else if (url.hostname === "images-na.ssl-images-amazon.com") {
    url.pathname = url.pathname.replace(/\.01\.LZZZZZZZ(\.jpe?g)$/i, ".01._SL120_$1");
  } else if (
    url.hostname === "m.media-amazon.com"
    && url.pathname.includes("/compressed.photo.goodreads.com/")
  ) {
    url.pathname = url.pathname.replace(/(\.jpe?g)$/i, "._SX120_$1");
  }

  return url.pathname === originalPathname ? value : url.toString();
}

const BOOK_STATUS_SHELVES = new Set([
  "currently-reading",
  "to-read",
  "read",
  "leyendo",
  "por-leer",
  "leído",
  "leido",
]);

export function normalizeBookshelves(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const shelves = [];
  for (const item of value) {
    const slug = String(item || "").trim();
    const key = slug.toLocaleLowerCase("es");
    if (!slug || BOOK_STATUS_SHELVES.has(key) || seen.has(key)) continue;
    seen.add(key);
    shelves.push(slug);
  }
  return shelves;
}

export function formatShelfLabel(slug) {
  const clean = String(slug || "").trim().replace(/[-_]+/g, " ");
  if (!clean) return "";
  return clean.charAt(0).toLocaleUpperCase("es") + clean.slice(1);
}

export function bookReadYear(dateRead) {
  if (!dateRead) return "";
  const match = String(dateRead instanceof Date ? dateRead.toISOString() : dateRead).match(/^(\d{4})/);
  return match ? match[1] : "";
}

export function stripBookMetadataHtml(bodyHtml) {
  let html = String(bodyHtml || "").trim();
  if (!html) return "";

  const metaParagraph = /^<p>\s*<strong>(?:Author|Autor):<\/strong>[\s\S]*?<\/p>\s*/i;
  if (metaParagraph.test(html)) {
    html = html.replace(metaParagraph, "");
  }

  const goodreadsParagraph = /^<p>\s*<a\b[^>]*>(?:View on Goodreads|Ver en Goodreads)<\/a>\s*<\/p>\s*/i;
  if (goodreadsParagraph.test(html)) {
    html = html.replace(goodreadsParagraph, "");
  }

  return html.trim();
}
