import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const edgeRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = join(edgeRoot, "..");
const staticRoot = join(repositoryRoot, "static");
const clientRoot = join(edgeRoot, "client");
const outputRoot = join(edgeRoot, ".generated", "public");

const staticFiles = [
  "css/site.css",
  "favicon-16.png",
  "favicon-32.png",
  "favicon.ico",
  "fonts/Jersey10-OFL.txt",
  "fonts/Jersey10-Regular.ttf",
  "fonts/Jersey10-Regular.woff2",
  "fonts/Doto-Variable.woff2",
  "js/author-tools.js",
  "js/code-portfolio.js",
  "js/curved-scrollbar.js",
  "js/knowledge-graph.js",
  "js/photography-grid.js",
  "js/typography.js",
  "og-image.png",
  "site.webmanifest",
  "sounds/interaction-default.wav",
  "sounds/interaction-navigation.wav",
  "sounds/interaction-subcontrol.wav",
  "sounds/LICENSE-MECHVIBESDX.txt",
  "sounds/PROVENANCE.md",
];

async function copy(sourceRoot, sourcePath, destinationPath = sourcePath) {
  const source = join(sourceRoot, sourcePath);
  const destination = join(outputRoot, destinationPath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
  return relative(outputRoot, destination);
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const copied = [];
for (const asset of staticFiles) {
  copied.push(await copy(staticRoot, asset));
}

const clientFiles = (await readdir(clientRoot))
  .filter((name) => name.endsWith(".js"))
  .sort();

for (const asset of clientFiles) {
  copied.push(await copy(clientRoot, asset, join("js", asset)));
}

console.log(`Prepared ${copied.length} public assets in ${relative(repositoryRoot, outputRoot)}:`);
for (const asset of copied) {
  console.log(`  ${asset}`);
}
