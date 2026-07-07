#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const layoutsDir = path.resolve("layouts");
const forbiddenPattern = /hugo\.Environment\s+["']author["']|eq\s+hugo\.Environment\s+["']author["']/;
const allowedFile = path.join(layoutsDir, "partials", "author_enabled.html");
const failures = [];

async function scan(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await scan(filePath);
      continue;
    }

    if (!entry.isFile() || !filePath.endsWith(".html") || filePath === allowedFile) {
      continue;
    }

    const source = await readFile(filePath, "utf8");
    if (forbiddenPattern.test(source)) {
      failures.push(path.relative(process.cwd(), filePath));
    }
  }
}

await scan(layoutsDir);

if (failures.length > 0) {
  console.error("Author UI must use layouts/partials/author_enabled.html instead of hugo.Environment gates:");
  for (const file of failures) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}
