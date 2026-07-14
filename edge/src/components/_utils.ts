import type { Language, TagItem } from "./types";

export function displayDate(value?: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value);
}

export function tagSlug(tag: TagItem): string {
  if (tag.slug) return tag.slug;
  return tag.label
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function tagHref(tag: TagItem, lang: Language): string {
  if (tag.href) return tag.href;
  return `${lang === "es" ? "/es" : ""}/tags/${tagSlug(tag)}/`;
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value ?? {}).replaceAll("<", "\\u003c");
}

export function plainExcerpt(value: string, length = 92): string {
  const plain = value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > length ? `${plain.slice(0, length - 1).trimEnd()}…` : plain;
}
