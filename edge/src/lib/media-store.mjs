const UPLOAD_ROOT = "static/uploads";
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export const IMAGE_MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);

function extensionOf(path) {
  const match = String(path).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

function startsWithBytes(bytes, expected) {
  return expected.every((byte, index) => bytes[index] === byte);
}

function assertImageSignature(extension, bytes) {
  const typeError = new Error("El archivo no parece una imagen valida.");

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
    const text = new TextDecoder().decode(bytes.slice(0, 512)).trimStart().replace(/^\uFEFF/, "");
    if (/^<svg[\s>]/i.test(text) || /^<\?xml[\s\S]*<svg[\s>]/i.test(text)) return;
    throw typeError;
  }
}

function decodeBase64(base64) {
  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new Error("Imagen invalida.");
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function dateInMexico(date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeUploadReference(value) {
  let raw = String(value || "").trim();

  if (!raw) throw new Error("Ruta de imagen requerida.");

  try {
    if (/^https?:\/\//.test(raw)) raw = new URL(raw).pathname;
  } catch {
    throw new Error("Ruta de imagen invalida.");
  }

  raw = raw.replace(/\\/g, "/").replace(/^\/admin(?=\/uploads\/)/, "");
  if (raw.startsWith("/uploads/")) raw = `static${raw}`;
  if (raw.startsWith("uploads/")) raw = `static/${raw}`;
  raw = raw.replace(/^\/+/, "");

  const parts = raw.split("/");
  const extension = extensionOf(raw);

  if (
    !raw.startsWith(`${UPLOAD_ROOT}/`)
    || parts.some((part) => !part || part === "." || part === "..")
    || !IMAGE_MIME_BY_EXTENSION.has(extension)
  ) {
    throw new Error("Ruta de imagen no permitida.");
  }

  const key = raw.replace(/^static\//, "");
  return {
    path: raw,
    key,
    url: `/${key}`,
    contentType: IMAGE_MIME_BY_EXTENSION.get(extension),
  };
}

export function prepareImageUpload(payload, options = {}) {
  const name = String(payload?.name || "").trim();
  const match = String(payload?.data || "").match(/^data:([^;]+);base64,([A-Za-z0-9+/=\s]+)$/);

  if (!name || !match) throw new Error("Imagen invalida.");

  const mime = match[1];
  const base64 = match[2].replace(/\s/g, "");
  const extension = extensionOf(name);
  const expectedMime = IMAGE_MIME_BY_EXTENSION.get(extension);

  if (!expectedMime || expectedMime !== mime) {
    throw new Error("Formato de imagen no permitido.");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = Math.floor((base64.length * 3) / 4) - padding;
  if (byteLength > MAX_UPLOAD_BYTES) throw new Error("La imagen es demasiado grande.");

  const bytes = decodeBase64(base64);
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("La imagen es demasiado grande.");
  assertImageSignature(extension, bytes);

  const baseName = slugify(name.replace(/\.[^.]+$/, ""));
  if (!baseName) throw new Error("No se pudo generar un slug.");

  const now = options.now ?? Date.now();
  const date = options.date || new Date(now);
  const [year, month] = dateInMexico(date).split("-");
  const reference = normalizeUploadReference(
    `${UPLOAD_ROOT}/${year}/${month}/${baseName}-${now}${extension}`,
  );
  const alt = String(payload?.alt || name.replace(/\.[^.]+$/, "")).trim();

  return {
    ...reference,
    bytes,
    mime,
    markdown: `![${alt}](${reference.url})`,
  };
}

export async function uploadImageToR2(bucket, payload, options) {
  const image = prepareImageUpload(payload, options);
  await bucket.put(image.key, image.bytes, {
    httpMetadata: {
      contentType: image.mime,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return {
    path: image.path,
    url: image.url,
    markdown: image.markdown,
  };
}

export async function deleteImageFromR2(bucket, value) {
  const reference = normalizeUploadReference(value);
  const current = await bucket.head(reference.key);

  if (current) await bucket.delete(reference.key);

  return {
    path: reference.path,
    deleted: Boolean(current),
  };
}
