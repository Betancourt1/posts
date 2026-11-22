import { MOVED_CONTENT_SOURCES } from "./content-source-paths.js";

const contentStoragePaths = Object.fromEntries(
  Object.entries(MOVED_CONTENT_SOURCES).map(([path, source]) => [source, path]),
);

export function projectionSourcePath(path) {
  const normalized = path?.normalize("NFC");
  return Object.hasOwn(MOVED_CONTENT_SOURCES, normalized) ? MOVED_CONTENT_SOURCES[normalized] : path;
}

export function contentStoragePath(path) {
  const normalized = path?.normalize("NFC");
  return Object.hasOwn(contentStoragePaths, normalized) ? contentStoragePaths[normalized] : path;
}

export function isNotebookIndex(path) {
  return projectionSourcePath(path)?.endsWith("/_index.md") || false;
}

export function mergedNotebookPath(path) {
  const [, section] = path.split("/");
  if (!section || path.startsWith("content/")) return path;
  return `content/${section === "libros" ? "books" : section === "visitas" ? "guestbook" : section}`;
}

export function isMarkdownSource(path) {
  return /^content(?:_en|_es)?\/.+\.md$/.test(path);
}
