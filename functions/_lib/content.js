import { deleteGitHubFile, readGitHubFile, readRepositoryTree, writeGitHubFile, writeGitHubFileBase64 } from "./github.js";
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
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const IMAGE_MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);
const PROTECTED_NOTEBOOKS = new Set(["content_es/posts", "content_en/posts"]);

function startsWithBytes(bytes, expected) {
  return expected.every((byte, index) => bytes[index] === byte);
}

function base64HeaderBytes(base64, length = 64) {
  const chunk = base64.slice(0, Math.ceil(length / 3) * 4);
  const binary = atob(chunk);
  return Array.from(binary, (char) => char.charCodeAt(0));
}

function base64HeaderText(base64, length = 512) {
  const chunk = base64.slice(0, Math.ceil(length / 3) * 4);
  return atob(chunk);
}

function assertImageSignature(extension, base64) {
  const typeError = new Error("El archivo no parece una imagen valida.");
  const bytes = base64HeaderBytes(base64);

  if (extension === ".jpg" || extension === ".jpeg") {
    if (startsWithBytes(bytes, [0xff, 0xd8, 0xff])) return;
    throw typeError;
  }
  if (extension === ".png") {
    if (startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return;
    throw typeError;
  }
  if (extension === ".gif") {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    if (header === "GIF87a" || header === "GIF89a") return;
    throw typeError;
  }
  if (extension === ".webp") {
    const riff = String.fromCharCode(...bytes.slice(0, 4));
    const webp = String.fromCharCode(...bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") return;
    throw typeError;
  }
  if (extension === ".svg") {
    const text = base64HeaderText(base64).trimStart().replace(/^\uFEFF/, "");
    if (/^<svg[\s>]/i.test(text) || /^<\?xml[\s\S]*<svg[\s>]/i.test(text)) return;
    throw typeError;
  }
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

function notebookTitle(frontMatter, slug) {
  return frontMatter.title || slug.replace(/[-_]/g, " ");
}

function commitMessage(action, path) {
  return `${action} ${path} desde editor`;
}

function fallbackUrlForContent(path) {
  const [root, section] = path.split("/");
  const prefix = root === "content_es" ? "/es" : "";

  return section ? `${prefix}/${section}/` : `${prefix || "/"}`;
}

function uploadPathFromValue(value) {
  let raw = String(value || "").trim();

  if (!raw) {
    throw new Error("Ruta de imagen requerida.");
  }

  try {
    if (/^https?:\/\//.test(raw)) {
      raw = new URL(raw).pathname;
    }
  } catch {
    throw new Error("Ruta de imagen invalida.");
  }

  raw = raw.replace(/^\/admin(?=\/uploads\/)/, "");
  if (raw.startsWith("/uploads/")) {
    raw = `static${raw}`;
  }

  return safeUploadPath(raw.replace(/^\/+/, ""));
}

function collectUploadReferences(frontMatter, body) {
  const values = [];
  const add = (value) => {
    if (value) values.push(value);
  };

  add(frontMatter.image);
  add(frontMatter.thumbnail);

  if (Array.isArray(frontMatter.images)) {
    frontMatter.images.forEach((item) => {
      add(item?.src || item?.image || item?.url);
      add(item?.thumb || item?.thumbnail);
    });
  }

  for (const match of String(body || "").matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    add(match[1]);
  }

  const paths = new Set();

  values.forEach((value) => {
    try {
      paths.add(uploadPathFromValue(value));
    } catch {
      // Non-upload images or external URLs are not owned by this repo.
    }
  });

  return [...paths];
}

function normalizePhotoFrontMatter(path, frontMatter) {
  if (!path.startsWith("content_es/fotografia/") && !path.startsWith("content_en/fotografia/")) {
    return;
  }

  const fallbackAlt = String(frontMatter.title || frontMatter.summary || "Imagen").trim() || "Imagen";
  const firstGalleryAlt = Array.isArray(frontMatter.images)
    ? String(frontMatter.images[0]?.alt || frontMatter.images[0]?.image_alt || "").trim()
    : "";

  if (frontMatter.image && !String(frontMatter.image_alt || "").trim()) {
    frontMatter.image_alt = firstGalleryAlt || fallbackAlt;
  }

  if (Array.isArray(frontMatter.images)) {
    frontMatter.images = frontMatter.images.map((item, index) => {
      const alt = String(item?.alt || item?.image_alt || "").trim();
      if (alt) return { ...item, alt };
      return {
        ...item,
        alt: index === 0 ? frontMatter.image_alt || fallbackAlt : `${fallbackAlt} ${index + 1}`,
      };
    });
  }
}

async function deleteUploadPath(env, path) {
  const safePath = safeUploadPath(path);
  const current = await readGitHubFile(env, safePath);

  if (!current) {
    return false;
  }

  await deleteGitHubFile(env, {
    path: safePath,
    message: commitMessage("Elimina", safePath),
    sha: current.sha,
  });

  return true;
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
  const image = String(payload.image || "").trim();
  const thumbnail = String(payload.thumbnail || payload.thumb || "").trim();
  const explicitImageAlt = String(payload.imageAlt || payload.image_alt || "").trim();
  const caption = String(payload.caption || "").trim();
  const images = imageItemsFromPayload(payload.images);
  const coverAlt = explicitImageAlt || images[0]?.alt || "";
  const isPhotoNotebook = notebook.endsWith("/fotografia");
  const body = String(payload.body || (image ? "" : `# ${title}\n`));
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

  if (payload.arenaEnabled === true) {
    frontMatter.arena_enabled = true;
    if (String(payload.arenaChannelId || "").trim()) {
      frontMatter.arena_channel_id = String(payload.arenaChannelId).trim();
    }
  }

  if (isPhotoNotebook && frontMatter.tags.length === 0) {
    frontMatter.tags = ["fotografia"];
  }

  if (image) {
    frontMatter.image = image;
    if (thumbnail) {
      frontMatter.thumbnail = thumbnail;
    }
    frontMatter.image_alt = isPhotoNotebook ? coverAlt : coverAlt || title;

    if (caption) {
      frontMatter.caption = caption;
    }
    if (!frontMatter.summary && caption) {
      frontMatter.summary = caption;
    }
  }

  if (images.length > 1) {
    frontMatter.images = images;
  }

  normalizePhotoFrontMatter(path, frontMatter);

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, body),
    message: commitMessage("Crea", path),
  });

  return { path, url: contentPathToUrl(path) };
}

function imageItemsFromPayload(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const src = String(item?.src || item?.image || item?.url || "").trim();

      if (!src) return null;

      return {
        src,
        thumb: String(item?.thumb || item?.thumbnail || "").trim(),
        alt: String(item?.alt || item?.image_alt || "").trim(),
        caption: String(item?.caption || "").trim(),
      };
    })
    .filter(Boolean);
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

  Object.entries(payload.frontMatter || {}).forEach(([key, value]) => {
    if (value === null) delete frontMatter[key];
  });

  normalizePhotoFrontMatter(path, frontMatter);

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, String(payload.body || "")),
    message: commitMessage("Edita", path),
    sha: current.sha,
  });

  return { path, url: contentPathToUrl(path) };
}

export async function savePageFrontMatter(env, pathValue, patch) {
  const path = safeContentPath(pathValue);
  const current = await readGitHubFile(env, path);

  if (!current) {
    throw new Error("El archivo no existe.");
  }

  const parsed = splitMarkdown(current.content);
  const frontMatter = {
    ...parsed.frontMatter,
    ...(patch || {}),
  };

  Object.entries(patch || {}).forEach(([key, value]) => {
    if (value === null) delete frontMatter[key];
  });
  normalizePhotoFrontMatter(path, frontMatter);

  await writeGitHubFile(env, {
    path,
    content: formatMarkdown(frontMatter, parsed.body),
    message: commitMessage("Edita", path),
    sha: current.sha,
  });

  return { path, url: contentPathToUrl(path) };
}

export async function deleteImage(env, payload) {
  const path = uploadPathFromValue(payload.path || payload.url);
  const deleted = await deleteUploadPath(env, path);

  return {
    path,
    deleted,
  };
}

export async function deletePage(env, payload) {
  const path = safeContentPath(payload.path);

  if (path.endsWith("/_index.md")) {
    throw new Error("Usa borrar notebook para eliminar una pagina indice.");
  }

  const current = await readGitHubFile(env, path);

  if (!current) {
    throw new Error("El archivo no existe.");
  }

  const parsed = splitMarkdown(current.content);
  const imagePaths = payload.deleteImages ? collectUploadReferences(parsed.frontMatter, parsed.body) : [];
  const deletedImages = [];

  await deleteGitHubFile(env, {
    path,
    message: commitMessage("Elimina", path),
    sha: current.sha,
  });

  for (const imagePath of imagePaths) {
    if (await deleteUploadPath(env, imagePath)) {
      deletedImages.push(imagePath);
    }
  }

  return {
    path,
    deletedImages,
    url: fallbackUrlForContent(path),
  };
}

export async function deleteNotebook(env, payload) {
  const notebook = safeNotebookPath(payload.path);

  if (PROTECTED_NOTEBOOKS.has(notebook)) {
    throw new Error("Este notebook base no se borra desde el editor.");
  }

  const tree = await readRepositoryTree(env);
  const files = tree
    .filter((entry) => entry.type === "blob" && entry.path.startsWith(`${notebook}/`))
    .sort((a, b) => b.path.localeCompare(a.path));

  if (!files.length) {
    throw new Error("Notebook vacio o inexistente.");
  }

  const imagePaths = new Set();

  if (payload.deleteImages) {
    for (const entry of files) {
      if (!entry.path.endsWith(".md")) continue;
      const current = await readGitHubFile(env, entry.path);
      if (!current) continue;
      const parsed = splitMarkdown(current.content);
      collectUploadReferences(parsed.frontMatter, parsed.body).forEach((path) => imagePaths.add(path));
    }
  }

  for (const entry of files) {
    await deleteGitHubFile(env, {
      path: entry.path,
      message: commitMessage("Elimina", entry.path),
      sha: entry.sha,
    });
  }

  const deletedImages = [];

  for (const imagePath of imagePaths) {
    if (await deleteUploadPath(env, imagePath)) {
      deletedImages.push(imagePath);
    }
  }

  return {
    path: notebook,
    deletedFiles: files.map((entry) => entry.path),
    deletedImages,
    url: notebook.startsWith("content_es/") ? "/es/" : "/",
  };
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
  assertImageSignature(extension, base64);

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
