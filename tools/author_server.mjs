#!/usr/bin/env node

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.AUTHOR_PORT || 3001);
const HOST = "127.0.0.1";
const SITE_PORT = String(process.env.SITE_PORT || "3010");
const SITE_ORIGIN = String(process.env.SITE_ORIGIN || `http://127.0.0.1:${SITE_PORT}`);
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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, html) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Access-Control-Allow-Origin": "*",
  });
  res.end();
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

function authorEditorHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Author Editor</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #050506;
      --panel: #0c0d10;
      --panel-2: #111318;
      --ink: #f2f3f4;
      --muted: #8d949e;
      --line: #23272f;
      --accent: #4ecca3;
      --danger: #ff6b6b;
      --field: #08090b;
      --editor-font: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
    }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      min-height: 100%;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .topbar {
      height: 3.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0 1.25rem;
      border-bottom: 1px solid var(--line);
      background: rgba(5, 5, 6, 0.95);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .brand strong {
      font-size: 0.92rem;
      letter-spacing: 0.02em;
    }
    .status {
      color: var(--muted);
      font-size: 0.78rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 0.55rem;
    }
    button {
      border: 1px solid var(--line);
      border-radius: 0.4rem;
      background: var(--panel-2);
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      min-height: 2.35rem;
      padding: 0.4rem 0.72rem;
    }
    button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #001b14;
      font-weight: 700;
    }
    .primary:hover {
      color: #001b14;
    }
    .typewriter-toggle.is-active {
      border-color: var(--accent);
      color: var(--accent);
    }
    .shell {
      min-height: calc(100vh - 3.5rem);
      display: grid;
      grid-template-columns: minmax(0, 1fr) 20rem;
    }
    .writer {
      display: flex;
      justify-content: center;
      padding: 3rem 1.5rem 5rem;
      overflow: auto;
    }
    .paper {
      width: min(48rem, 100%);
    }
    .title-input,
    .body-input {
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--ink);
      outline: none;
      overflow: hidden;
      resize: none;
      font-family: var(--editor-font);
    }
    .title-input {
      min-height: 5rem;
      margin-bottom: 1.25rem;
      font-size: clamp(2rem, 5vw, 4.4rem);
      font-weight: 800;
      line-height: 1.02;
      letter-spacing: 0;
    }
    .title-input::placeholder,
    .body-input::placeholder {
      color: #444b55;
    }
    .body-input {
      min-height: 58vh;
      font-size: 1.22rem;
      line-height: 1.75;
    }
    .writer.is-typewriter {
      align-items: flex-start;
      padding-top: 1.5rem;
    }
    .writer.is-typewriter .paper {
      width: min(44rem, 100%);
    }
    .writer.is-typewriter .body-input {
      min-height: calc(100vh - 11rem);
      padding-top: 34vh;
      padding-bottom: 42vh;
      border-left: 1px solid transparent;
      overflow: auto;
      resize: vertical;
    }
    .settings {
      border-left: 1px solid var(--line);
      background: var(--panel);
      padding: 1rem;
      overflow: auto;
    }
    .settings h2 {
      margin: 0 0 1rem;
      font-size: 0.88rem;
    }
    .field {
      display: grid;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
      color: var(--muted);
      font-size: 0.76rem;
      font-weight: 700;
    }
    .field input,
    .field select {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid var(--line);
      border-radius: 0.38rem;
      background: var(--field);
      color: var(--ink);
      padding: 0.42rem 0.52rem;
      font: inherit;
      font-size: 0.86rem;
    }
    .field input:focus,
    .field select:focus {
      border-color: var(--accent);
      outline: none;
    }
    .check {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.65rem;
      color: var(--ink);
      font-size: 0.84rem;
      cursor: pointer;
    }
    .utility {
      display: grid;
      gap: 0.55rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--line);
    }
    .path {
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.72rem;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }
    .error {
      color: var(--danger);
    }
    .back-button {
      border: 0;
      background: transparent;
      color: #333333;
      font-size: 1.4rem;
      min-width: 2.25rem;
      padding: 0;
    }
    .saved-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      max-width: min(32rem, calc(100vw - 8rem));
      min-height: 1.55rem;
      padding: 0 0.6rem;
      border: 1px solid #dedede;
      border-radius: 0.28rem;
      background: #ffffff;
      color: #4d4d4d;
      font-size: 0.78rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .saved-pill::before {
      content: "";
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 999px;
      background: #26c281;
    }
    .formatbar {
      max-width: 100vw;
      height: 4.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      border-bottom: 1px solid #eeeeee;
      background: #ffffff;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .formatbar button,
    .formatbar select {
      flex: 0 0 auto;
      border: 0;
      background: transparent;
      color: #444444;
      min-height: 2.2rem;
      padding: 0.25rem 0.45rem;
      font-size: 1rem;
      font-weight: 700;
    }
    .formatbar select {
      width: 5.75rem;
      font-size: 0.9rem;
    }
    .formatbar button:hover,
    .formatbar select:hover {
      background: #f5f5f5;
      color: #1d1d1d;
    }
    .divider {
      width: 1px;
      height: 2.2rem;
      background: #eeeeee;
      margin: 0 0.35rem;
    }
    .subtitle-input {
      width: 100%;
      border: 0;
      background: transparent;
      color: #777777;
      outline: none;
      font-family: var(--editor-font);
      font-size: 1.25rem;
      line-height: 1.5;
      margin-bottom: 1.7rem;
    }
    .subtitle-input::placeholder {
      color: #a3a3a3;
    }
    .author-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      margin-bottom: 2.1rem;
    }
    .author-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 2rem;
      padding: 0 0.75rem;
      border-radius: 999px;
      background: #eeeeee;
      color: #4f4f4f;
      font-size: 0.9rem;
    }
    .author-chip button,
    .author-add {
      border: 0;
      background: transparent;
      color: #8f8f8f;
      min-height: 1.5rem;
      padding: 0;
      font-size: 1.35rem;
      line-height: 1;
    }
    .bottom-left,
    .bottom-right {
      position: fixed;
      bottom: 1.2rem;
      z-index: 20;
      display: flex;
      gap: 0.55rem;
    }
    .bottom-left {
      left: 1.2rem;
    }
    .bottom-right {
      right: 1.2rem;
    }
    .utility-button {
      border: 0;
      border-radius: 0.45rem;
      background: #efefef;
      color: #4a4a4a;
      min-height: 2.7rem;
      padding: 0 0.85rem;
      font-weight: 800;
    }
    .reference-theme {
      --bg: #ffffff;
      --panel: #ffffff;
      --panel-2: #f2f2f2;
      --ink: #303030;
      --muted: #777777;
      --line: #eeeeee;
      --accent: #ff671f;
      --field: #ffffff;
    }
    .reference-theme .topbar {
      height: 4.55rem;
      border-bottom: 0;
      background: #ffffff;
      padding: 0 1.35rem;
    }
    .reference-theme .brand {
      gap: 0.75rem;
    }
    .reference-theme .brand strong {
      display: none;
    }
    .reference-theme .status {
      color: #505050;
      font-size: 0;
    }
    .reference-theme .top-actions button {
      min-height: 3rem;
      border: 0;
      border-radius: 0.55rem;
      padding: 0 1.1rem;
      background: #eeeeee;
      color: #3d3d3d;
      font-weight: 800;
    }
    .reference-theme .top-actions .primary {
      background: #ff671f;
      color: #ffffff;
    }
    .reference-theme .shell {
      min-height: calc(100vh - 9.3rem);
      display: block;
      background: #ffffff;
    }
    .reference-theme .writer {
      padding: 2.4rem 1.5rem 7rem;
    }
    .reference-theme .paper {
      width: min(43rem, 100%);
      margin-left: auto;
      margin-right: auto;
    }
    .reference-theme .title-input {
      min-height: 4.4rem;
      margin-bottom: 0.35rem;
      color: #696969;
      font-family: var(--editor-font);
      font-size: 2.45rem;
      font-weight: 800;
      line-height: 1.15;
    }
    .reference-theme .title-input::placeholder {
      color: #7b7b7b;
    }
    .reference-theme .body-input {
      min-height: 45vh;
      color: #303030;
      font-family: var(--editor-font);
      font-size: 1.32rem;
      line-height: 1.72;
    }
    .reference-theme .body-input::placeholder {
      color: #b7b7b7;
    }
    .reference-theme .settings {
      position: fixed;
      right: 1.2rem;
      bottom: 4.45rem;
      z-index: 30;
      width: min(22rem, calc(100vw - 2.4rem));
      max-height: min(38rem, calc(100vh - 6rem));
      border: 1px solid #e6e6e6;
      border-radius: 0.65rem;
      box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.12);
    }
    .reference-theme .settings[hidden] {
      display: none !important;
    }
    .reference-theme .field input,
    .reference-theme .field select {
      border-color: #e5e5e5;
      background: #ffffff;
      color: #303030;
    }
    .reference-theme .path {
      color: #777777;
    }
    .reference-theme .writer.is-typewriter .body-input {
      min-height: calc(100vh - 17rem);
      padding-top: 30vh;
      padding-bottom: 36vh;
    }
    .reference-theme[data-theme="dark"] {
      background: #000000;
      color: #cfcfd2;
      --panel: #0b0c0f;
      --panel-2: #111318;
      --ink: #e8e8ea;
      --muted: #8a8f98;
      --line: #1c2025;
      --field: #07080a;
    }
    .reference-theme[data-theme="dark"] .topbar,
    .reference-theme[data-theme="dark"] .formatbar,
    .reference-theme[data-theme="dark"] .shell {
      background: #000000;
      border-color: #1c2025;
    }
    .reference-theme[data-theme="dark"] .formatbar {
      border-bottom-color: #1c2025;
    }
    .reference-theme[data-theme="dark"] .formatbar button,
    .reference-theme[data-theme="dark"] .formatbar select,
    .reference-theme[data-theme="dark"] .back-button {
      color: #cfcfd2;
      background: transparent;
    }
    .reference-theme[data-theme="dark"] .formatbar button:hover,
    .reference-theme[data-theme="dark"] .formatbar select:hover {
      color: #4ecca3;
      background: #0b0c0f;
    }
    .reference-theme[data-theme="dark"] .divider {
      background: #1c2025;
    }
    .reference-theme[data-theme="dark"] .saved-pill,
    .reference-theme[data-theme="dark"] .utility-button,
    .reference-theme[data-theme="dark"] .top-actions button {
      border-color: #1c2025;
      background: #111318;
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .top-actions .primary {
      background: #4ecca3;
      color: #001b14;
    }
    .reference-theme[data-theme="dark"] .title-input {
      color: #f2f2f2;
    }
    .reference-theme[data-theme="dark"] .title-input::placeholder {
      color: #777b82;
    }
    .reference-theme[data-theme="dark"] .subtitle-input,
    .reference-theme[data-theme="dark"] .body-input {
      color: #d8d8dc;
    }
    .reference-theme[data-theme="dark"] .subtitle-input::placeholder,
    .reference-theme[data-theme="dark"] .body-input::placeholder {
      color: #6e747d;
    }
    .reference-theme[data-theme="dark"] .author-chip,
    .reference-theme[data-theme="dark"] .settings {
      border-color: #1c2025;
      background: #0b0c0f;
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .field input,
    .reference-theme[data-theme="dark"] .field select {
      border-color: #1c2025;
      background: #07080a;
      color: #cfcfd2;
    }
    .reference-theme[data-theme="dark"] .path {
      color: #7b7f88;
    }
    @media (max-width: 900px) {
      .shell {
        grid-template-columns: 1fr;
      }
      .settings {
        border-left: 0;
        border-top: 1px solid var(--line);
      }
      .writer {
        padding: 2rem 1rem;
      }
      .formatbar {
        justify-content: flex-start;
        padding: 0 1rem;
      }
      .topbar {
        align-items: flex-start;
        height: auto;
        flex-direction: column;
        padding: 0.85rem 1rem;
      }
      .reference-theme .topbar {
        padding: 0.85rem 1rem;
      }
      .reference-theme .saved-pill {
        max-width: calc(100vw - 8rem);
      }
      .top-actions {
        width: 100%;
      }
      .top-actions button {
        flex: 1;
      }
    }
  </style>
</head>
<body class="reference-theme" data-theme="dark">
  <header class="topbar">
    <div class="brand">
      <button type="button" class="back-button" id="back" aria-label="Back">‹</button>
      <strong>Author Editor</strong>
      <span class="saved-pill" id="saved-pill">Saved</span>
      <span class="status" id="status">Loading</span>
    </div>
    <div class="top-actions">
      <button type="button" id="open-site">Preview</button>
      <button type="button" class="primary" id="save">Continue</button>
    </div>
  </header>
  <nav class="formatbar" aria-label="Formatting">
    <button type="button" data-format="undo" title="Undo">↶</button>
    <button type="button" data-format="redo" title="Redo">↷</button>
    <span class="divider"></span>
    <select id="style">
      <option value="">Style</option>
      <option value="heading">Heading</option>
      <option value="quote">Quote</option>
      <option value="code">Code</option>
    </select>
    <span class="divider"></span>
    <button type="button" data-format="bold" title="Bold">B</button>
    <button type="button" data-format="italic" title="Italic"><em>I</em></button>
    <button type="button" data-format="strike" title="Strikethrough">S</button>
    <button type="button" data-format="code" title="Code">&lt;&gt;</button>
    <button type="button" id="typewriter" class="typewriter-toggle" title="Typewriter">T</button>
    <button type="button" data-format="mark" title="Highlight">⌁</button>
    <button type="button" data-format="heading" title="Heading">A⌄</button>
    <span class="divider"></span>
    <button type="button" data-format="link" title="Link">🔗</button>
    <button type="button" id="toolbar-image" title="Image">▧</button>
    <button type="button" data-format="quote" title="Quote">❞</button>
    <span class="divider"></span>
    <button type="button" data-format="ul" title="Bulleted list">☷</button>
    <button type="button" data-format="ol" title="Numbered list">⑴</button>
    <button type="button" data-format="align" title="Typewriter">☰⌄</button>
    <span class="divider"></span>
    <button type="button" data-format="button">Button⌄</button>
    <span class="divider"></span>
    <button type="button" data-format="template">Template⌄</button>
    <span class="divider"></span>
    <button type="button" data-format="more">More⌄</button>
  </nav>
  <main class="shell">
    <section class="writer">
      <article class="paper">
        <div class="path" style="margin-bottom: 2.1rem;">▤ Email header / footer</div>
        <textarea class="title-input" id="title" rows="2" placeholder="Title"></textarea>
        <input class="subtitle-input" id="summary" type="text" placeholder="Add a subtitle..." />
        <div class="author-row">
          <span class="author-chip">Fernando Betancourt Moreno <button type="button" aria-label="Remove author">×</button></span>
          <button type="button" class="author-add" aria-label="Add author">+</button>
        </div>
        <textarea class="body-input" id="body" placeholder="Start writing..."></textarea>
      </article>
    </section>
    <aside class="settings" id="settings" hidden>
      <h2>Post Settings</h2>
      <label class="field" id="notebook-field">
        <span>Notebook</span>
        <select id="notebook"></select>
      </label>
      <label class="field">
        <span>Slug</span>
        <input id="slug" type="text" />
      </label>
      <label class="field">
        <span>Date</span>
        <input id="date" type="date" />
      </label>
      <label class="field">
        <span>Tags</span>
        <input id="tags" type="text" placeholder="ensayo, politica" />
      </label>
      <label class="check">
        <input id="draft" type="checkbox" />
        <span>Draft</span>
      </label>
      <label class="check">
        <input id="hidden" type="checkbox" />
        <span>Hidden</span>
      </label>
      <div class="utility">
        <button type="button" id="image">Add Image</button>
        <button type="button" id="settings-typewriter">Toggle Typewriter</button>
        <input id="image-file" type="file" accept="image/*" hidden />
        <div class="path" id="path"></div>
      </div>
    </aside>
  </main>
  <div class="bottom-left">
    <button type="button" class="utility-button" title="History">↺</button>
    <button type="button" class="utility-button" title="Info">ⓘ</button>
  </div>
  <div class="bottom-right">
    <button type="button" class="utility-button" id="settings-button">⚙ Settings</button>
  </div>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode") || "new";
      var kind = params.get("kind") || "post";
      var theme = params.get("theme") === "light" ? "light" : "dark";
      var siteOrigin = params.get("site") || ${JSON.stringify(SITE_ORIGIN)};
      var sourcePath = params.get("path") || "";
      var preferredNotebook = params.get("notebook") || "";
      var frontMatter = {};
      var savedUrl = "";
      var slugTouched = false;
      var els = {
        status: document.getElementById("status"),
        savedPill: document.getElementById("saved-pill"),
        writer: document.querySelector(".writer"),
        back: document.getElementById("back"),
        title: document.getElementById("title"),
        body: document.getElementById("body"),
        settings: document.getElementById("settings"),
        settingsButton: document.getElementById("settings-button"),
        toolbarImage: document.getElementById("toolbar-image"),
        settingsTypewriter: document.getElementById("settings-typewriter"),
        style: document.getElementById("style"),
        notebookField: document.getElementById("notebook-field"),
        notebook: document.getElementById("notebook"),
        slug: document.getElementById("slug"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        summary: document.getElementById("summary"),
        draft: document.getElementById("draft"),
        hidden: document.getElementById("hidden"),
        typewriter: document.getElementById("typewriter"),
        save: document.getElementById("save"),
        openSite: document.getElementById("open-site"),
        image: document.getElementById("image"),
        imageFile: document.getElementById("image-file"),
        path: document.getElementById("path"),
      };

      boot();

      function boot() {
        document.body.dataset.theme = theme;
        bind();
        loadNotebooks().then(function () {
          if (mode === "edit") {
            return loadExisting();
          }

          setupNewPost();
          return null;
        }).catch(function (error) {
          setStatus(error.message, true);
        });
      }

      function bind() {
        els.back.addEventListener("click", function () {
          window.close();
          window.history.back();
        });
        els.title.addEventListener("input", function () {
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
          resizeTextarea(els.title);
        });
        els.slug.addEventListener("input", function () {
          slugTouched = true;
        });
        els.notebook.addEventListener("change", function () {
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
        });
        els.save.addEventListener("click", save);
        els.typewriter.addEventListener("click", toggleTypewriter);
        els.settingsTypewriter.addEventListener("click", toggleTypewriter);
        els.body.addEventListener("input", function () {
          resizeTextarea(els.body);
          centerTypewriterLine();
        });
        els.body.addEventListener("click", centerTypewriterLine);
        els.body.addEventListener("keyup", centerTypewriterLine);
        window.addEventListener("resize", resizeEditorFields);
        els.openSite.addEventListener("click", function () {
          if (savedUrl) {
            window.open(siteOrigin + savedUrl, "_blank", "noopener");
            return;
          }
          if (sourcePath) {
            window.open(siteOrigin + contentPathToUrl(sourcePath), "_blank", "noopener");
          }
        });
        els.settingsButton.addEventListener("click", function () {
          els.settings.hidden = !els.settings.hidden;
        });
        els.toolbarImage.addEventListener("click", function () {
          els.imageFile.click();
        });
        els.image.addEventListener("click", function () {
          els.imageFile.click();
        });
        els.imageFile.addEventListener("change", uploadImage);
        els.style.addEventListener("change", function () {
          if (els.style.value) {
            applyFormat(els.style.value);
            els.style.value = "";
          }
        });
        Array.from(document.querySelectorAll("[data-format]")).forEach(function (button) {
          button.addEventListener("click", function () {
            applyFormat(button.dataset.format);
          });
        });
      }

      function request(path, options) {
        return fetch(path, options || {}).then(function (response) {
          return response.json().catch(function () {
            return {};
          }).then(function (payload) {
            if (!response.ok || payload.error) {
              throw new Error(payload.error || "Author API error.");
            }
            return payload;
          });
        });
      }

      function postJson(path, payload) {
        return request(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      function loadNotebooks() {
        return request("/api/notebooks").then(function (payload) {
          els.notebook.innerHTML = "";
          (payload.notebooks || []).forEach(function (notebook) {
            var option = document.createElement("option");
            option.value = notebook.path;
            option.textContent = notebook.title + " (" + notebook.lang + ")";
            if (notebook.path === preferredNotebook) {
              option.selected = true;
            }
            els.notebook.appendChild(option);
          });
        });
      }

      function setupNewPost() {
        els.notebookField.hidden = false;
        els.title.value = "";
        els.body.value = "";
        els.date.value = today();
        els.draft.checked = true;
        els.hidden.checked = false;
        setStatus("New post");
        resizeEditorFields();
        els.title.focus();
      }

      function loadExisting() {
        return request("/api/page?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          frontMatter = payload.frontMatter || {};
          savedUrl = payload.url || "";
          els.notebookField.hidden = true;
          els.title.value = frontMatter.title || "";
          els.slug.value = "";
          els.slug.disabled = true;
          els.date.value = frontMatter.date || today();
          els.tags.value = (frontMatter.tags || []).join(", ");
          els.summary.value = frontMatter.summary || frontMatter.description || "";
          els.draft.checked = frontMatter.draft === true;
          els.hidden.checked = frontMatter.hidden === true;
          els.body.value = payload.body || "";
          els.path.textContent = payload.path || "";
          setStatus("Editing " + (payload.path || ""));
          resizeEditorFields();
          els.body.focus();
        });
      }

      function save() {
        els.save.disabled = true;
        setStatus("Saving");

        var action = mode === "edit" ? saveExisting() : createPost();

        action.then(function (result) {
          savedUrl = result.url || savedUrl;
          sourcePath = result.path || sourcePath;
          els.path.textContent = sourcePath;
          mode = "edit";
          els.notebookField.hidden = true;
          els.slug.disabled = true;
          setStatus("Saved");
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          els.save.disabled = false;
        });
      }

      function createPost() {
        return postJson("/api/create-post", {
          notebook: els.notebook.value,
          title: els.title.value,
          slug: els.slug.value,
          date: els.date.value,
          tags: els.tags.value,
          summary: els.summary.value,
          draft: els.draft.checked,
          hidden: els.hidden.checked,
          body: els.body.value || "# " + els.title.value + "\\n",
        });
      }

      function saveExisting() {
        var nextFrontMatter = Object.assign({}, frontMatter, {
          title: els.title.value,
          date: els.date.value,
        });

        if (els.draft.checked) {
          nextFrontMatter.draft = true;
        } else {
          delete nextFrontMatter.draft;
        }

        if (els.hidden.checked) {
          nextFrontMatter.hidden = true;
        } else {
          delete nextFrontMatter.hidden;
        }

        if (kind === "notebook") {
          nextFrontMatter.description = els.summary.value;
        } else {
          nextFrontMatter.summary = els.summary.value;
          nextFrontMatter.tags = splitTags(els.tags.value);
        }

        return postJson("/api/save-page", {
          path: sourcePath,
          frontMatter: nextFrontMatter,
          body: els.body.value,
        }).then(function (result) {
          frontMatter = nextFrontMatter;
          return result;
        });
      }

      function uploadImage() {
        var file = els.imageFile.files && els.imageFile.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          postJson("/api/upload-image", {
            name: file.name,
            alt: file.name.replace(/\\.[^.]+$/, ""),
            data: reader.result,
          }).then(function (result) {
            insertAtCursor(els.body, result.markdown + "\\n");
            setStatus("Image added " + result.url);
          }).catch(function (error) {
            setStatus(error.message, true);
          }).finally(function () {
            els.imageFile.value = "";
          });
        };
        reader.readAsDataURL(file);
      }

      function insertAtCursor(textarea, text) {
        var start = textarea.selectionStart || 0;
        var end = textarea.selectionEnd || 0;
        var value = textarea.value;
        var prefix = value.slice(0, start);
        var suffix = value.slice(end);
        var insert = (prefix && !prefix.endsWith("\\n") ? "\\n\\n" : "") + text;
        textarea.value = prefix + insert + suffix;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = (prefix + insert).length;
        resizeTextarea(textarea);
        centerTypewriterLine();
      }

      function applyFormat(format) {
        if (format === "undo" || format === "redo") {
          els.body.focus();
          document.execCommand(format);
          return;
        }
        if (format === "bold") {
          wrapSelection("**", "**");
          return;
        }
        if (format === "italic") {
          wrapSelection("_", "_");
          return;
        }
        if (format === "strike") {
          wrapSelection("~~", "~~");
          return;
        }
        if (format === "code") {
          wrapSelection(String.fromCharCode(96), String.fromCharCode(96));
          return;
        }
        if (format === "heading") {
          prefixCurrentLine("## ");
          return;
        }
        if (format === "quote") {
          prefixCurrentLine("> ");
          return;
        }
        if (format === "ul") {
          prefixCurrentLine("- ");
          return;
        }
        if (format === "ol") {
          prefixCurrentLine("1. ");
          return;
        }
        if (format === "link") {
          wrapSelection("[", "](https://)");
          return;
        }
        if (format === "align") {
          toggleTypewriter();
          return;
        }
        setStatus("Use Markdown for " + format);
      }

      function wrapSelection(before, after) {
        var start = els.body.selectionStart || 0;
        var end = els.body.selectionEnd || 0;
        var selected = els.body.value.slice(start, end) || "text";
        var next = before + selected + after;
        els.body.value = els.body.value.slice(0, start) + next + els.body.value.slice(end);
        els.body.focus();
        els.body.selectionStart = start + before.length;
        els.body.selectionEnd = start + before.length + selected.length;
        resizeTextarea(els.body);
        centerTypewriterLine();
      }

      function prefixCurrentLine(prefix) {
        var cursor = els.body.selectionStart || 0;
        var lineStart = els.body.value.lastIndexOf("\\n", cursor - 1) + 1;
        els.body.value = els.body.value.slice(0, lineStart) + prefix + els.body.value.slice(lineStart);
        els.body.focus();
        els.body.selectionStart = els.body.selectionEnd = cursor + prefix.length;
        resizeTextarea(els.body);
        centerTypewriterLine();
      }

      function toggleTypewriter() {
        var active = !els.writer.classList.contains("is-typewriter");
        els.writer.classList.toggle("is-typewriter", active);
        els.typewriter.classList.toggle("is-active", active);
        resizeEditorFields();
        centerTypewriterLine();
      }

      function resizeEditorFields() {
        window.requestAnimationFrame(function () {
          resizeTextarea(els.title);
          resizeTextarea(els.body);
        });
      }

      function resizeTextarea(textarea) {
        if (textarea === els.body && els.writer.classList.contains("is-typewriter")) {
          textarea.style.height = "";
          return;
        }

        textarea.style.height = "auto";
        textarea.style.height = textarea.scrollHeight + "px";
      }

      function centerTypewriterLine() {
        if (!els.writer.classList.contains("is-typewriter")) {
          return;
        }

        window.requestAnimationFrame(function () {
          var computed = window.getComputedStyle(els.body);
          var lineHeight = parseFloat(computed.lineHeight) || 32;
          var cursor = els.body.selectionStart || 0;
          var line = els.body.value.slice(0, cursor).split("\\n").length - 1;
          var target = Math.max(0, (line * lineHeight) - (els.body.clientHeight / 2) + lineHeight);
          els.body.scrollTop = target;
        });
      }

      function setStatus(message, error) {
        els.status.textContent = message;
        els.status.classList.toggle("error", Boolean(error));
        els.savedPill.textContent = error ? "Error" : message;
      }

      function currentSeparator() {
        return els.notebook.value.endsWith("/posts") ? "_" : "-";
      }

      function slugify(value, separator) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, separator)
          .replace(new RegExp(separator + "+", "g"), separator)
          .replace(new RegExp("^" + separator + "|" + separator + "$", "g"), "");
      }

      function splitTags(value) {
        return String(value || "")
          .split(",")
          .map(function (tag) { return tag.trim(); })
          .filter(Boolean);
      }

      function today() {
        return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      }

      function contentPathToUrl(relativePath) {
        var lang = relativePath.indexOf("content_es/") === 0 ? "es" : "en";
        var root = lang === "es" ? "content_es" : "content_en";
        var route = relativePath.slice(root.length).replace(/\\.md$/, "");
        route = route.replace(/\\/index$/, "/").replace(/\\/_index$/, "/");
        if (route.charAt(0) !== "/") route = "/" + route;
        var url = (lang === "es" ? "/es" : "") + route;
        return url.charAt(url.length - 1) === "/" ? url : url + "/";
      }
    })();
  </script>
</body>
</html>`;
}

async function route(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

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
    sendHtml(res, authorEditorHtml());
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
