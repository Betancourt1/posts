export const CONTENT_ROOTS = ["content_es", "content_en"];
export const UPLOAD_ROOT = "static/uploads";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export function normalizeRepoPath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");

  if (!path) {
    throw new Error("Ruta requerida.");
  }
  if (path.startsWith("/") || path.includes("\0")) {
    throw new Error("Ruta invalida.");
  }

  const parts = path.split("/");

  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Ruta fuera del repositorio.");
  }

  return parts.join("/");
}

export function safeContentPath(value) {
  const path = normalizeRepoPath(value);
  const allowed = CONTENT_ROOTS.some((root) => path === root || path.startsWith(`${root}/`));

  if (!allowed || !path.endsWith(".md")) {
    throw new Error("Ruta de contenido no permitida.");
  }

  return path;
}

export function safeNotebookPath(value) {
  const path = normalizeRepoPath(value);
  const allowed = CONTENT_ROOTS.some((root) => path.startsWith(`${root}/`));

  if (!allowed || path.endsWith(".md")) {
    throw new Error("Notebook no permitido.");
  }

  return path;
}

export function safeUploadPath(value) {
  const path = normalizeRepoPath(value);
  const extension = extensionOf(path);

  if (!path.startsWith(`${UPLOAD_ROOT}/`) || !IMAGE_EXTENSIONS.has(extension)) {
    throw new Error("Ruta de imagen no permitida.");
  }

  return path;
}

export function extensionOf(path) {
  const match = String(path).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export function contentPathToUrl(value) {
  const path = safeContentPath(value);
  const lang = path.startsWith("content_es/") ? "es" : "en";
  const root = lang === "es" ? "content_es" : "content_en";
  let route = path.slice(root.length).replace(/\.md$/, "");

  route = route.replace(/\/index$/, "/").replace(/\/_index$/, "/");
  if (!route.startsWith("/")) {
    route = `/${route}`;
  }

  const url = `${lang === "es" ? "/es" : ""}${route}`.replace(/\/+/g, "/");
  return url.endsWith("/") ? url : `${url}/`;
}

export function uploadPathToUrl(path) {
  const safePath = safeUploadPath(path);
  return `/${safePath.replace(/^static\//, "")}`;
}
