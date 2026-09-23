#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { startHarnessServer } from "./editor_harness.mjs";

const evidence = "/tmp/posts-block-editor";
await mkdir(evidence, { recursive: true });
const byteSource = '\n\n# Exact body title\r\n\r\nFirst **paragraph**.  \r\n\r\n```python\r\nx = 1\r\n\r\nprint(x)\r\n```\r\n\r\n[^note-1]: A note.\r\n\r\n';
const technicalSource = 'Inline $x^2$.\n\n$$\n\\sum_{i=1}^n i\n$$\n\n```python\ndef square(x):\n    return x ** 2\n```\n\n```mermaid\nflowchart LR\nA[Input] --> B[Output]\n```';
const fixtures = {};
for (const lang of ["en", "es"]) for (const kind of ["post", "notebook"]) {
  const path = `content_${lang}/posts/${kind === "notebook" ? "_index" : "exact-block-fixture"}.md`;
  fixtures[path] = { path, url: `/${lang === "es" ? "es/" : ""}posts/`, frontMatter: { title: "Exact body title", description: "Keep metadata", summary: "Keep metadata", date: "2026-09-23", custom_field: "untouched" }, body: byteSource };
}
const saved = [];
const { server, origin } = await startHarnessServer(saved, { fixtures });
const runtime = process.env.BLOCK_EDITOR_RUNTIME_ORIGIN;
const editorOrigin = runtime ? runtime + "/admin" : origin;
let browser;
const inspect = (page) => page.evaluate(() => {
  const { view } = window.fixtureEditor;
  const selection = view.state.selection.main;
  return { doc: view.state.sliceDoc(), anchor: selection.anchor, head: selection.head };
});
async function select(page, from, to = from) {
  await page.evaluate(({ from, to }) => {
    const { view } = window.fixtureEditor;
    view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true }); view.focus();
  }, { from, to });
  await page.waitForTimeout(70);
}
async function fill(page, text) {
  await page.locator(".cm-content").fill(text);
  await page.waitForFunction(value => document.querySelector("#body").value === value, text);
}
async function toggleRaw(page, width) {
  if (width <= 900) {
    await page.locator("#top-settings-button").click();
    await page.locator("#block-raw-toggle").click();
  } else await page.locator("#view-markdown").click();
}
async function openBlock(page, width) {
  await page.locator(width <= 900 ? ".block-mobile-actions" : ".block-gutter").click();
  await page.locator(".block-menu[open]").waitFor();
}
async function insert(page, label) {
  await page.locator(".block-add").click();
  await page.locator(".block-search").fill(label);
  await page.locator(".block-command-list button:visible").first().click();
}

try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  for (const lang of ["en", "es"]) for (const width of [1280, 390]) {
    const theme = lang === "en" && width === 1280 ? "dark" : "light";
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
    if (runtime) {
      // Exercise built admin HTML/assets with isolated APIs; never call real save/upload services.
      await context.route(runtime + "/admin/api/**", async route => {
        const target = route.request().url().replace(runtime + "/admin/api/", origin + "/api/");
        const response = await route.fetch({ url: target });
        if (target.endsWith("/api/preview")) {
          const payload = await response.json();
          payload.html = payload.html.replaceAll(origin, runtime);
          await route.fulfill({ response, body: JSON.stringify(payload) });
        } else await route.fulfill({ response });
      });
      await context.route(runtime + "/admin/*posts/", route => route.fulfill({ contentType: "text/html", body: "<h1>Notebook</h1>" }));
    }
    await context.addInitScript(() => {
      Object.defineProperty(window, "BlockMarkdownEditor", { configurable: true, set(api) {
        const create = api.create;
        api.create = options => (window.fixtureEditor = create(options));
        Object.defineProperty(window, "BlockMarkdownEditor", { value: api, configurable: true });
      }});
    });
    const page = await context.newPage();
    page.on("dialog", dialog => dialog.accept());
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    try {
      for (const kind of ["post", "notebook"]) {
        const path = `content_${lang}/posts/${kind === "notebook" ? "_index" : "exact-block-fixture"}.md`;
        await page.goto(`${editorOrigin}/${kind}-editor?mode=edit&path=${encodeURIComponent(path)}&theme=${theme}`);
        await page.locator(".cm-content").waitFor();
        assert.equal((await inspect(page)).doc, byteSource);
        await toggleRaw(page, width); await toggleRaw(page, width);
        assert.equal((await inspect(page)).doc, byteSource, "mode toggles preserve all original source bytes");
        const start = saved.length;
        await page.locator("#save").click();
        await page.waitForURL(/\/admin\/(es\/)?posts\/$/);
        const request = saved.slice(start).find(item => item.path === "/api/save-page");
        assert.equal(request.payload.body, byteSource, `${kind} no-op save preserves CRLF, blanks, fences and matching title`);
        assert.equal(request.payload.frontMatter.custom_field, "untouched");
      }
      await page.goto(`${editorOrigin}/post-editor?notebook=content_${lang}/posts&theme=${theme}`);
      await page.locator(".cm-content").waitFor();
      await page.locator("#title").fill(lang === "es" ? "Sobre los datos públicos: un manifiesto" : "On public data: a manifesto");
      assert.equal(await page.locator(".formatbar").isVisible(), false);
      assert.equal(await page.locator(".block-selection-toolbar").isVisible(), false);
      await fill(page, "Before SELECTED after\n\nSecond paragraph.\n\nThird paragraph.");
      await select(page, 7, 15);
      await page.locator(`.block-selection-toolbar button[aria-label="${lang === "es" ? "Negrita" : "Bold"}"]`).click();
      assert.equal((await inspect(page)).doc.split("\n")[0], "Before **SELECTED** after");
      const beforeToggle = await inspect(page);
      await toggleRaw(page, width);
      assert.deepEqual(await inspect(page), beforeToggle, "raw toggle preserves document and selection");
      await page.keyboard.press("ControlOrMeta+z");
      assert.ok((await inspect(page)).doc.startsWith("Before SELECTED after"), "undo works across raw toggle");
      await page.keyboard.press("ControlOrMeta+Shift+z");
      assert.equal((await inspect(page)).doc, beforeToggle.doc);
      await select(page, beforeToggle.anchor, beforeToggle.head);
      await toggleRaw(page, width);
      await page.screenshot({ path: `${evidence}/${lang}-${width}-selection.png` });
      if (width < 500) {
        await page.locator(".block-selection-toolbar > button").click();
        assert.equal(await page.locator(".block-selection-actions").isVisible(), false);
        await page.locator(".block-selection-toolbar > button").click();
      }
      await select(page, (await inspect(page)).doc.indexOf("Second"));
      await openBlock(page, width);
      await page.getByRole("button", { name: lang === "es" ? "Mover arriba" : "Move up", exact: true }).click();
      assert.ok((await inspect(page)).doc.startsWith("Second paragraph.\n\nBefore"));
      await page.keyboard.press("ControlOrMeta+z");
      assert.equal((await inspect(page)).doc, beforeToggle.doc, "moving a block is one undoable transaction");
      for (const action of [lang === "es" ? "Duplicar" : "Duplicate", lang === "es" ? "Eliminar bloque" : "Delete block"]) {
        await select(page, (await inspect(page)).doc.indexOf("Second"));
        await openBlock(page, width);
        await page.getByRole("button", { name: action, exact: true }).click();
        const count = (await inspect(page)).doc.split("Second paragraph.").length - 1;
        assert.equal(count, action === "Duplicate" || action === "Duplicar" ? 2 : 0);
        await page.keyboard.press("ControlOrMeta+z");
        assert.equal((await inspect(page)).doc, beforeToggle.doc, `${action} restores original source in one undo`);
      }
      await select(page, 0);
      await openBlock(page, width);
      await page.locator(".block-menu select").selectOption("quote");
      assert.ok((await inspect(page)).doc.startsWith("> Before"));
      await page.keyboard.press("ControlOrMeta+z");
      await fill(page, "");
      await page.locator(".cm-content").press("/");
      await page.locator(".block-search").waitFor();
      await page.locator(".block-search").fill("code");
      await page.keyboard.press("Enter");
      assert.ok((await inspect(page)).doc.startsWith("```python"), "slash trigger is replaced: " + JSON.stringify(await inspect(page)));
      assert.ok(!(await inspect(page)).doc.startsWith("/"));
      await select(page, 12);
      await openBlock(page, width);
      await page.locator(".block-menu select").selectOption("sql");
      assert.ok((await inspect(page)).doc.startsWith("```sql"));
      await page.keyboard.press("ControlOrMeta+z");
      assert.ok((await inspect(page)).doc.startsWith("```python"));
      for (const term of ["formula", "equation", "mermaid", "svg", "video", "interactive", "note"]) {
        await select(page, (await inspect(page)).doc.length);
        const before = (await inspect(page)).doc;
        await insert(page, term);
        assert.notEqual((await inspect(page)).doc, before, `${term} inserts content`);
        await page.keyboard.press("ControlOrMeta+z");
        assert.equal((await inspect(page)).doc, before, `${term} is undoable`);
      }
      await fill(page, '![Original](/fixture.png "Caption")');
      await select(page, 4); await openBlock(page, width);
      await page.getByRole("button", { name: lang === "es" ? "Editar imagen" : "Edit image", exact: true }).click();
      await page.locator(".block-field input").nth(1).fill("Accessible description");
      await page.getByRole("button", { name: lang === "es" ? "Aplicar" : "Apply", exact: true }).click();
      assert.equal((await inspect(page)).doc, '![Accessible description](</fixture.png> "Caption")');
      // Uploads use the existing endpoint and insert at the remembered body selection.
      await page.route('**/api/upload-image', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ url: '/fixture.png', markdown: '![Uploaded](/fixture.png)' }) }));
      await fill(page, "Before image after"); await select(page, 7, 12);
      await page.keyboard.press("ControlOrMeta+Shift+Enter");
      const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByRole("button", { name: lang === "es" ? "Subir imagen" : "Upload image", exact: true }).click()]);
      await chooser.setFiles({ name: "sample.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
      await page.waitForFunction(() => document.querySelector("#body").value.includes("![Uploaded]"));
      assert.match((await inspect(page)).doc, /^Before [\s\S]*!\[Uploaded\]\(\/fixture.png\)[\s\S]* after$/);
      await page.keyboard.press("ControlOrMeta+z");
      assert.equal((await inspect(page)).doc, "Before image after");
      await page.unroute('**/api/upload-image');
      // Exercise the browser composition path rather than only synthetic input events.
      await fill(page, "IME: "); await select(page, 5);
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.imeSetComposition", { text: "数学", selectionStart: 2, selectionEnd: 2 });
      await cdp.send("Input.insertText", { text: "数学" });
      await cdp.detach();
      assert.equal((await inspect(page)).doc, "IME: 数学");
      await fill(page, technicalSource);
      await page.waitForFunction(value => JSON.parse(localStorage.getItem("authorWritingDraftV1") || "null")?.body === value, technicalSource);
      await page.reload();
      await page.locator(".cm-content").waitFor();
      await page.locator("#draft-restore-accept").click();
      assert.equal((await inspect(page)).doc, technicalSource, "draft restoration hydrates CodeMirror");
      if (width <= 900) {
        await page.locator("#top-settings-button").click();
        await page.locator(".block-settings-tools button").nth(1).click();
      } else await page.locator("#technical-preview-open").click();
      const preview = page.frameLocator("#technical-preview-frame");
      await preview.locator(".katex-display").waitFor();
      await preview.locator(".technical-diagram-image svg").waitFor();
      assert.ok(await preview.locator(".hljs-keyword").count());
      await page.screenshot({ path: `${evidence}/${lang}-${width}-preview.png` });
      await page.locator('[data-close-technical="technical-preview"]').click();
      if (lang === "es") {
        const concept = "Amo los datos.\n\nLos datos públicos son una forma de confianza colectiva. Cuando la información circula, las personas pueden entender mejor su entorno, cuestionar, proponer y participar. Los datos públicos nos recuerdan que lo común también puede ser una fuente de posibilidades.\n\nEste manifiesto es una invitación a valorar, usar y mejorar los datos públicos. Se trata de una cultura de apertura, colaboración y responsabilidad compartida.\n\nUn futuro más justo y creativo es posible cuando más información está al alcance de las personas.\n\nEscribamos, construyamos y cuidemos juntos un ecosistema de datos públicos para una sociedad más abierta.";
        await fill(page, concept);
        const at = concept.indexOf("datos públicos");
        await select(page, at, at + "datos públicos".length);
        await page.screenshot({ path: `${evidence}/concept-${width}.png` });
        await page.setViewportSize({ width: width === 1280 ? 1060 : 372, height: 878 });
        await select(page, at, at + "datos públicos".length);
        await page.screenshot({ path: `${evidence}/concept-reference-${width === 1280 ? "desktop" : "mobile"}.png` });
        await page.setViewportSize({ width, height: 900 });
      }
      // A visible caret must stay put on Enter, including a short mobile viewport.
      for (const height of width < 500 ? [480, 330] : [900]) {
        await page.setViewportSize({ width, height });
        const lines = Array.from({ length: 75 }, (_, i) => `Paragraph ${i}. A line of text for the writing viewport.`).join("\n\n");
        await fill(page, lines); await select(page, lines.indexOf("Paragraph 30") + 12);
        await page.evaluate(() => {
          const { view } = window.fixtureEditor;
          const rect = view.coordsAtPos(view.state.selection.main.head);
          window.scrollBy(0, rect.top - innerHeight / 2);
        });
        await page.waitForTimeout(100);
        const scroll = await page.evaluate(() => scrollY);
        await page.keyboard.press("Enter"); await page.waitForTimeout(100);
        assert.ok(Math.abs((await page.evaluate(() => scrollY)) - scroll) <= 2, `Enter preserves visible caret viewport at ${width}x${height}`);
      }
      if (width < 500) {
        for (const narrow of [320, 390, 768]) {
          await page.setViewportSize({ width: narrow, height: 480 });
          await select(page, 0); await page.locator(".block-add").click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          assert.equal(await page.locator(".block-menu").evaluate(node => {
            const rect = node.getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
          }), true);
          assert.equal(await page.locator(".block-command-list button").evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height >= 44)), true);
          await page.screenshot({ path: `${evidence}/${lang}-${narrow}-insert.png` });
          await page.keyboard.press("Escape");
        }
      }
      await page.setViewportSize({ width, height: 900 });
      await fill(page, "A new block document.\n\nSource stays intact.");
      await page.locator("#title").fill("New block writing");
      await page.locator("#top-settings-button").click();
      await page.locator("#arena-enabled").check();
      await page.locator("#arena-channel").selectOption("1");
      await page.locator("#settings-close").click();
      const createStart = saved.length;
      await page.locator("#save").click();
      await page.waitForURL(/\/admin\/(es\/)?posts\/$/);
      const creation = saved.slice(createStart);
      assert.deepEqual(creation.map(item => item.path), ["/api/create-post", "/api/sync-arena"], "new CM post persists, synchronizes selected Are.na, then redirects");
      assert.equal(creation[0].payload.body, "A new block document.\n\nSource stays intact.");
      assert.equal(creation[0].payload.title, "New block writing");
      assert.deepEqual(errors, []);
      console.log(`PASS ${lang} ${width}: Post+Notebook byte-exact save, formatting, shared undo, raw mode, block move/convert, slash, technical insertion, image metadata, drafts, preview, Enter, mobile layouts`);
    } finally { await context.close(); }
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
