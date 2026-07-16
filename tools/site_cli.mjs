#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_ROOTS = ["content_es", "content_en"];
const UPLOAD_ROOT = "static/uploads";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
const TIME_ZONE = "America/Mexico_City";
const DELETE_FIELD = Symbol("delete front matter field");

const repoRoot = findRepoRoot(process.cwd());
process.chdir(repoRoot);

function printHelp() {
  console.log(`Uso:
  npm run site -- <accion> [opciones]

Acciones principales:
  status                         Revisa git, conteos de contenido y scripts
  list [tipo]                    Lista contenido: all, posts, zettels, pages, notebooks, photos, drafts
  drafts                         Lista borradores
  find <texto>                   Busca por titulo, ruta, url, tags o contenido
  urls                           Lista rutas Markdown y URLs publicas esperadas
  tags                           Lista tags y conteos
  wordcount <id>                 Cuenta palabras de una pieza

Contenido:
  new post|zettel|page ...       Usa tools/new_content.mjs
  new photo "Titulo" --image f   Crea una pieza de Fotografia
  update <id> [campos]           Cambia front matter comun
  publish|unpublish <id>         Cambia draft
  hide|show <id>                 Cambia hidden
  rename <id> "Titulo"          Cambia titulo
  duplicate <id> [--slug s]      Copia una pieza como borrador
  archive <id>                   Marca draft y hidden

Fotografia y medios:
  photo list                     Lista piezas de Fotografia
  photo attach <id> <imagen>     Asocia imagen a una pieza
  photo detach <id>              Quita imagen del front matter
  media list                     Lista uploads
  media import <archivo>         Copia una imagen a static/uploads/YYYY/MM/
  media references <imagen>      Muestra donde se usa una imagen
  media orphans                  Detecta uploads no referenciados
  media clean --dry-run|--yes    Limpia uploads huerfanos

Calidad y publicacion:
  validate [area]                Revisa content, links, images o all
  lint [area]                    Alias de validate
  build                          Compila el Worker Astro de produccion
  preflight                      Valida, ejecuta pruebas y compila
  health                         Revisa archivos y comandos base
  inventory [--json]             Exporta inventario de contenido
  commit --message "Mensaje"     Crea commit solo con cambios ya staged

Opciones utiles:
  --json                         Salida JSON en acciones compatibles
  --dry-run                      Muestra que haria sin escribir
  --title, --date, --summary, --description, --tags
  --image, --image-alt, --caption, --field clave=valor`);
}

function findRepoRoot(start) {
  let current = path.resolve(start);

  while (current !== path.dirname(current)) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "edge", "package.json")) &&
      existsSync(path.join(current, "content_es")) &&
      existsSync(path.join(current, "content_en"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error("Ejecuta la CLI dentro del repo del sitio.");
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  function addOption(key, value) {
    if (options[key] === undefined) {
      options[key] = value;
      return;
    }
    if (!Array.isArray(options[key])) {
      options[key] = [options[key]];
    }
    options[key].push(value);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const raw = value.slice(2);
    const equalsIndex = raw.indexOf("=");

    if (equalsIndex !== -1) {
      addOption(raw.slice(0, equalsIndex), raw.slice(equalsIndex + 1));
      continue;
    }

    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      addOption(raw, true);
      continue;
    }

    addOption(raw, next);
    index += 1;
  }

  return { options, positionals };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (options.capture) {
    return {
      status: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  return { status: 0, stdout: "", stderr: "" };
}

function parseScalar(value) {
  const trimmed = String(value || "").trim();

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
  const normalized = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");

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
  const frontMatterLines = rawFrontMatter.split("\n");

  for (let index = 0; index < frontMatterLines.length; index += 1) {
    const line = frontMatterLines[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!match) continue;

    const [, key, value] = match;

    if (value === "" && /^\s+-\s+/.test(frontMatterLines[index + 1] || "")) {
      const items = [];
      let current = null;

      index += 1;

      for (; index < frontMatterLines.length; index += 1) {
        const itemMatch = frontMatterLines[index].match(/^\s+-\s+([A-Za-z0-9_-]+):\s*(.*)$/);
        const propertyMatch = frontMatterLines[index].match(/^\s{4}([A-Za-z0-9_-]+):\s*(.*)$/);

        if (itemMatch) {
          current = {};
          current[itemMatch[1]] = parseScalar(itemMatch[2]);
          items.push(current);
          continue;
        }

        if (propertyMatch && current) {
          current[propertyMatch[1]] = parseScalar(propertyMatch[2]);
          continue;
        }

        index -= 1;
        break;
      }

      frontMatter[key] = items;
      continue;
    }

    frontMatter[key] = parseScalar(value);
  }

  return { frontMatter, body };
}

function quoteYaml(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function formatYamlValue(value, key) {
  if (Array.isArray(value)) {
    if (value.some((item) => item && typeof item === "object" && !Array.isArray(item))) {
      return [
        "",
        ...value.flatMap((item) => {
          const entries = Object.entries(item || {}).filter(([, itemValue]) => itemValue !== undefined && itemValue !== null);

          if (entries.length === 0) {
            return ["  - {}"];
          }

          return entries.map(([itemKey, itemValue], index) => {
            const prefix = index === 0 ? "  - " : "    ";
            return `${prefix}${itemKey}: ${formatYamlValue(itemValue, itemKey)}`;
          });
        }),
      ].join("\n");
    }
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
  const priority = [
    "title",
    "date",
    "draft",
    "tags",
    "summary",
    "description",
    "image",
    "thumbnail",
    "image_alt",
    "caption",
    "images",
    "hidden",
  ];
  const keys = [
    ...priority.filter((key) => Object.prototype.hasOwnProperty.call(frontMatter, key)),
    ...Object.keys(frontMatter)
      .filter((key) => !priority.includes(key))
      .sort(),
  ];
  const lines = ["---"];

  for (const key of keys) {
    const value = frontMatter[key];

    if (value === undefined || value === null) continue;

    const formatted = formatYamlValue(value, key);
    lines.push(formatted.startsWith("\n") ? `${key}:${formatted}` : `${key}: ${formatted}`);
  }

  lines.push("---", "", String(body || "").trimStart());
  return `${lines.join("\n").trimEnd()}\n`;
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

function slugify(value, separator = "-") {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
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

async function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkFiles(filePath));
    } else if (entry.isFile()) {
      files.push(filePath);
    }
  }

  return files;
}

function relativePath(filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
  const relative = path.relative(repoRoot, absolute).replace(/\\/g, "/");

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Ruta fuera del repo: ${filePath}`);
  }

  return relative;
}

function normalizeContentPath(value) {
  const relative = relativePath(String(value || "").trim());
  const allowed = CONTENT_ROOTS.some((root) => relative.startsWith(`${root}/`));

  if (!allowed || !relative.endsWith(".md")) {
    throw new Error(`Ruta de contenido invalida: ${value}`);
  }

  return relative;
}

function normalizeUploadPath(value) {
  let raw = String(value || "").trim();

  if (!raw) {
    throw new Error("Ruta de imagen requerida.");
  }

  try {
    if (/^https?:\/\//.test(raw)) {
      raw = new URL(raw).pathname;
    }
  } catch {
    throw new Error(`Ruta de imagen invalida: ${value}`);
  }

  raw = raw.replace(/^\/admin(?=\/uploads\/)/, "");
  if (raw.startsWith("/uploads/")) {
    raw = `static${raw}`;
  }

  const pathValue = path.isAbsolute(raw) ? raw : raw.replace(/^\/+/, "");
  const relative = relativePath(pathValue);
  const extension = path.extname(relative).toLowerCase();

  if (!relative.startsWith(`${UPLOAD_ROOT}/`) || !IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`Ruta de imagen invalida: ${value}`);
  }

  return relative;
}

function contentPathToUrl(filePath) {
  const safePath = normalizeContentPath(filePath);
  const lang = safePath.startsWith("content_es/") ? "es" : "en";
  const root = lang === "es" ? "content_es" : "content_en";
  let route = safePath.slice(root.length).replace(/\.md$/, "");

  route = route.replace(/\/index$/, "/").replace(/\/_index$/, "/");
  if (!route.startsWith("/")) {
    route = `/${route}`;
  }

  const url = `${lang === "es" ? "/es" : ""}${route}`.replace(/\/+/g, "/");
  return url.endsWith("/") ? url : `${url}/`;
}

function uploadPathToUrl(filePath) {
  return `/${normalizeUploadPath(filePath).replace(/^static\//, "")}`;
}

function classifyContent(filePath) {
  if (filePath.endsWith("/_index.md")) return "notebook";
  if (filePath.startsWith("content_es/fotografia/") || filePath.startsWith("content_en/fotografia/")) return "photo";
  if (filePath.includes("/posts/")) return "post";
  if (filePath.includes("/zettelkasten/")) return "zettel";
  return "page";
}

async function readContentEntry(filePath) {
  const text = await readFile(filePath, "utf8");
  const relative = relativePath(filePath);
  const { frontMatter, body } = splitMarkdown(text);
  const type = classifyContent(relative);
  const stem = path.basename(relative, ".md");

  return {
    path: relative,
    url: contentPathToUrl(relative),
    lang: relative.startsWith("content_es/") ? "es" : "en",
    type,
    stem,
    title: String(frontMatter.title || stem.replace(/[-_]/g, " ")),
    date: String(frontMatter.date || ""),
    draft: frontMatter.draft === true,
    hidden: frontMatter.hidden === true,
    tags: tagsFromValue(frontMatter.tags),
    aliases: tagsFromValue(frontMatter.aliases),
    summary: String(frontMatter.summary || frontMatter.description || ""),
    frontMatter,
    body,
  };
}

async function contentEntries() {
  const files = [];

  for (const root of CONTENT_ROOTS) {
    const rootFiles = await walkFiles(path.join(repoRoot, root));
    files.push(...rootFiles.filter((filePath) => filePath.endsWith(".md")));
  }

  const entries = await Promise.all(files.map(readContentEntry));
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

function tagsFromValue(value) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function typeFilter(type) {
  const normalized = String(type || "all").toLowerCase();
  const map = {
    all: null,
    post: "post",
    posts: "post",
    zettel: "zettel",
    zettels: "zettel",
    page: "page",
    pages: "page",
    notebook: "notebook",
    notebooks: "notebook",
    photo: "photo",
    photos: "photo",
    fotografia: "photo",
    drafts: "drafts",
  };

  if (!(normalized in map)) {
    throw new Error(`Tipo desconocido: ${type}`);
  }

  return map[normalized];
}

async function filteredEntries(type = "all") {
  const entries = await contentEntries();
  const filter = typeFilter(type);

  if (!filter) return entries;
  if (filter === "drafts") return entries.filter((entry) => entry.draft);
  return entries.filter((entry) => entry.type === filter);
}

async function resolveContent(id) {
  const value = String(id || "").trim();

  if (!value) {
    throw new Error("Falta el identificador de contenido.");
  }

  const entries = await contentEntries();
  let normalizedPath = "";

  try {
    normalizedPath = normalizeContentPath(value);
  } catch {
    normalizedPath = "";
  }

  const normalizedUrl = value.replace(/^https?:\/\/[^/]+/, "").replace(/\/?$/, "/");
  const needle = value.toLowerCase();
  const exact = entries.filter((entry) => (
    entry.path === normalizedPath ||
    entry.path === value ||
    entry.url === normalizedUrl ||
    entry.stem === value ||
    entry.title.toLowerCase() === needle
  ));

  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    throw new Error(`Identificador ambiguo:\n${exact.map((entry) => `- ${entry.path}`).join("\n")}`);
  }

  const fuzzy = entries.filter((entry) => (
    entry.path.toLowerCase().includes(needle) ||
    entry.url.toLowerCase().includes(needle) ||
    entry.title.toLowerCase().includes(needle)
  ));

  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    throw new Error(`Identificador ambiguo:\n${fuzzy.slice(0, 20).map((entry) => `- ${entry.path} (${entry.title})`).join("\n")}`);
  }

  throw new Error(`No encontre contenido para: ${value}`);
}

function outputJson(value, options) {
  if (options.json) {
    console.log(JSON.stringify(value, null, 2));
    return true;
  }

  return false;
}

function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log("Sin resultados.");
    return;
  }

  const widths = columns.map((column) => {
    const labelWidth = column.label.length;
    const valueWidth = Math.max(...rows.map((row) => String(column.value(row) ?? "").length));
    return Math.min(Math.max(labelWidth, valueWidth), column.max || 48);
  });

  const format = (value, width) => {
    const text = String(value ?? "");
    if (text.length > width) {
      return `${text.slice(0, Math.max(width - 3, 0))}...`;
    }
    return text.padEnd(width, " ");
  };

  console.log(columns.map((column, index) => format(column.label, widths[index])).join("  "));
  console.log(columns.map((_, index) => "-".repeat(widths[index])).join("  "));

  for (const row of rows) {
    console.log(columns.map((column, index) => format(column.value(row), widths[index])).join("  "));
  }
}

function contentRows(entries) {
  return entries.map((entry) => ({
    type: entry.type,
    state: [
      entry.draft ? "draft" : "pub",
      entry.hidden ? "hidden" : "",
    ].filter(Boolean).join(","),
    lang: entry.lang,
    title: entry.title,
    path: entry.path,
    url: entry.url,
  }));
}

async function commandStatus(options) {
  const entries = await contentEntries();
  const uploads = await uploadFiles();
  const git = run("git", ["status", "--short"], { capture: true });
  const branch = run("git", ["branch", "--show-current"], { capture: true }).stdout.trim();
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const counts = entries.reduce((acc, entry) => {
    acc[entry.type] = (acc[entry.type] || 0) + 1;
    if (entry.draft) acc.drafts += 1;
    if (entry.hidden) acc.hidden += 1;
    return acc;
  }, { drafts: 0, hidden: 0 });
  const status = {
    branch,
    dirty: Boolean(git.stdout.trim()),
    changes: git.stdout.trim().split("\n").filter(Boolean),
    content: counts,
    uploads: uploads.length,
    scripts: Object.keys(packageJson.scripts || {}).sort(),
  };

  if (outputJson(status, options)) return;

  console.log(`Rama: ${status.branch || "(desconocida)"}`);
  console.log(`Git: ${status.dirty ? "hay cambios" : "limpio"}`);
  console.log(`Contenido: ${entries.length} archivos Markdown, ${status.content.drafts} drafts, ${status.content.hidden} hidden`);
  console.log(`Uploads: ${status.uploads} imagenes`);
  console.log(`Scripts: ${status.scripts.join(", ")}`);

  if (status.changes.length) {
    console.log("\nCambios:");
    status.changes.forEach((line) => console.log(`  ${line}`));
  }
}

async function commandList(type, options) {
  const entries = await filteredEntries(type);
  const rows = contentRows(entries);

  if (outputJson(rows, options)) return;

  printTable(rows, [
    { label: "tipo", value: (row) => row.type, max: 10 },
    { label: "estado", value: (row) => row.state || "pub", max: 14 },
    { label: "lang", value: (row) => row.lang, max: 4 },
    { label: "titulo", value: (row) => row.title, max: 36 },
    { label: "ruta", value: (row) => row.path, max: 64 },
  ]);
}

async function commandFind(query, options) {
  const needle = String(query || "").toLowerCase().trim();

  if (!needle) {
    throw new Error("Falta texto para buscar.");
  }

  const entries = await contentEntries();
  const matches = entries.filter((entry) => (
    entry.title.toLowerCase().includes(needle) ||
    entry.path.toLowerCase().includes(needle) ||
    entry.url.toLowerCase().includes(needle) ||
    entry.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
    entry.body.toLowerCase().includes(needle)
  ));
  const rows = contentRows(matches);

  if (outputJson(rows, options)) return;

  printTable(rows, [
    { label: "tipo", value: (row) => row.type, max: 10 },
    { label: "estado", value: (row) => row.state || "pub", max: 14 },
    { label: "titulo", value: (row) => row.title, max: 38 },
    { label: "ruta", value: (row) => row.path, max: 64 },
    { label: "url", value: (row) => row.url, max: 48 },
  ]);
}

async function commandUrls(options) {
  const rows = (await contentEntries()).map((entry) => ({
    path: entry.path,
    url: entry.url,
    draft: entry.draft,
    hidden: entry.hidden,
  }));

  if (outputJson(rows, options)) return;

  printTable(rows, [
    { label: "ruta", value: (row) => row.path, max: 70 },
    { label: "url", value: (row) => row.url, max: 56 },
    { label: "draft", value: (row) => row.draft ? "si" : "no", max: 5 },
    { label: "hidden", value: (row) => row.hidden ? "si" : "no", max: 6 },
  ]);
}

async function commandTags(options) {
  const counts = new Map();

  for (const entry of await contentEntries()) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const rows = [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  if (outputJson(rows, options)) return;

  printTable(rows, [
    { label: "tag", value: (row) => row.tag, max: 48 },
    { label: "count", value: (row) => row.count, max: 6 },
  ]);
}

async function commandWordCount(id, options) {
  const entry = await resolveContent(id);
  const words = entry.body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const result = {
    path: entry.path,
    title: entry.title,
    words: words.length,
    minutes: Math.max(1, Math.round(words.length / 220)),
  };

  if (outputJson(result, options)) return;

  console.log(`${result.title}`);
  console.log(`${result.path}`);
  console.log(`${result.words} palabras, ${result.minutes} min de lectura`);
}

function frontMatterChangesFromOptions(options) {
  const changes = {};

  const directFields = ["title", "date", "summary", "description", "image", "caption"];
  for (const field of directFields) {
    if (options[field] !== undefined) {
      changes[field] = String(options[field]);
    }
  }

  if (options["image-alt"] !== undefined) {
    changes.image_alt = String(options["image-alt"]);
  }

  if (options.tags !== undefined) {
    changes.tags = tagsFromValue(options.tags);
  }

  for (const raw of arrayOption(options.field)) {
    const [key, ...rest] = String(raw).split("=");
    const value = rest.join("=");

    if (!key || !rest.length) {
      throw new Error("--field debe usar clave=valor.");
    }

    changes[key] = parseScalar(value);
  }

  return changes;
}

function arrayOption(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

async function updateFrontMatter(id, changes, options = {}) {
  const entry = await resolveContent(id);
  const nextFrontMatter = { ...entry.frontMatter };

  for (const [key, value] of Object.entries(changes)) {
    if (value === DELETE_FIELD) {
      delete nextFrontMatter[key];
    } else {
      nextFrontMatter[key] = value;
    }
  }

  const nextContent = formatMarkdown(nextFrontMatter, entry.body);

  if (options["dry-run"]) {
    console.log(`Se actualizaria: ${entry.path}`);
    return entry;
  }

  writeFileSync(path.join(repoRoot, entry.path), nextContent, "utf8");
  console.log(`Actualizado: ${entry.path}`);
  console.log(`URL: ${entry.url}`);
  return { ...entry, frontMatter: nextFrontMatter };
}

async function commandUpdate(id, options) {
  const changes = frontMatterChangesFromOptions(options);

  if (Object.keys(changes).length === 0) {
    throw new Error("No hay campos para actualizar.");
  }

  await updateFrontMatter(id, changes, options);
}

async function commandDuplicate(id, options, positionals) {
  const entry = await resolveContent(id);
  const title = String(options.title || positionals.join(" ") || `${entry.title} copia`).trim();
  const slug = slugify(options.slug || title, entry.type === "post" ? "_" : "-");
  const destination = path.join(path.dirname(entry.path), `${slug}.md`).replace(/\\/g, "/");

  if (existsSync(destination)) {
    throw new Error(`Ya existe: ${destination}`);
  }

  const frontMatter = {
    ...entry.frontMatter,
    title,
    draft: true,
  };
  const content = formatMarkdown(frontMatter, entry.body);

  if (options["dry-run"]) {
    console.log(`Se crearia: ${destination}`);
    return;
  }

  writeFileSync(destination, content, "utf8");
  console.log(`Duplicado: ${destination}`);
}

async function commandNew(type, args, options) {
  if (!type) {
    throw new Error("Uso: npm run site -- new post|zettel|page|photo ...");
  }

  if (type === "photo") {
    await commandNewPhoto(args, options);
    return;
  }

  const result = spawnSync("node", ["tools/new_content.mjs", type, ...args], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  process.exit(result.status || 0);
}

async function commandNewPhoto(args, options) {
  const title = args.join(" ").trim();

  if (!title) {
    throw new Error('Uso: npm run site -- new photo "Titulo" --image archivo.jpg');
  }

  const date = ensureDate(options.date);
  const slug = slugify(options.slug || title, "-");
  const filePath = path.join("content_es", "fotografia", `${slug}.md`);

  if (existsSync(filePath)) {
    throw new Error(`Ya existe: ${filePath}`);
  }

  const image = options.image ? await imageValueForFrontMatter(options.image, options) : "";
  const frontMatter = {
    title,
    date,
    draft: !options.publish,
    tags: ["fotografia"],
    summary: String(options.summary || options.caption || ""),
  };

  if (image) {
    frontMatter.image = image;
    frontMatter.image_alt = String(options["image-alt"] || options.alt || title);
  }

  if (options.caption) {
    frontMatter.caption = String(options.caption);
  }

  const body = "";

  if (options["dry-run"]) {
    console.log(`Se crearia: ${filePath}`);
    return;
  }

  writeFileSync(filePath, formatMarkdown(frontMatter, body), "utf8");
  console.log(`Creado: ${filePath}`);
  console.log(`URL: ${contentPathToUrl(filePath)}`);
}

async function imageValueForFrontMatter(value, options = {}) {
  const raw = String(value || "").trim();

  if (!raw) return "";

  try {
    return uploadPathToUrl(normalizeUploadPath(raw));
  } catch {
    const imported = await importMedia(raw, options);
    return imported.url;
  }
}

async function commandPhoto(subcommand, args, options) {
  if (!subcommand || subcommand === "list") {
    await commandList("photos", options);
    return;
  }

  if (subcommand === "attach") {
    const [id, image] = args;

    if (!id || !image) {
      throw new Error("Uso: npm run site -- photo attach <id> <imagen>");
    }

    const imageValue = await imageValueForFrontMatter(image, options);
    const changes = {
      image: imageValue,
      image_alt: String(options["image-alt"] || options.alt || ""),
    };

    if (!changes.image_alt) {
      const entry = await resolveContent(id);
      changes.image_alt = entry.title;
    }

    if (options.caption !== undefined) {
      changes.caption = String(options.caption);
    }

    await updateFrontMatter(id, changes, options);
    return;
  }

  if (subcommand === "detach") {
    const [id] = args;

    if (!id) {
      throw new Error("Uso: npm run site -- photo detach <id>");
    }

    const changes = {
      image: DELETE_FIELD,
      thumbnail: DELETE_FIELD,
      image_alt: DELETE_FIELD,
    };

    if (!options["keep-caption"]) {
      changes.caption = DELETE_FIELD;
    }

    await updateFrontMatter(id, changes, options);
    return;
  }

  throw new Error(`Accion photo desconocida: ${subcommand}`);
}

async function uploadFiles() {
  const files = await walkFiles(path.join(repoRoot, UPLOAD_ROOT));
  return files
    .filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()))
    .map((filePath) => {
      const relative = relativePath(filePath);
      const stats = statSync(filePath);
      return {
        path: relative,
        url: uploadPathToUrl(relative),
        bytes: stats.size,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function collectUploadReferences(entry) {
  const values = [];
  const add = (value) => {
    if (value) values.push(value);
  };

  add(entry.frontMatter.image);
  add(entry.frontMatter.thumbnail);

  if (Array.isArray(entry.frontMatter.images)) {
    entry.frontMatter.images.forEach((item) => {
      add(item?.src || item?.image || item?.url);
      add(item?.thumb || item?.thumbnail);
    });
  }

  for (const match of String(entry.body || "").matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    add(match[1]);
  }

  for (const match of String(entry.body || "").matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    add(match[1]);
  }

  return values.flatMap((value) => {
    try {
      return [normalizeUploadPath(value)];
    } catch {
      return [];
    }
  });
}

async function uploadReferenceMap() {
  const references = new Map();

  for (const entry of await contentEntries()) {
    for (const uploadPath of collectUploadReferences(entry)) {
      if (!references.has(uploadPath)) {
        references.set(uploadPath, []);
      }
      references.get(uploadPath).push(entry.path);
    }
  }

  return references;
}

async function commandMedia(subcommand, args, options) {
  if (!subcommand || subcommand === "list") {
    const uploads = await uploadFiles();

    if (outputJson(uploads, options)) return;

    printTable(uploads.map((upload) => ({
      ...upload,
      kb: Math.round(upload.bytes / 1024),
    })), [
      { label: "kb", value: (row) => row.kb, max: 7 },
      { label: "ruta", value: (row) => row.path, max: 68 },
      { label: "url", value: (row) => row.url, max: 52 },
    ]);
    return;
  }

  if (subcommand === "import") {
    const [source] = args;

    if (!source) {
      throw new Error("Uso: npm run site -- media import <archivo>");
    }

    const imported = await importMedia(source, options);

    if (outputJson(imported, options)) return;

    console.log(`Importado: ${imported.path}`);
    console.log(`URL: ${imported.url}`);
    console.log(`Markdown: ![${options.alt || imported.alt}](${imported.url})`);
    return;
  }

  if (subcommand === "references") {
    const [image] = args;

    if (!image) {
      throw new Error("Uso: npm run site -- media references <imagen>");
    }

    const uploadPath = normalizeUploadPath(image);
    const references = await uploadReferenceMap();
    const result = {
      path: uploadPath,
      references: references.get(uploadPath) || [],
    };

    if (outputJson(result, options)) return;

    console.log(result.path);
    if (result.references.length === 0) {
      console.log("Sin referencias.");
    } else {
      result.references.forEach((reference) => console.log(`- ${reference}`));
    }
    return;
  }

  if (subcommand === "orphans") {
    await printOrCleanOrphans(options, false);
    return;
  }

  if (subcommand === "clean") {
    await printOrCleanOrphans(options, true);
    return;
  }

  throw new Error(`Accion media desconocida: ${subcommand}`);
}

async function importMedia(source, options = {}) {
  const sourcePath = path.resolve(repoRoot, String(source || ""));
  const extension = path.extname(sourcePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    throw new Error(`Formato no soportado: ${extension}`);
  }
  if (!existsSync(sourcePath)) {
    throw new Error(`No existe: ${source}`);
  }

  const [year, month] = dateInMexico().split("-");
  const targetDir = path.join(UPLOAD_ROOT, year, month);
  const baseName = slugify(path.basename(sourcePath, extension));
  let target = path.join(targetDir, `${baseName}-${Date.now()}${extension}`).replace(/\\/g, "/");

  if (options.name) {
    target = path.join(targetDir, `${slugify(options.name)}${extension}`).replace(/\\/g, "/");
  }

  if (existsSync(target)) {
    throw new Error(`Ya existe: ${target}`);
  }

  if (options["dry-run"]) {
    return {
      path: target,
      url: uploadPathToUrl(target),
      alt: String(options.alt || path.basename(sourcePath, extension)),
    };
  }

  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(sourcePath, target);

  return {
    path: target,
    url: uploadPathToUrl(target),
    alt: String(options.alt || path.basename(sourcePath, extension)),
  };
}

async function printOrCleanOrphans(options, clean) {
  const uploads = await uploadFiles();
  const references = await uploadReferenceMap();
  const orphans = uploads.filter((upload) => !references.has(upload.path));

  if (outputJson(orphans, options)) return;

  if (orphans.length === 0) {
    console.log("No hay uploads huerfanos.");
    return;
  }

  printTable(orphans.map((upload) => ({
    ...upload,
    kb: Math.round(upload.bytes / 1024),
  })), [
    { label: "kb", value: (row) => row.kb, max: 7 },
    { label: "ruta", value: (row) => row.path, max: 76 },
  ]);

  if (!clean) return;

  if (!options["dry-run"] && !options.yes) {
    throw new Error("Para borrar usa --dry-run o --yes.");
  }

  if (options["dry-run"]) {
    console.log("Dry run: no se borro nada.");
    return;
  }

  for (const upload of orphans) {
    rmSync(upload.path, { force: true });
  }
  console.log(`Borrados: ${orphans.length}`);
}

async function commandValidate(area, options) {
  const entries = await contentEntries();
  const issues = [];
  const normalized = area || "all";

  if (["all", "content"].includes(normalized)) {
    validateContent(entries, issues);
  }
  if (["all", "links"].includes(normalized)) {
    validateLinks(entries, issues);
  }
  if (["all", "images"].includes(normalized)) {
    await validateImages(entries, issues);
  }
  if (["all", "hidden"].includes(normalized)) {
    validateHidden(entries, issues);
  }

  if (!["all", "content", "links", "images", "hidden"].includes(normalized)) {
    throw new Error(`Area de validacion desconocida: ${area}`);
  }

  if (outputJson(issues, options)) {
    if (issues.some((issue) => issue.level === "error")) process.exit(1);
    return;
  }

  if (issues.length === 0) {
    console.log("Validacion sin hallazgos.");
    return;
  }

  for (const issue of issues) {
    console.log(`${issue.level.toUpperCase()} ${issue.path}: ${issue.message}`);
  }

  if (issues.some((issue) => issue.level === "error")) {
    process.exit(1);
  }
}

function validateContent(entries, issues) {
  const titleMap = new Map();

  for (const entry of entries) {
    if (!entry.frontMatter.title) {
      issues.push({ level: "warn", path: entry.path, message: "front matter sin title" });
    }

    if (entry.frontMatter.date && !/^\d{4}-\d{2}-\d{2}(?:T[\d:.-]+(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(String(entry.frontMatter.date))) {
      issues.push({ level: "error", path: entry.path, message: "date no usa YYYY-MM-DD" });
    }

    if (entry.frontMatter.tags !== undefined && !Array.isArray(entry.frontMatter.tags)) {
      issues.push({ level: "warn", path: entry.path, message: "tags no es lista" });
    }

    const titleKey = `${entry.lang}:${entry.title.toLowerCase()}`;
    if (titleMap.has(titleKey) && entry.type !== "notebook") {
      issues.push({ level: "warn", path: entry.path, message: `titulo duplicado con ${titleMap.get(titleKey)}` });
    } else {
      titleMap.set(titleKey, entry.path);
    }
  }
}

function validateLinks(entries, issues) {
  const urls = new Set(entries.map((entry) => entry.url));
  entries.forEach((entry) => {
    urls.add(entry.url.replace(/\/$/, ""));
    entry.aliases.forEach((alias) => {
      const normalizedAlias = normalizeUrlPath(alias);
      urls.add(normalizedAlias);
      urls.add(normalizedAlias.replace(/\/$/, ""));
    });

    if (entry.url.startsWith("/es/")) {
      const legacyUrl = entry.url.replace(/^\/es/, "");
      urls.add(legacyUrl);
      urls.add(legacyUrl.replace(/\/$/, ""));
    }
  });

  for (const entry of entries) {
    for (const match of entry.body.matchAll(/\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];

      if (/^(https?:|mailto:|#)/.test(href) || href.startsWith("/uploads/")) continue;

      if (href.startsWith("/")) {
        const clean = normalizeUrlPath(href.split("#")[0]);

        if (clean !== "/" && !urls.has(clean) && !urls.has(clean.replace(/\/$/, ""))) {
          issues.push({ level: "warn", path: entry.path, message: `link interno no encontrado: ${href}` });
        }
      }
    }
  }
}

function normalizeUrlPath(value) {
  const [pathOnly] = String(value || "").split("#");
  const clean = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;

  return clean.replace(/\/?$/, "/");
}

async function validateImages(entries, issues) {
  const uploads = new Set((await uploadFiles()).map((upload) => upload.path));

  for (const entry of entries) {
    const references = collectUploadReferences(entry);

    for (const uploadPath of references) {
      if (!uploads.has(uploadPath)) {
        issues.push({ level: "error", path: entry.path, message: `imagen no existe: ${uploadPath}` });
      }
    }

    if (entry.type === "photo" && entry.frontMatter.image && !entry.frontMatter.image_alt) {
      issues.push({ level: "warn", path: entry.path, message: "foto con image pero sin image_alt" });
    }

    for (const match of entry.body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      if (!match[1].trim()) {
        issues.push({ level: "warn", path: entry.path, message: `imagen Markdown sin alt: ${match[2]}` });
      }
    }
  }
}

function validateHidden(entries, issues) {
  for (const entry of entries) {
    if (entry.frontMatter.hidden === false) {
      issues.push({ level: "warn", path: entry.path, message: "hidden: false es ruido; mejor quitar el campo" });
    }
  }
}

async function commandHealth(options) {
  const checks = [
    { name: "edge/package.json", ok: existsSync("edge/package.json") },
    { name: "edge/src", ok: existsSync("edge/src") },
    { name: "edge/wrangler.jsonc", ok: existsSync("edge/wrangler.jsonc") },
    { name: "tools/new_content.mjs", ok: existsSync("tools/new_content.mjs") },
    { name: "tools/author_server.mjs", ok: existsSync("tools/author_server.mjs") },
    { name: "functions/admin/editor.js", ok: existsSync("functions/admin/editor.js") },
    { name: "functions/admin/image-editor.js", ok: existsSync("functions/admin/image-editor.js") },
    { name: "static/uploads", ok: existsSync("static/uploads") },
  ];

  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  for (const script of ["dev", "build", "site"]) {
    checks.push({ name: `npm script ${script}`, ok: Boolean(packageJson.scripts?.[script]) });
  }

  if (outputJson(checks, options)) return;

  checks.forEach((check) => console.log(`${check.ok ? "OK" : "FALTA"} ${check.name}`));

  if (checks.some((check) => !check.ok)) process.exit(1);
}

async function commandInventory(options) {
  const entries = await contentEntries();
  const inventory = {
    generatedAt: new Date().toISOString(),
    content: contentRows(entries),
    uploads: await uploadFiles(),
  };

  if (options.json) {
    console.log(JSON.stringify(inventory, null, 2));
    return;
  }

  console.log(JSON.stringify(inventory, null, 2));
}

async function commandOpen(id) {
  if (!id) {
    console.log("http://127.0.0.1:4321/");
    return;
  }

  const entry = await resolveContent(id);
  console.log(`http://127.0.0.1:4321${entry.url}`);
}

async function commandEdit(id) {
  const entry = await resolveContent(id);
  console.log(`http://127.0.0.1:4321/admin/editor?path=${encodeURIComponent(entry.path)}`);
}

function commandBuild() {
  run("npm", ["run", "build"]);
}

async function commandPreflight() {
  await commandValidate("all", {});
  run("npm", ["test"]);
  run("npm", ["--prefix", "edge", "test"]);
  run("npm", ["run", "build"]);
}

function commandCommit(options, positionals) {
  const message = String(options.message || options.m || positionals.join(" ")).trim();

  if (!message) {
    throw new Error('Uso: npm run site -- commit --message "Mensaje"');
  }

  const staged = run("git", ["diff", "--cached", "--name-only"], { capture: true }).stdout
    .trim()
    .split("\n")
    .filter(Boolean);

  if (staged.length === 0) {
    throw new Error("No hay cambios staged. Usa git add con rutas explicitas antes de commit.");
  }

  run("git", ["commit", "-m", message]);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h" || command === "help") {
    printHelp();
    return;
  }

  const { options, positionals } = parseArgs(rest);

  if (command === "status") return commandStatus(options);
  if (command === "list") return commandList(positionals[0] || "all", options);
  if (command === "drafts") return commandList("drafts", options);
  if (command === "find") return commandFind(positionals.join(" "), options);
  if (command === "urls") return commandUrls(options);
  if (command === "tags") return commandTags(options);
  if (command === "wordcount") return commandWordCount(positionals[0], options);
  if (command === "new") return commandNew(positionals[0], positionals.slice(1), options);
  if (command === "update") return commandUpdate(positionals[0], options);
  if (command === "publish") return updateFrontMatter(positionals[0], { draft: false }, options);
  if (command === "unpublish") return updateFrontMatter(positionals[0], { draft: true }, options);
  if (command === "hide") return updateFrontMatter(positionals[0], { hidden: true }, options);
  if (command === "show") return updateFrontMatter(positionals[0], { hidden: DELETE_FIELD }, options);
  if (command === "archive") return updateFrontMatter(positionals[0], { draft: true, hidden: true }, options);
  if (command === "rename") {
    const title = positionals.slice(1).join(" ").trim();
    if (!title) throw new Error('Uso: npm run site -- rename <id> "Nuevo titulo"');
    return updateFrontMatter(positionals[0], { title }, options);
  }
  if (command === "duplicate") return commandDuplicate(positionals[0], options, positionals.slice(1));
  if (command === "photo") return commandPhoto(positionals[0], positionals.slice(1), options);
  if (command === "media") return commandMedia(positionals[0], positionals.slice(1), options);
  if (command === "validate" || command === "lint") return commandValidate(positionals[0] || "all", options);
  if (command === "build") return commandBuild(options);
  if (command === "preflight") return commandPreflight();
  if (command === "health") return commandHealth(options);
  if (command === "inventory") return commandInventory(options);
  if (command === "open") return commandOpen(positionals[0]);
  if (command === "edit") return commandEdit(positionals[0]);
  if (command === "image-editor") {
    console.log("http://127.0.0.1:3001/image-editor");
    return;
  }
  if (command === "commit") return commandCommit(options, positionals);

  throw new Error(`Accion desconocida: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
