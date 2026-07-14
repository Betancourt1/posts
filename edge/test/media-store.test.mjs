import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteImageFromR2,
  normalizeUploadReference,
  prepareImageUpload,
  uploadImageToR2,
} from "../src/lib/media-store.mjs";

function dataUrl(mime, bytes) {
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

test("normalizes legacy repository paths and public upload URLs", () => {
  const expected = {
    path: "static/uploads/2026/07/photo.jpg",
    key: "uploads/2026/07/photo.jpg",
    url: "/uploads/2026/07/photo.jpg",
    contentType: "image/jpeg",
  };

  assert.deepEqual(normalizeUploadReference(expected.path), expected);
  assert.deepEqual(normalizeUploadReference(expected.url), expected);
  assert.deepEqual(normalizeUploadReference(`/admin${expected.url}`), expected);
  assert.deepEqual(normalizeUploadReference(`https://example.com${expected.url}`), expected);
});

test("rejects upload traversal, unrelated paths, and unsupported extensions", () => {
  assert.throws(() => normalizeUploadReference("/uploads/../secret.jpg"), /no permitida/);
  assert.throws(() => normalizeUploadReference("content_es/photo.jpg"), /no permitida/);
  assert.throws(() => normalizeUploadReference("/uploads/photo.txt"), /no permitida/);
});

test("prepares a signed image with the legacy API response paths", () => {
  const image = prepareImageUpload({
    name: "Árbol Nuevo.PNG",
    alt: "Un árbol",
    data: dataUrl("image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  }, {
    now: 1_783_469_600_000,
    date: new Date("2026-07-07T12:00:00Z"),
  });

  assert.equal(image.path, "static/uploads/2026/07/arbol-nuevo-1783469600000.png");
  assert.equal(image.key, "uploads/2026/07/arbol-nuevo-1783469600000.png");
  assert.equal(image.url, "/uploads/2026/07/arbol-nuevo-1783469600000.png");
  assert.equal(image.markdown, "![Un árbol](/uploads/2026/07/arbol-nuevo-1783469600000.png)");
  assert.equal(image.mime, "image/png");
});

test("rejects MIME, signature, and size mismatches", () => {
  const png = dataUrl("image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.throws(() => prepareImageUpload({ name: "photo.jpg", data: png }), /Formato/);
  assert.throws(() => prepareImageUpload({ name: "photo.png", data: dataUrl("image/png", [1, 2, 3]) }), /parece/);

  const oversized = `data:image/png;base64,${"A".repeat(Math.ceil((12 * 1024 * 1024 + 1) * 4 / 3))}`;
  assert.throws(() => prepareImageUpload({ name: "photo.png", data: oversized }), /demasiado grande/);
});

test("puts and deletes R2 objects while keeping the previous JSON shape", async () => {
  const objects = new Map();
  const bucket = {
    async put(key, bytes, options) {
      objects.set(key, { bytes, options });
    },
    async head(key) {
      return objects.has(key) ? { key } : null;
    },
    async delete(key) {
      objects.delete(key);
    },
  };
  const payload = {
    name: "photo.jpg",
    alt: "Photo",
    data: dataUrl("image/jpeg", [0xff, 0xd8, 0xff, 0x00]),
  };
  const result = await uploadImageToR2(bucket, payload, {
    now: 1_783_469_600_000,
    date: new Date("2026-07-07T12:00:00Z"),
  });

  assert.deepEqual(result, {
    path: "static/uploads/2026/07/photo-1783469600000.jpg",
    url: "/uploads/2026/07/photo-1783469600000.jpg",
    markdown: "![Photo](/uploads/2026/07/photo-1783469600000.jpg)",
  });
  assert.equal(objects.get("uploads/2026/07/photo-1783469600000.jpg").options.httpMetadata.contentType, "image/jpeg");

  assert.deepEqual(await deleteImageFromR2(bucket, result.url), {
    path: result.path,
    deleted: true,
  });
  assert.deepEqual(await deleteImageFromR2(bucket, result.url), {
    path: result.path,
    deleted: false,
  });
});
