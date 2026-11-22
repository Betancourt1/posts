import { isNotebookIndex } from "./content-storage.js";

const EDITOR_KINDS = new Set(["notebook", "post", "image"]);

export function normalizeEditorKind(kind) {
  const normalized = String(kind || "").trim().toLowerCase();
  if (normalized === "photo") return "image";
  return EDITOR_KINDS.has(normalized) ? normalized : "";
}

export function contentEditorKind({ path = "", kind = "", format = "" } = {}) {
  const contentPath = String(path || "").trim();
  const requestedKind = normalizeEditorKind(kind);

  if (isNotebookIndex(contentPath) || requestedKind === "notebook") {
    return "notebook";
  }

  if (
    requestedKind === "image" ||
    String(format || "").trim().toLowerCase() === "image" ||
    /^content(?:_es|_en)?\/fotografia\/.+\.md$/.test(contentPath)
  ) {
    return "image";
  }

  return "post";
}

export function editorPath(kind, prefix = "") {
  const normalizedKind = normalizeEditorKind(kind) || "post";
  const base = String(prefix || "").replace(/\/+$/, "");
  return `${base}/${normalizedKind}-editor`;
}

export function resolveEditorPath(searchParams, prefix = "") {
  return editorPath(contentEditorKind({
    path: searchParams.get("path"),
    kind: searchParams.get("kind"),
    format: searchParams.get("format"),
  }), prefix);
}
