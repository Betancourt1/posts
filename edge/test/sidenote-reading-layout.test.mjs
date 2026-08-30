import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../src/layouts/SiteLayout.astro", import.meta.url);
const singlePath = new URL("../src/components/Single.astro", import.meta.url);
const navPath = new URL("../src/components/Nav.astro", import.meta.url);
const clientPath = new URL("../client/sidenote-reading.js", import.meta.url);
const soundPath = new URL("../client/sound.js", import.meta.url);
const cssPath = new URL("../../static/css/site.css", import.meta.url);

test("reading rail leaves margin notes alone while keeping the top graph artifact", async () => {
  const [layout, single, nav, client, sound, css] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(singlePath, "utf8"),
    readFile(navPath, "utf8"),
    readFile(clientPath, "utf8"),
    readFile(soundPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(layout, /hasSidenotes\s*\? <div class="sidenote-rail"/);
  assert.match(layout, /: <Sidebar lang=\{lang\}/);
  assert.match(layout, /<KnowledgeGraph data=\{page\.graphData\} lang=\{lang\} variant="home"/);
  assert.match(single, /data-sidenote-graph-open/);
  assert.doesNotMatch(layout, /utilityLink=/);
  assert.doesNotMatch(nav, /nav-utility-item|utilityLink/);
  assert.doesNotMatch(css, /\.nav-utility-item/);

  assert.match(client, /matchMedia\("\(min-width: 1001px\)"\)/);
  assert.match(client, /!document\.body\.classList\.contains\("zen-mode"\)/);
  assert.match(client, /window\.addEventListener\("beforeprint"[\s\S]*?restoreEndnotes/);
  assert.match(client, /window\.addEventListener\("load", schedulePosition/);
  assert.match(client, /new ResizeObserver\(schedulePosition\)\.observe\(article\)/);
  assert.match(client, /reference\.getBoundingClientRect\(\)\.top - railTop/);
  assert.match(client, /nextTop = top \+ item\.offsetHeight \+ 22/);
  assert.match(client, /graphDialog\.showModal\(\)/);
  assert.match(sound, /"\.post-context-button"/);
  assert.match(sound, /"\.sidenote-graph-dialog button"/);

  assert.match(css, /\.sidenote-endnotes\.is-in-rail[\s\S]*?border:\s*0;/);
  assert.match(css, /\.sidenote-endnotes\.is-in-rail \.sidenote-item\s*\{[\s\S]*?position:\s*absolute;/);
  assert.doesNotMatch(css, /\.sidenote-endnotes\.is-in-rail \.sidenote-backlinks\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(layout, /Margin notes|Notas al margen/);
});
