import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("catalog groups featured projects first and keeps author controls", async () => {
  const [catalog, entry] = await Promise.all([
    read("../src/components/ProjectCatalog.astro"),
    read("../src/components/ProjectEntry.astro"),
  ]);
  assert.match(catalog, /sortProjects\(projects\.filter\(isFeatured\)\)/);
  assert.match(catalog, /sortProjects\(projects\.filter\(\(project\) => !isFeatured\(project\)\)\)/);
  assert.match(catalog, /grouped \? "h3" : "h2"/);
  assert.match(catalog, /data-author-action="add-post"/);
  assert.match(catalog, /data-author-action="edit-notebook"/);

  assert.match(entry, /meta\.links\[0\]/, "the first valid link stays the catalog action");
  assert.match(entry, /data-author-action="edit-post"/);
  assert.match(entry, /\(authorMode \? "\/admin" : ""\) \+ project\.path/);
  assert.match(entry, /Leer el caso/);
  assert.match(entry, /Read the case study/);
  assert.match(entry, /project-badge-" \+ meta\.status/);
});

test("project page shows facts, highlights and the private note without raw HTML", async () => {
  const overview = await read("../src/components/ProjectOverview.astro");
  for (const text of ["Rol", "Periodo", "Organización", "Tecnologías", "Trabajo privado"]) assert.ok(overview.includes(text), text);
  for (const text of ["Role", "Period", "Organization", "Stack", "Private work"]) assert.ok(overview.includes(text), text);
  assert.match(overview, /data-author-action="edit-post"/);
  assert.match(overview, /meta\.status === "private"/);
  assert.equal(overview.match(/set:html/g).length, 1, "only the Markdown body is raw HTML");
  assert.match(overview, /<section class="post-body" set:html=\{bodyHtml\} \/>/);
});

test("project components render metadata only as escaped text", async () => {
  const entry = await read("../src/components/ProjectEntry.astro");
  assert.doesNotMatch(entry, /set:html|innerHTML/);
});

test("project styles use theme variables and keep 44px mobile targets", async () => {
  const css = await read("../../static/css/site.css");
  const block = css.slice(css.indexOf(".project-group + .project-group"), css.indexOf(".project-overview .project-control"));
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /#[0-9a-f]{3,8}\b/i, "no hard-coded colors");
  assert.match(css, /@media \(max-width: 640px\) \{\n  \.project-actions a, \.project-actions \.project-control \{ min-height: 44px;/);
});

test("catalog admin controls exist only in author mode and carry their intent as data", async () => {
  const [entry, tools] = await Promise.all([
    read("../src/components/ProjectEntry.astro"),
    read("../../static/js/author-tools.js"),
  ]);
  assert.match(entry, /const missing = authorMode \? projectReadiness\(/);
  assert.match(entry, /\{missing\.length > 0 && <p class="project-missing">/);
  for (const action of ["toggle-featured", "toggle-publish"]) {
    assert.match(entry, new RegExp(`\\{authorMode && <button[^\\n]*data-author-action="${action}"`), action);
  }
  assert.match(entry, /data-featured-to=\{meta\.featured \? "off" : "on"\}/);
  assert.match(entry, /data-publish-to=\{published \? "draft" : "public"\} data-confirm=\{confirmPublish\}/);

  assert.match(tools, /typeof page\.body !== "string"/, "never saves without the existing body");
  assert.match(tools, /postJson\("\/api\/save-page", \{ path: path, frontMatter: patch, body: page\.body \}\)/);
  assert.match(tools, /patch = \{ draft: null, hidden: null \}/);
  assert.match(tools, /patch = \{ draft: true, hidden: true \}/);
  assert.doesNotMatch(tools.slice(tools.indexOf("function toggleProject"), tools.indexOf("function boot")), /waitForPublicState|setTimeout/);
});
