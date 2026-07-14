#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const edgeRoot = fileURLToPath(new URL("..", import.meta.url));
const uploadRoot = path.resolve(edgeRoot, "../static/uploads");
const wranglerBin = path.join(edgeRoot, "node_modules/.bin/wrangler");
const MIME_BY_EXTENSION = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".svg", "image/svg+xml"],
]);

function usage() {
  console.log(`Usage: npm run media:sync -- [options]

Upload static/uploads to the R2 bucket configured in wrangler.jsonc.

Options:
  --dry-run       List objects without uploading them
  --local         Upload to Wrangler's local R2 store
  --bucket NAME   Override the configured bucket name
  -h, --help      Show this help`);
}

function parseArgs(args) {
  const options = { dryRun: false, local: false, bucket: "" };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--local") options.local = true;
    else if (argument === "--bucket") options.bucket = args[++index] || "";
    else if (argument === "--help" || argument === "-h") options.help = true;
    else throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

async function configuredBucketName() {
  const config = await readFile(path.join(edgeRoot, "wrangler.jsonc"), "utf8");
  const match = config.match(/"r2_buckets"\s*:\s*\[[\s\S]*?"bucket_name"\s*:\s*"([^"]+)"/);
  if (!match) throw new Error("No R2 bucket_name found in wrangler.jsonc.");
  return match[1];
}

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolutePath));
    else if (entry.isFile()) files.push(absolutePath);
  }

  return files.sort();
}

function runWrangler(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(wranglerBin, args, { cwd: edgeRoot, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Wrangler exited with code ${code}.`)));
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const bucket = options.bucket || await configuredBucketName();
  const files = await listFiles(uploadRoot);
  const uploads = files.map((file) => {
    const extension = path.extname(file).toLowerCase();
    const contentType = MIME_BY_EXTENSION.get(extension);
    if (!contentType) throw new Error(`Unsupported media file: ${file}`);
    const relativePath = path.relative(uploadRoot, file).split(path.sep).join("/");
    return { file, key: `uploads/${relativePath}`, contentType };
  });

  console.log(`${options.dryRun ? "Would upload" : "Uploading"} ${uploads.length} files to ${bucket}:`);

  for (const [index, upload] of uploads.entries()) {
    console.log(`[${index + 1}/${uploads.length}] ${upload.key}`);
    if (options.dryRun) continue;
    await runWrangler([
      "r2",
      "object",
      "put",
      `${bucket}/${upload.key}`,
      "--file",
      upload.file,
      "--content-type",
      upload.contentType,
      "--cache-control",
      "public, max-age=31536000, immutable",
      options.local ? "--local" : "--remote",
    ]);
  }

  console.log(options.dryRun ? "Dry run complete." : "Media sync complete.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
