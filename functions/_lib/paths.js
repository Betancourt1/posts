import { projectionSourcePath } from "./content-storage.js";

export const CONTENT_ROOTS = ["content", "content_es", "content_en"];
export const UPLOAD_ROOT = "static/uploads";

const CONVERSATORIO = "/posts/2025/noviembre/conversatorio/";
export const STORED_ROUTE_OVERRIDES = Object.freeze({
  [CONVERSATORIO]: CONVERSATORIO + "alternate/",
  ["/es" + CONVERSATORIO]: CONVERSATORIO,
});

export const RETIRED_ALTERNATE_MAIN_PATHS = Object.freeze([
  "/about/",
  "/posts/2026/septiembre/tecno_fatalismo/",
  "/proyectos-profesionales/mibici_junio_2026/",
]);

export function sitePathForStoredRoute(path) {
  if (Object.hasOwn(STORED_ROUTE_OVERRIDES, path)) return STORED_ROUTE_OVERRIDES[path];
  if (!path?.startsWith("/es/")) return path;
  return path.slice(3).replace(/^\/libros\//, "/books/").replace(/^\/visitas\//, "/guestbook/");
}

export function storedRouteForSitePath(path) {
  return Object.keys(STORED_ROUTE_OVERRIDES).find((stored) => STORED_ROUTE_OVERRIDES[stored] === path);
}

export function legacySourcePrefix(path) {
  return projectionSourcePath(path).startsWith("content_es/") ? "/es" : "";
}

export function legacyRouteForSitePath(path) {
  return "/es" + path.replace(/^\/books\//, "/libros/").replace(/^\/guestbook\//, "/visitas/");
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

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
  const path = projectionSourcePath(safeContentPath(value));
  const root = path.split("/")[0];
  const prefix = legacySourcePrefix(path);
  let route = path.slice(root.length).replace(/\.md$/, "");

  route = route.replace(/\/index$/, "/").replace(/\/_index$/, "/");
  if (!route.startsWith("/")) {
    route = `/${route}`;
  }

  const url = `${prefix}${route}`.replace(/\/+/g, "/");
  return sitePathForStoredRoute(url.endsWith("/") ? url : `${url}/`);
}

export function uploadPathToUrl(path) {
  const safePath = safeUploadPath(path);
  return `/${safePath.replace(/^static\//, "")}`;
}
