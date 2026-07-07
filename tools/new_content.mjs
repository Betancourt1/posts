#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

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

const TIME_ZONE = "America/Mexico_City";

function printHelp() {
  console.log(`Uso:
  npm run new:post -- "Titulo del texto" [--date YYYY-MM-DD] [--slug mi_texto] [--hidden] [--publish] [--dry-run]
  npm run new:zettel -- "Idea concreta" [--slug idea-concreta] [--hidden] [--publish] [--dry-run]
  npm run new:page -- "Nombre de pagina" --lang es|en [--section proyectos-profesionales] [--slug nombre] [--hidden] [--publish] [--dry-run]

Ejemplos:
  npm run new:post -- "La politica como identidad"
  npm run new:zettel -- "Capital cultural como secuestro de clase"
  npm run new:page -- "Nuevo proyecto" --lang es --section proyectos-profesionales`);
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      positionals.push(value);
      continue;
    }

    const key = value.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { options, positionals };
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

function slugify(value, separator) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
}

function quoteYaml(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function frontMatter(fields) {
  const lines = ["---"];

  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      lines.push(`${key}: [${value.map(quoteYaml).join(", ")}]`);
    } else if (typeof value === "boolean") {
      lines.push(`${key}: ${value ? "true" : "false"}`);
    } else if (value === "") {
      lines.push(`${key}: ""`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

function ensureTitle(positionals) {
  const title = positionals.join(" ").trim();

  if (!title) {
    printHelp();
    process.exitCode = 1;
    throw new Error("Falta el titulo.");
  }

  return title;
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

function ensureSlug(value) {
  if (!value) {
    throw new Error("No se pudo generar un slug. Usa --slug nombre-del-archivo.");
  }

  return value;
}

function buildDraftFields(title, date, options, extraFields = {}) {
  return {
    title: quoteYaml(title),
    date,
    draft: !options.publish,
    ...extraFields,
    ...(options.hidden ? { hidden: true } : {}),
  };
}

function postDraft(title, options) {
  const date = ensureDate(options.date);
  const [year, month] = date.split("-");
  const slug = ensureSlug(options.slug || slugify(title, "_"));
  const filePath = path.join(
    "content_es",
    "posts",
    year,
    MONTHS_ES[Number(month) - 1],
    `${slug}.md`,
  );
  const body = [
    frontMatter(buildDraftFields(title, date, options, { tags: [], summary: "" })),
    "",
    `# ${title}`,
    "",
  ].join("\n");

  return { filePath, body };
}

function zettelDraft(title, options) {
  const date = ensureDate(options.date);
  const slug = ensureSlug(options.slug || slugify(title, "-"));
  const filePath = path.join("content_es", "zettelkasten", `${slug}.md`);
  const body = [
    frontMatter(buildDraftFields(title, date, options, { tags: ["zettelkasten"], summary: "" })),
    "",
    `# ${title}`,
    "",
    "## Idea",
    "",
    "## Desarrollo",
    "",
    "## Referencias",
    "",
  ].join("\n");

  return { filePath, body };
}

function pageDraft(title, options) {
  const lang = options.lang || "es";

  if (!["es", "en"].includes(lang)) {
    throw new Error("--lang debe ser es o en.");
  }

  const date = ensureDate(options.date);
  const slug = ensureSlug(options.slug || slugify(title, "-"));
  const root = lang === "es" ? "content_es" : "content_en";
  const filePath = options.section
    ? path.join(root, options.section, `${slug}.md`)
    : path.join(root, slug, "index.md");
  const body = [
    frontMatter(buildDraftFields(title, date, options, { description: "", tags: [] })),
    "",
    `# ${title}`,
    "",
  ].join("\n");

  return { filePath, body };
}

function draftFor(type, title, options) {
  if (type === "post") return postDraft(title, options);
  if (type === "zettel") return zettelDraft(title, options);
  if (type === "page") return pageDraft(title, options);

  printHelp();
  throw new Error(`Tipo de contenido no soportado: ${type || "(vacio)"}`);
}

function writeDraft(filePath, body, dryRun) {
  const absolutePath = path.resolve(filePath);

  if (existsSync(absolutePath)) {
    throw new Error(`Ya existe: ${filePath}`);
  }

  if (!dryRun) {
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, body, "utf8");
  }

  return absolutePath;
}

try {
  const [type, ...rest] = process.argv.slice(2);

  if (!type || type === "--help" || type === "-h") {
    printHelp();
    process.exit(0);
  }

  const { options, positionals } = parseArgs(rest);
  const title = ensureTitle(positionals);
  const { filePath, body } = draftFor(type, title, options);
  const absolutePath = writeDraft(filePath, body, options["dry-run"]);

  if (options["dry-run"]) {
    console.log(`Se crearia: ${filePath}`);
  } else {
    console.log(`Creado: ${filePath}`);
  }

  console.log(`Ruta completa: ${absolutePath}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
