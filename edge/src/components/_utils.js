/**
 * @typedef {import("./types").Language} Language
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

export function tagHref(tag, lang) {
  if (tag.href) return tag.href;
  return `${lang === "es" ? "/es" : ""}/tags/${tagSlug(tag)}/`;
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
