#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { authorEditorHtml } from "../functions/_lib/editor-template.js";

const PORT = Number(process.env.AUTHOR_PORT || 3001);
const HOST = "127.0.0.1";
const SITE_PORT = String(process.env.SITE_PORT || "3010");
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || `http://127.0.0.1:${SITE_PORT}`);
const AUTHOR_ORIGINS = new Set([
  `http://${HOST}:${PORT}`,
  `http://localhost:${PORT}`,
  SITE_ORIGIN,
  `http://localhost:${SITE_PORT}`,
]);
const REPO_ROOT = process.cwd();
const CONTENT_ROOTS = ["content_es", "content_en"];
const UPLOAD_ROOT = "static/uploads";
const MAX_JSON_BYTES = 12 * 1024 * 1024;
const TIME_ZONE = "America/Mexico_City";
const MONTHS_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
  });
  res.end();
}

function applyCors(req, res) {
  const origin = req.headers.origin;

  if (!origin) {
    return true;
  }

  if (!AUTHOR_ORIGINS.has(origin)) {
    return false;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on("data", (chunk) => {
      size += chunk.length;

      if (size > MAX_JSON_BYTES) {
        reject(new Error("La peticion es demasiado grande."));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    req.on("error", reject);
  });
}

function normalizeRepoPath(relativePath) {
  if (!relativePath || typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error("Ruta invalida.");
  }

  const normalized = path.normalize(relativePath).replaceAll("\\", "/");

  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Ruta fuera del repositorio.");
  }

  return normalized;
}

function safePath(relativePath, allowedRoots) {
  const normalized = normalizeRepoPath(relativePath);
  const allowed = allowedRoots.some((root) => normalized === root || normalized.startsWith(`${root}/`));

  if (!allowed) {
    throw new Error("Ruta no permitida.");
  }

  const absolutePath = path.resolve(REPO_ROOT, normalized);

  if (!absolutePath.startsWith(`${REPO_ROOT}${path.sep}`)) {
    throw new Error("Ruta fuera del repositorio.");
  }

  return { relativePath: normalized, absolutePath };
}

function safeContentPath(relativePath) {
  return safePath(relativePath, CONTENT_ROOTS);
}

function safeUploadPath(relativePath) {
  return safePath(relativePath, [UPLOAD_ROOT]);
}

function dateInMexico() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function ensureDate(value) {
  const date = value || dateInMexico();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("La fecha debe usar formato YYYY-MM-DD.");
  }

  const [, month, day] = date.split("-").map(Number);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("La fecha debe tener mes y dia validos.");
  }

  return date;
}

function slugify(value, separator = "-") {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
}

function ensureSlug(value, separator = "-") {
  const slug = slugify(value, separator);

  if (!slug) {
    throw new Error("No se pudo generar un slug.");
  }

  return slug;
}

function parseScalar(value) {
  const trimmed = value.trim();

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function splitMarkdown(text) {
  const normalized = text.replaceAll("\r\n", "\n");

  if (!normalized.startsWith("---\n")) {
    return { frontMatter: {}, body: normalized };
  }

  const end = normalized.indexOf("\n---", 4);

  if (end === -1) {
    return { frontMatter: {}, body: normalized };
  }

  const rawFrontMatter = normalized.slice(4, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n/, "");
  const frontMatter = {};

  for (const line of rawFrontMatter.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (match) {
      frontMatter[match[1]] = parseScalar(match[2]);
    }
  }

  return { frontMatter, body };
}

function quoteYaml(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function formatYamlValue(value, key) {
  if (Array.isArray(value)) {
    return `[${value.map(quoteYaml).join(", ")}]`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (value === "") {
    return '""';
  }
  if (key === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  return quoteYaml(value);
}

function formatMarkdown(frontMatter, body) {
  const priority = ["title", "date", "draft", "tags", "summary", "description", "hidden"];
  const keys = [
    ...priority.filter((key) => Object.prototype.hasOwnProperty.call(frontMatter, key)),
    ...Object.keys(frontMatter)
      .filter((key) => !priority.includes(key))
      .sort(),
  ];
  const lines = ["---"];

  for (const key of keys) {
    const value = frontMatter[key];

    if (value === undefined || value === null) {
      continue;
    }

    lines.push(`${key}: ${formatYamlValue(value, key)}`);
  }

  lines.push("---", "", body.trimStart());
  return `${lines.join("\n").trimEnd()}\n`;
}

function tagsFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  if (!value) {
    return [];
  }

  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function contentPathToUrl(relativePath) {
  const normalized = normalizeRepoPath(relativePath);
  const lang = normalized.startsWith("content_es/") ? "es" : "en";
  const contentRoot = lang === "es" ? "content_es" : "content_en";
  let route = normalized.slice(contentRoot.length).replace(/\.md$/, "");

  route = route.replace(/\/index$/, "/").replace(/\/_index$/, "/");

  if (!route.startsWith("/")) {
    route = `/${route}`;
  }

  const prefix = lang === "es" ? "/es" : "";
  const url = `${prefix}${route}`.replace(/\/+/g, "/");

  return url.endsWith("/") ? url : `${url}/`;
}

function parseMarkdownFile(relativePath) {
  const { absolutePath } = safeContentPath(relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error("El archivo no existe.");
  }

  const { frontMatter, body } = splitMarkdown(readFileSync(absolutePath, "utf8"));

  return {
    path: relativePath,
    frontMatter,
    body,
    url: contentPathToUrl(relativePath),
  };
}

function notebookTitle(frontMatter, slug) {
  return frontMatter.title || slug.replaceAll("-", " ").replaceAll("_", " ");
}

function listNotebooks() {
  const notebooks = [];
  const ignored = new Set(["archives", "tags"]);

  for (const root of CONTENT_ROOTS) {
    const rootPath = path.join(REPO_ROOT, root);

    for (const entry of readdirSync(rootPath, { withFileTypes: true })) {
      if (!entry.isDirectory() || ignored.has(entry.name)) {
        continue;
      }

      const relativePath = `${root}/${entry.name}`;
      const indexPath = `${relativePath}/_index.md`;
      const absoluteIndex = path.join(REPO_ROOT, indexPath);

      if (!existsSync(absoluteIndex)) {
        continue;
      }

      const { frontMatter } = splitMarkdown(readFileSync(absoluteIndex, "utf8"));
      const lang = root === "content_es" ? "es" : "en";

      notebooks.push({
        path: relativePath,
        indexPath,
        lang,
        slug: entry.name,
        title: notebookTitle(frontMatter, entry.name),
        description: frontMatter.description || frontMatter.summary || "",
        url: contentPathToUrl(indexPath),
      });
    }
  }

  return notebooks.sort((a, b) => a.lang.localeCompare(b.lang) || a.title.localeCompare(b.title));
}

function writeContentFile(relativePath, frontMatter, body, overwrite = false) {
  const { absolutePath } = safeContentPath(relativePath);

  if (!overwrite && existsSync(absolutePath)) {
    throw new Error("Ya existe un archivo con esa ruta.");
  }

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, formatMarkdown(frontMatter, body), "utf8");

  return {
    path: relativePath,
    url: contentPathToUrl(relativePath),
  };
}

function createNotebook(payload) {
  const lang = payload.lang === "en" ? "en" : "es";
  const root = lang === "en" ? "content_en" : "content_es";
  const title = String(payload.title || "").trim();

  if (!title) {
    throw new Error("El notebook necesita titulo.");
  }

  const slug = ensureSlug(payload.slug || title);
  const relativePath = `${root}/${slug}/_index.md`;
  const frontMatter = {
    title,
    description: String(payload.description || ""),
    date: ensureDate(payload.date),
    draft: payload.draft !== false,
  };

  if (payload.hidden) {
    frontMatter.hidden = true;
  }

  return writeContentFile(relativePath, frontMatter, String(payload.body || ""), false);
}

function createPost(payload) {
  const title = String(payload.title || "").trim();

  if (!title) {
    throw new Error("La pagina necesita titulo.");
  }

  const notebook = safeContentPath(payload.notebook);
  const notebookIndex = path.join(notebook.absolutePath, "_index.md");

  if (!existsSync(notebook.absolutePath) || !existsSync(notebookIndex)) {
    throw new Error("Notebook invalido.");
  }

  const isWritingNotebook = notebook.relativePath.endsWith("/posts");
  const separator = isWritingNotebook ? "_" : "-";
  const slug = ensureSlug(payload.slug || title, separator);
  const date = ensureDate(payload.date);
  const [year, month] = date.split("-");
  const relativePath = isWritingNotebook
    ? `${notebook.relativePath}/${year}/${MONTHS_ES[Number(month) - 1]}/${slug}.md`
    : `${notebook.relativePath}/${slug}.md`;
  const body = String(payload.body || `# ${title}\n`);
  const frontMatter = {
    title,
    date,
    draft: payload.draft !== false,
    tags: tagsFromValue(payload.tags),
    summary: String(payload.summary || ""),
  };

  if (payload.hidden) {
    frontMatter.hidden = true;
  }

  return writeContentFile(relativePath, frontMatter, body, false);
}

function savePage(payload) {
  const relativePath = normalizeRepoPath(payload.path);
  const current = parseMarkdownFile(relativePath);
  const frontMatter = {
    ...current.frontMatter,
    ...(payload.frontMatter || {}),
  };
  const body = String(payload.body || "");

  return writeContentFile(relativePath, frontMatter, body, true);
}

function uploadImage(payload) {
  const name = String(payload.name || "").trim();
  const match = String(payload.data || "").match(/^data:([^;]+);base64,(.+)$/);

  if (!name || !match) {
    throw new Error("Imagen invalida.");
  }

  const mime = match[1];
  const extension = path.extname(name).toLowerCase();
  const allowed = new Map([
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".png", "image/png"],
    [".gif", "image/gif"],
    [".webp", "image/webp"],
    [".svg", "image/svg+xml"],
  ]);

  if (!allowed.has(extension) || allowed.get(extension) !== mime) {
    throw new Error("Formato de imagen no permitido.");
  }

  const date = dateInMexico();
  const [year, month] = date.split("-");
  const baseName = ensureSlug(path.basename(name, extension));
  const relativePath = `${UPLOAD_ROOT}/${year}/${month}/${baseName}${extension}`;
  const { absolutePath } = safeUploadPath(relativePath);
  const buffer = Buffer.from(match[2], "base64");

  if (buffer.length > MAX_JSON_BYTES) {
    throw new Error("La imagen es demasiado grande.");
  }

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, buffer);

  const url = `/${relativePath.replace(/^static\//, "")}`;
  const alt = String(payload.alt || path.basename(name, extension)).trim();

  return {
    path: relativePath,
    url,
    markdown: `![${alt}](${url})`,
  };
}

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (!applyCors(req, res)) {
    sendJson(res, 403, { error: "Origen no permitido." });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    redirect(res, SITE_ORIGIN + "/es/");
    return;
  }

  if (req.method === "GET" && url.pathname === "/editor") {
    sendHtml(res, authorEditorHtml({ siteOrigin: SITE_ORIGIN, assetOrigin: SITE_ORIGIN, apiBase: "/api" }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/notebooks") {
    sendJson(res, 200, { notebooks: listNotebooks() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/page") {
    sendJson(res, 200, parseMarkdownFile(url.searchParams.get("path")));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/create-notebook") {
    sendJson(res, 200, createNotebook(await readJson(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/create-post") {
    sendJson(res, 200, createPost(await readJson(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/save-page") {
    sendJson(res, 200, savePage(await readJson(req)));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/upload-image") {
    sendJson(res, 200, uploadImage(await readJson(req)));
    return;
  }

  sendJson(res, 404, { error: "Ruta no encontrada." });
}

const server = createServer((req, res) => {
  route(req, res).catch((error) => {
    sendJson(res, 400, { error: error.message });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Author API listening on http://${HOST}:${PORT}`);
});
