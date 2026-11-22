import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../src/layouts/SiteLayout.astro", import.meta.url);
const singlePath = new URL("../src/components/Single.astro", import.meta.url);
const navPath = new URL("../src/components/Nav.astro", import.meta.url);
const clientPath = new URL("../client/sidenote-reading.js", import.meta.url);
const soundPath = new URL("../client/sound.js", import.meta.url);
const cssPath = new URL("../../static/css/site.css", import.meta.url);

test("reading rail places the graph above notes without a header trigger", async () => {
  const [layout, single, nav, client, sound, css] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(singlePath, "utf8"),
    readFile(navPath, "utf8"),
    readFile(clientPath, "utf8"),
    readFile(soundPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(layout, /hasSidenotes[\s\S]*?<div class="sidenote-sidebar">[\s\S]*?<KnowledgeGraph data=\{page\.graphData\} variant="sidebar" \/>[\s\S]*?<div class="sidenote-rail"/);
  assert.match(layout, /: <Sidebar/);
  assert.doesNotMatch(single, /data-sidenote-graph-open|post-context-button/);
  assert.doesNotMatch(layout, /sidenote-graph-dialog|variant="home"/);
  assert.doesNotMatch(layout, /utilityLink=/);
  assert.doesNotMatch(nav, /nav-utility-item|utilityLink/);
  assert.doesNotMatch(css, /\.nav-utility-item/);

  assert.match(client, /matchMedia\("\(min-width: 1001px\)"\)/);
  assert.match(client, /var useRail = desktop\.matches && !printMode;/);
  assert.doesNotMatch(client, /var useRail = [^\n]*zen-mode/);
  assert.match(client, /window\.addEventListener\("beforeprint"[\s\S]*?restoreEndnotes/);
  assert.match(client, /window\.addEventListener\("load", schedulePosition/);
  assert.match(client, /new ResizeObserver\(schedulePosition\)\.observe\(article\)/);
  assert.doesNotMatch(client, /new ResizeObserver\(schedulePosition\)\.observe\(graph\)/);
  assert.doesNotMatch(client, /setTimeout|motionDuration|trackRailMotion/);
  assert.match(client, /reference\.getBoundingClientRect\(\)\.top - railTop/);
  assert.match(client, /nextTop = top \+ item\.offsetHeight \+ 22/);
  assert.match(client, /article\.getBoundingClientRect\(\)\.bottom - railTop/);
  assert.doesNotMatch(client, /graphDialog|sidenote-graph-open/);
  assert.doesNotMatch(sound, /post-context-button|sidenote-graph-dialog/);

  assert.match(css, /\.sidenote-endnotes\.is-in-rail[\s\S]*?border:\s*0;/);
  assert.match(css, /\.sidenote-endnotes\.is-in-rail \.sidenote-item\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(css, /\.sidenote-sidebar-graph\s*\{[\s\S]*?transition-property:\s*opacity, transform, visibility;[\s\S]*?transition-duration:\s*0\.2s, 0\.2s, 0s;/);
  assert.doesNotMatch(css, /transition-property:\s*[^;]*(?:max-height|margin-bottom)/);
  assert.doesNotMatch(css, /\.sidenote-sidebar-graph\s*\{[\s\S]*?(?:transition:\s*all|will-change)/);
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?\.sidebar-column--sidenotes\s*\{[\s\S]*?display:\s*none;/);
  assert.match(css, /\.sidenote-backlinks\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(css, /\.sidenote-backlink(?::|\s*\{)/);
  assert.doesNotMatch(css, /\.post-context-button|\.sidenote-graph-dialog/);
  assert.doesNotMatch(layout, /Margin notes|Notas al margen/);
});
