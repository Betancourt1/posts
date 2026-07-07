import { readGitHubFile, readRepositoryTree, writeGitHubFile, writeGitHubFileBase64 } from "./github.js";
import { formatMarkdown, splitMarkdown, tagsFromValue } from "./markdown.js";
import {
  CONTENT_ROOTS,
  UPLOAD_ROOT,
  contentPathToUrl,
  extensionOf,
  normalizeRepoPath,
  safeContentPath,
  safeNotebookPath,
  safeUploadPath,
  uploadPathToUrl,
} from "./paths.js";

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
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const IMAGE_MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
]);

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

function notebookTitle(frontMatter, slug) {
  return frontMatter.title || slug.replace(/[-_]/g, " ");
}

function commitMessage(action, path) {
  return `${action} ${path} desde editor`;
}

export async function readPage(env, path) {
  const safePath = safeContentPath(path);
  const file = await readGitHubFile(env, safePath);

  if (!file) {
    throw new Error("El archivo no existe.");
  }

  const { frontMatter, body } = splitMarkdown(file.content);

  return {
    path: safePath,
    frontMatter,
    body,
    url: contentPathToUrl(safePath),
  };
}

export async function listNotebooks(env) {
  const tree = await readRepositoryTree(env);
  const ignored = new Set(["archives", "tags"]);
  const indexFiles = tree
    .filter((entry) => entry.type === "blob" && /^content_(es|en)\/[^/]+\/_index\.md$/.test(entry.path))
    .filter((entry) => {
      const slug = entry.path.split("/")[1];
      return !ignored.has(slug);
    });
  const notebooks = await Promise.all(indexFiles.map(async (entry) => {
    const file = await readGitHubFile(env, entry.path);
    const { frontMatter } = splitMarkdown(file ? file.content : "");
    const [root, slug] = entry.path.split("/");
    const lang = root === "content_es" ? "es" : "en";
    const path = `${root}/${slug}`;

    return {
      path,
      indexPath: entry.path,
      lang,
      slug,
      title: notebookTitle(frontMatter, slug),
      description: frontMatter.description || frontMatter.summary || "",
      url: contentPathToUrl(entry.path),
    };
  }));

  return notebooks.sort((a, b) => a.lang.localeCompare(b.lang) || a.title.localeCompare(b.title));
}

export async function createPost(env, payload) {
  const title = String(payload.title || "").trim();

  if (!title) {
    throw new Error("La pagina necesita titulo.");
  }

  const notebook = safeNotebookPath(payload.notebook || "content_es/posts");
  const indexFile = await readGitHubFile(env, `${notebook}/_index.md`);

  if (!indexFile) {
    throw new Error("Notebook invalido.");
  }

  const isWritingNotebook = notebook.endsWith("/posts");
  const separator = isWritingNotebook ? "_" : "-";
  const slug = ensureSlug(payload.slug || title, separator);
  const date = ensureDate(payload.date);
  const [year, month] = date.split("-");
  const path = isWritingNotebook
    ? `${notebook}/${year}/${MONTHS_ES[Number(month) - 1]}/${slug}.md`
    : `${notebook}/${slug}.md`;
  const existing = await readGitHubFile(env, path);

  if (existing) {
    throw new Error("Ya existe un archivo con esa ruta.");
  }

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

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, String(payload.body || `# ${title}\n`)),
    message: commitMessage("Crea", path),
  });

  return { path, url: contentPathToUrl(path) };
}

export async function createNotebook(env, payload) {
  const lang = payload.lang === "en" ? "en" : "es";
  const root = lang === "en" ? "content_en" : "content_es";
  const title = String(payload.title || "").trim();

  if (!title) {
    throw new Error("El notebook necesita titulo.");
  }

  const slug = ensureSlug(payload.slug || title);
  const path = `${root}/${slug}/_index.md`;
  const existing = await readGitHubFile(env, path);

  if (existing) {
    throw new Error("Ya existe un notebook con esa ruta.");
  }

  const frontMatter = {
    title,
    description: String(payload.description || ""),
    date: ensureDate(payload.date),
    draft: payload.draft !== false,
  };

  if (payload.hidden) {
    frontMatter.hidden = true;
  }

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, String(payload.body || "")),
    message: commitMessage("Crea", path),
  });

  return { path, url: contentPathToUrl(path) };
}

export async function savePage(env, payload) {
  const path = safeContentPath(payload.path);
  const current = await readGitHubFile(env, path);

  if (!current) {
    throw new Error("El archivo no existe.");
  }

  const parsed = splitMarkdown(current.content);
  const frontMatter = {
    ...parsed.frontMatter,
    ...(payload.frontMatter || {}),
  };

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, String(payload.body || "")),
    message: commitMessage("Edita", path),
    sha: current.sha,
  });

  return { path, url: contentPathToUrl(path) };
}

export async function uploadImage(env, payload) {
  const name = String(payload.name || "").trim();
  const match = String(payload.data || "").match(/^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/);

  if (!name || !match) {
    throw new Error("Imagen invalida.");
  }

  const mime = match[1];
  const base64 = match[2].replace(/\s/g, "");
  const extension = extensionOf(name);
  const expectedMime = IMAGE_MIME_BY_EXTENSION.get(extension);

  if (!expectedMime || expectedMime !== mime) {
    throw new Error("Formato de imagen no permitido.");
  }

  const approxBytes = Math.floor((base64.length * 3) / 4);

  if (approxBytes > MAX_UPLOAD_BYTES) {
    throw new Error("La imagen es demasiado grande.");
  }

  const [year, month] = dateInMexico().split("-");
  const baseName = ensureSlug(name.replace(/\.[^.]+$/, ""));
  const path = safeUploadPath(`${UPLOAD_ROOT}/${year}/${month}/${baseName}-${Date.now()}${extension}`);
  const alt = String(payload.alt || name.replace(/\.[^.]+$/, "")).trim();

  await writeGitHubFileBase64(env, {
    path,
    contentBase64: base64,
    message: commitMessage("Sube", path),
  });

  const url = uploadPathToUrl(path);

  return {
    path,
    url,
    markdown: `![${alt}](${url})`,
  };
}

export function normalizeContentPath(path) {
  return safeContentPath(normalizeRepoPath(path));
}
