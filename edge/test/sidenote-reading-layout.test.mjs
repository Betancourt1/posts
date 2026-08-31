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

  assert.match(layout, /hasSidenotes[\s\S]*?<div class="sidenote-sidebar">[\s\S]*?<KnowledgeGraph data=\{page\.graphData\} lang=\{lang\} variant="sidebar" \/>[\s\S]*?<div class="sidenote-rail"/);
  assert.match(layout, /: <Sidebar lang=\{lang\}/);
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
  assert.match(client, /function positionRailNotesNow\(\)[\s\S]*?cancelAnimationFrame\(frame\);[\s\S]*?frame = 0;[\s\S]*?positionRailNotes\(\);/);
  assert.match(client, /function syncGraphZenState\(\)[\s\S]*?!document\.body\.classList\.contains\("zen-mode"\)[\s\S]*?setGraphCollapsed\(false\)[\s\S]*?graph\.classList\.contains\("is-zen-collapsed"\)[\s\S]*?positionRailNotesNow\(\)/);
  assert.match(client, /graph\.addEventListener\("transitionend"[\s\S]*?event\.target === graph[\s\S]*?event\.propertyName === "opacity"[\s\S]*?document\.body\.classList\.contains\("zen-mode"\)[\s\S]*?setGraphCollapsed\(true\)/);
  assert.match(client, /var startsCollapsed = desktop\.matches && document\.body\.classList\.contains\("zen-mode"\);[\s\S]*?graph\.classList\.add\("is-zen-collapsed"\);[\s\S]*?syncPlacement\(\);[\s\S]*?positionRailNotesNow\(\);/);
  assert.match(single, /function setZen\(enabled, instant\)[\s\S]*?enabled && instant[\s\S]*?graph\.classList\.add\("is-zen-collapsed"\)/);
  assert.match(single, /setZen\(localStorage\.getItem\(key\) === "true", true\)/);
  assert.match(single, /button\.addEventListener\("click", function \(\) \{ setZen\(!body\.classList\.contains\("zen-mode"\)\); \}\);/);
  assert.doesNotMatch(client, /setTimeout|motionDuration|trackRailMotion/);
  assert.match(client, /reference\.getBoundingClientRect\(\)\.top - railTop/);
  assert.match(client, /nextTop = top \+ item\.offsetHeight \+ 22/);
  assert.match(client, /article\.getBoundingClientRect\(\)\.bottom - railTop/);
  assert.doesNotMatch(client, /graphDialog|showModal|sidenote-graph-open/);
  assert.doesNotMatch(sound, /post-context-button|sidenote-graph-dialog/);

  assert.match(css, /\.sidenote-endnotes\.is-in-rail[\s\S]*?border:\s*0;/);
  assert.match(css, /\.sidenote-endnotes\.is-in-rail \.sidenote-item\s*\{[\s\S]*?position:\s*absolute;/);
  assert.match(css, /\.sidenote-sidebar-graph\s*\{[\s\S]*?transition-property:\s*opacity, transform, visibility;[\s\S]*?transition-duration:\s*0\.2s, 0\.2s, 0s;/);
  assert.match(css, /body\.has-sidenotes\.zen-mode \.sidebar-column--sidenotes,[\s\S]*?body\.has-sidenotes\.zen-mode-returning \.sidebar-column--sidenotes\s*\{[\s\S]*?visibility:\s*visible;[\s\S]*?transform:\s*translate3d\(0, 0, 0\);/);
  assert.match(css, /body\.has-sidenotes\.zen-mode \.sidenote-sidebar-graph,[\s\S]*?body\.has-sidenotes\.zen-mode-returning \.sidenote-sidebar-graph\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?transition-delay:\s*0s, 0s, 0\.2s;/);
  assert.match(css, /body\.has-sidenotes \.sidenote-sidebar-graph\.is-zen-collapsed\s*\{[\s\S]*?max-height:\s*0;[\s\S]*?margin-bottom:\s*0;[\s\S]*?opacity:\s*0;/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*0\.12s, 0s, 0s;[\s\S]*?transition-delay:\s*0s, 0s, 0\.12s;/);
  assert.doesNotMatch(css, /transition-property:\s*[^;]*(?:max-height|margin-bottom)/);
  assert.doesNotMatch(css, /\.sidenote-sidebar-graph\s*\{[\s\S]*?(?:transition:\s*all|will-change)/);
  assert.doesNotMatch(css, /body\.has-sidenotes\.zen-mode \.nav-column/);
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?\.sidebar-column--sidenotes\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(css, /\.sidenote-endnotes\.is-in-rail \.sidenote-backlinks\s*\{[\s\S]*?display:\s*none;/);
  assert.doesNotMatch(css, /\.post-context-button|\.sidenote-graph-dialog/);
  assert.doesNotMatch(layout, /Margin notes|Notas al margen/);
});
