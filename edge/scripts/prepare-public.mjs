import { copyFile, cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

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
  "sounds/button_up.m4a",
  "sounds/button_down.m4a",
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

// The writing editor is the only client with package imports. Ship one local bundle.
await build({
  entryPoints: [join(clientRoot, "block-editor/index.js")],
  outfile: join(outputRoot, "js/block-editor.js"),
  bundle: true, minify: true, format: "iife", target: "es2022",
  loader: { ".svg": "text" },
  legalComments: "linked",
});
copied.push("js/block-editor.js");
copied.push(await copy(clientRoot, "block-editor/styles.css", "css/block-editor.css"));
copied.push(await copy(join(edgeRoot, "node_modules/@tabler/icons"), "LICENSE", "vendor/tabler/LICENSE.txt"));

// Keep vendor assets local; only Mermaid's browser modules are needed at runtime.
await cp(join(edgeRoot, "node_modules/katex/dist"), join(outputRoot, "vendor/katex"), {
  recursive: true,
  filter: (path) => !/\.(?:js|mjs|map)$/.test(path),
});
await cp(join(edgeRoot, "node_modules/mermaid/dist"), join(outputRoot, "vendor/mermaid"), {
  recursive: true,
  filter: (path) => {
    const asset = relative(join(edgeRoot, "node_modules/mermaid/dist"), path);
    return ["", "chunks", "chunks/mermaid.esm.min", "mermaid.esm.min.mjs"].includes(asset)
      || (asset.startsWith("chunks/mermaid.esm.min/") && asset.endsWith(".mjs"));
  },
});
// Authors can commit self-contained diagrams, animations, and interactive documents.
try {
  await cp(join(staticRoot, "visuals"), join(outputRoot, "visuals"), { recursive: true });
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

console.log(`Prepared ${copied.length} public assets in ${relative(repositoryRoot, outputRoot)}:`);
for (const asset of copied) {
  console.log(`  ${asset}`);
}
