import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MIN_COVER_SIZE = 100;
const booksPath = new URL("../../content_en/books/", import.meta.url);

export function hasUsableCoverDimensions(metadata) {
  return metadata.width >= MIN_COVER_SIZE && metadata.height >= MIN_COVER_SIZE;
}

function jpegDimensions(buffer) {
  for (let offset = 2; offset + 9 < buffer.length;) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
}

function imageDimensions(buffer) {
  if (buffer.subarray(1, 4).toString() === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return jpegDimensions(buffer);
}

async function verifyCover(name) {
  const markdown = await readFile(new URL(name, booksPath), "utf8");
  const image = markdown.match(/^image: "(https:\/\/.+)"$/m)?.[1];
  if (!image) return `${name}: missing HTTPS image`;

  const response = await fetch(image);
  if (!response.ok) return `${name}: HTTP ${response.status}`;

  const metadata = imageDimensions(Buffer.from(await response.arrayBuffer())) ?? {};
  if (!hasUsableCoverDimensions(metadata)) {
    return `${name}: ${metadata.width ?? "?"}x${metadata.height ?? "?"}`;
  }
}

async function main() {
  const names = (await readdir(booksPath)).filter((name) => name.endsWith(".md") && name !== "_index.md");
  const failures = (await Promise.all(names.map(verifyCover))).filter(Boolean);

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Verified ${names.length} book covers (${MIN_COVER_SIZE}px minimum).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
