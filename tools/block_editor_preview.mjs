#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { splitMarkdown } from "../functions/_lib/markdown.js";
import { startHarnessServer } from "./editor_harness.mjs";

const fixtures = {};
const samples = [
  "content_en/posts/2026/septiembre/sobre_los_datos_publicos_un_manifiesto.md",
  "content_en/posts/2026/agosto/el_matematico_en_el_loop.md",
];
for (const path of samples) {
  const { frontMatter, body } = splitMarkdown(await readFile(new URL("../" + path, import.meta.url), "utf8"));
  fixtures[path] = { path, url: "/posts/preview/", frontMatter, body };
}
const technicalPath = "content_es/posts/block-editor-demo.md";
fixtures[technicalPath] = {
  path: technicalPath, url: "/es/posts/preview/",
  frontMatter: { title: "Un modelo, paso a paso", technical: true, draft: true },
  body: 'Una función transforma una entrada en una salida.\n\n$$\nf(x) = x^2\n$$\n\n```python\ndef square(x):\n    return x ** 2\n```\n\n```mermaid\nflowchart LR\n  A[Entrada] --> B[Modelo]\n  B --> C[Salida]\n```\n',
};
samples.push(technicalPath);
const { server, origin } = await startHarnessServer([], { fixtures });
console.log("Local editor preview. Save requests stay in memory; content files and production are untouched.");
for (const path of samples) console.log(`${origin}/post-editor?mode=edit&path=${encodeURIComponent(path)}&theme=light`);
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
