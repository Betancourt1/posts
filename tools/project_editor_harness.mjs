#!/usr/bin/env node
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { startHarnessServer } from "./editor_harness.mjs";

const notebooks = [
  { path: "content_en/proyectos-profesionales", indexPath: "content_en/proyectos-profesionales/_index.md", title: "Projects", lang: "en" },
  { path: "content_es/proyectos-profesionales", indexPath: "content_es/proyectos-profesionales/_index.md", title: "Proyectos", lang: "es" },
  { path: "content_es/posts", indexPath: "content_es/posts/_index.md", title: "Escritos", lang: "es" },
];

const projectPath = "content_en/proyectos-profesionales/replay.md";
const links = [
  { type: "demo", label: "Replay the trips", href: "https://example.org/demo" },
  { type: "code", label: "Browse the repository", href: "https://github.com/example/replay" },
];
const fixtures = {
  [projectPath]: {
    path: projectPath,
    url: "/proyectos-profesionales/replay/",
    frontMatter: {
      title: "Replay", date: "2026-07-22", summary: "Replay a month of trips.", tags: ["open-source"],
      featured: true, status: "live", role: "Design", period: "2026", order: "2", project_links: links,
      highlights: ["355,303 trips, 323,648 drawn", "Second result"], technologies: ["React", "Vite"],
    },
    body: "Existing case.",
  },
};

// A static stand-in for the admin catalog: the same data attributes ProjectEntry.astro renders.
const catalogRequests = [];
const catalogState = { page: { path: projectPath, frontMatter: {}, body: "Existing case." }, loads: 0 };
function catalogHtml(origin) {
  const button = (attrs, label) => `<button type="button" class="project-control" ${attrs} data-source-path="${projectPath}">${label}</button>`;
  return `<!doctype html><meta charset="utf-8"><title>Catálogo</title>
<div class="project-actions">
  ${button('data-author-action="toggle-featured" data-featured-to="on" id="feature"', "Destacar")}
  ${button('data-author-action="toggle-publish" data-publish-to="public" data-confirm="¿Publicar «Replay» (EN)?" id="publish"', "Publicar")}
  ${button('data-author-action="toggle-publish" data-publish-to="draft" id="unpublish"', "Pasar a borrador")}
</div>
<div class="author-tools" id="author-tools" data-api="${origin}/h" data-source-path="">
  <span id="author-status" hidden></span><div id="author-modal" hidden><h2 id="author-modal-title"></h2><div id="author-modal-body"></div><button id="author-close"></button></div>
  <div id="author-toast" role="status" hidden></div>
</div>
<script>sessionStorage.loads = Number(sessionStorage.loads || 0) + 1;</script>
<script src="${origin}/h/author-tools.js"></script>`;
}

async function routes(req, res, url) {
  const send = (status, body, type = "application/json") => { res.writeHead(status, { "Content-Type": type }); res.end(typeof body === "string" ? body : JSON.stringify(body)); return true; };
  if (url.pathname === "/admin/proyectos-profesionales/" || url.pathname === "/admin/es/proyectos-profesionales/") {
    return send(200, catalogHtml(`http://${req.headers.host}`), "text/html; charset=utf-8");
  }
  if (!url.pathname.startsWith("/h/")) return false;
  if (url.pathname === "/h/author-tools.js") {
    const { readFile } = await import("node:fs/promises");
    return send(200, await readFile(new URL("../static/js/author-tools.js", import.meta.url), "utf8"), "text/javascript");
  }
  if (url.pathname === "/h/api/health") return send(200, { ok: true });
  if (url.pathname === "/h/api/notebooks") return send(200, { notebooks });
  if (url.pathname === "/h/api/page") return send(200, catalogState.page);
  if (url.pathname === "/h/api/save-page") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    catalogRequests.push(payload);
    return send(200, { path: payload.path, frontMatter: payload.frontMatter, changed: true });
  }
  return send(404, { error: "Ruta no simulada." });
}

async function waitForEditor(page) {
  await page.locator("#saved-pill").waitFor({ state: "attached" });
  await page.waitForFunction(() => !/Cargando|Guardando/.test(document.querySelector("#saved-pill")?.textContent || ""));
}

const bodyText = (page, blockEditor) => blockEditor ? page.locator(".cm-content").innerText() : page.locator("#body").inputValue();

async function editCase(browser, origin, savedRequests, { blockEditor, viewport }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${origin}/post-editor?mode=edit&path=${encodeURIComponent(projectPath)}`);
    await waitForEditor(page);
    assert.equal(await page.locator("#project-editor").isVisible(), true);
    assert.equal(await page.locator("#project-status").inputValue(), "live");
    assert.equal(await page.locator("#project-role").inputValue(), "Design");
    assert.equal(await page.locator("#project-order").inputValue(), "2");
    assert.equal(await page.locator("#project-stack").inputValue(), "React, Vite");
    assert.deepEqual(await page.locator("#project-highlights input").evaluateAll((nodes) => nodes.map((node) => node.value)), ["355,303 trips, 323,648 drawn", "Second result"]);
    assert.equal(await page.locator("#project-rows > fieldset").count(), 2);
    assert.equal(await page.locator("#project-template").isVisible(), false, "an existing case study is never overwritten");
    const preview = await page.locator("#project-preview").innerText();
    for (const text of ["LIVE", "Replay", "Design · 2026", "Replay a month of trips.", "355,303 trips, 323,648 drawn", "React", "Replay the trips ↗", "View project →"]) {
      assert.match(preview.replace(/\s+/g, " "), new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), text);
    }
    assert.equal(await page.locator("#project-preview").getAttribute("aria-hidden"), "true");

    // Preview follows the title, the summary and the featured checkbox.
    await page.locator("#title").fill("Replay v2");
    await page.locator("#summary").fill("A new summary.");
    await page.locator("#project-featured").uncheck();
    const compact = (await page.locator("#project-preview").innerText()).replace(/\s+/g, " ");
    assert.match(compact, /Replay v2/);
    assert.match(compact, /A new summary\./);
    assert.doesNotMatch(compact, /Second result/, "compact cards do not list results");

    // Unchanged inherited values survive a save; edited ones change.
    await page.locator("#project-featured").check();
    await page.locator("#project-role").fill("Lead developer");
    const before = savedRequests.length;
    await Promise.all([page.waitForURL(/\/admin\/proyectos-profesionales\/$/), page.locator("#save").click()]);
    assert.equal(savedRequests.length, before + 1);
    const saved = savedRequests.at(-1).payload;
    assert.equal(saved.path, projectPath);
    assert.equal(saved.body, "Existing case.");
    assert.deepEqual(
      [saved.frontMatter.role, saved.frontMatter.status, saved.frontMatter.order, saved.frontMatter.period, saved.frontMatter.featured, saved.frontMatter.tags],
      ["Lead developer", "live", 2, "2026", true, ["open-source"]],
    );
    assert.deepEqual(saved.frontMatter.highlights, ["355,303 trips, 323,648 drawn", "Second result"]);
    assert.deepEqual(saved.frontMatter.technologies, ["React", "Vite"]);
    assert.deepEqual(saved.frontMatter.project_links, links);

    // Emptied fields are sent as empty values so the save removes them.
    await page.goto(`${origin}/post-editor?mode=edit&path=${encodeURIComponent(projectPath)}`);
    await waitForEditor(page);
    await page.locator("#project-status").selectOption("");
    await page.locator("#project-order").fill("");
    await page.locator("#project-stack").fill("");
    await page.locator("#project-highlights button").first().click();
    await page.locator("#project-highlights button").first().click();
    assert.equal(await page.locator("#project-highlight-add").isEnabled(), true);
    await Promise.all([page.waitForURL(/\/admin\/proyectos-profesionales\/$/), page.locator("#save").click()]);
    const emptied = savedRequests.at(-1).payload.frontMatter;
    assert.deepEqual([emptied.status, emptied.order, emptied.technologies, emptied.highlights], ["", "", [], []]);

    // A stored draft from before these fields existed restores without wiping the project's own values.
    await page.goto(`${origin}/post-editor?mode=edit&path=${encodeURIComponent(projectPath)}`);
    await waitForEditor(page);
    await page.locator("#project-role").fill("Draft role");
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("authorWritingDraftV1") || "null")?.project?.role === "Draft role");
    await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem("authorWritingDraftV1"));
      draft.project = { featured: true, project_links: draft.project.project_links };
      localStorage.setItem("authorWritingDraftV1", JSON.stringify(draft));
    });
    await page.reload();
    await waitForEditor(page);
    await page.locator("#draft-restore-accept").click();
    assert.equal(await page.locator("#project-role").inputValue(), "Design", "old-shape drafts keep the loaded values");
    assert.equal(await page.locator("#project-stack").inputValue(), "React, Vite");
    await page.screenshot({ path: `/tmp/posts-project-editor-edit-${viewport.width}-${blockEditor ? "block" : "text"}.png`, fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

async function newCase(browser, origin, savedRequests, { blockEditor, viewport }) {
  for (const lang of ["es", "en"]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.goto(`${origin}/post-editor?mode=new&notebook=content_${lang}/proyectos-profesionales`);
      await waitForEditor(page);
      assert.equal(await page.locator("#project-editor").isVisible(), true);
      assert.equal(await page.locator("#project-template").isVisible(), true);
      await page.locator("#project-template").click();
      const heading = lang === "es" ? "## Problema" : "## Problem";
      // The block editor may hide Markdown markers, so the visible check is on the heading text; the saved body is checked below.
      assert.match(await bodyText(page, blockEditor), new RegExp(heading.slice(3)));
      assert.equal(await page.locator("#project-template").isVisible(), false, "the skeleton is offered only while the body is empty");

      // Link type follows the URL until it is changed by hand.
      await page.locator("#project-add").click();
      const row = page.locator("#project-rows > fieldset").first();
      const href = row.locator("input").nth(1);
      const type = row.locator("select");
      await href.fill("https://github.com/example/replay");
      assert.equal(await type.inputValue(), "code");
      assert.equal(await row.locator("input").first().getAttribute("placeholder"), lang === "es" ? "Explorar el repositorio" : "Browse the repository");
      await href.fill("https://example.github.io/replay/");
      assert.equal(await type.inputValue(), "demo");
      await href.fill("https://example.org/trips.csv");
      assert.equal(await type.inputValue(), "data");
      await href.fill("https://example.org/paper.pdf");
      assert.equal(await type.inputValue(), "writing");
      await type.selectOption("data");
      await href.fill("https://github.com/example/replay");
      assert.equal(await type.inputValue(), "data", "a manual type is never overridden");
      await row.locator("input").first().fill("Trip data");

      await page.locator("#project-add").click();
      assert.equal(await page.locator("#project-rows > fieldset").count(), 2);
      await page.locator("#writing-load").click();
      await page.locator("#writing-select").selectOption({ label: "Notas de método" });
      assert.equal(await page.locator("#project-rows > fieldset").count(), 3);
      const picked = page.locator("#project-rows > fieldset").nth(2);
      assert.equal(await picked.locator("select").inputValue(), "writing");
      assert.equal(await picked.locator("input").nth(1).inputValue(), "/posts/2026/notas-de-metodo/");
      await page.locator("#project-rows > fieldset").nth(1).locator("button[data-remove]").click();

      await page.locator("#title").fill("Replay nuevo");
      await page.locator("#summary").fill("Resumen del proyecto.");
      await page.locator("#project-status").selectOption("private");
      await page.locator("#project-role").fill("Diseño y desarrollo");
      await page.locator("#project-period").fill("2025–2026");
      await page.locator("#project-org").fill("Acme");
      await page.locator("#project-order").fill("3");
      await page.locator("#project-stack").fill("Python, SQL , Python");
      for (let index = 0; index < 4; index += 1) {
        await page.locator("#project-highlight-add").click();
        await page.locator("#project-highlights input").nth(index).fill(`Resultado ${index + 1}`);
      }
      assert.equal(await page.locator("#project-highlight-add").isDisabled(), true, "at most four results");
      const preview = (await page.locator("#project-preview").innerText()).replace(/\s+/g, " ");
      assert.match(preview, lang === "es" ? /PRIVADO/i : /PRIVATE/i);
      assert.match(preview, lang === "es" ? /Leer el caso →/ : /Read the case study →/);
      assert.doesNotMatch(preview, /Resultado 4/, "the card lists three results");
      await page.locator("#project-featured").check();
      assert.match(await page.locator("#project-preview").innerText(), /Resultado 3/);
      assert.doesNotMatch(await page.locator("#project-preview").innerText(), /Resultado 4/);

      // Project fields stay while another notebook is selected and are not sent for it.
      await page.locator("#top-settings-button").click();
      await page.locator("#notebook").selectOption("content_es/posts");
      assert.equal(await page.locator("#project-editor").isVisible(), false);
      await page.locator("#notebook").selectOption(`content_${lang}/proyectos-profesionales`);
      assert.equal(await page.locator("#project-editor").isVisible(), true);
      assert.equal(await page.locator("#project-role").inputValue(), "Diseño y desarrollo");
      await page.locator("#settings-close").click();
      await page.screenshot({ path: `/tmp/posts-project-editor-new-${lang}-${viewport.width}-${blockEditor ? "block" : "text"}.png`, fullPage: true });

      const before = savedRequests.length;
      await Promise.all([page.waitForURL(/\/admin\/(es\/)?proyectos-profesionales\/$/), page.locator("#save").click()]);
      assert.equal(savedRequests.length, before + 1);
      const payload = savedRequests.at(-1).payload;
      assert.equal(payload.notebook, `content_${lang}/proyectos-profesionales`);
      assert.deepEqual(
        [payload.role, payload.period, payload.org, payload.status, payload.order, payload.featured],
        ["Diseño y desarrollo", "2025–2026", "Acme", "private", 3, true],
      );
      assert.deepEqual(payload.highlights, ["Resultado 1", "Resultado 2", "Resultado 3", "Resultado 4"]);
      assert.deepEqual(payload.technologies, ["Python", "SQL", "Python"], "deduplication happens on the server");
      assert.deepEqual(payload.project_links.map((link) => [link.type, link.label]), [["data", "Trip data"], ["writing", "Notas de método"]]);
      assert.match(payload.body, new RegExp(heading));
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  }
}

async function catalogCase(browser, origin, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const open = async () => {
      await page.goto(`${origin}/admin/proyectos-profesionales/`);
      await page.waitForFunction(() => document.querySelector("#author-status")?.textContent === "ready");
    };
    const toast = () => page.locator("#author-toast").innerText();
    await open();
    await page.evaluate(() => { sessionStorage.loads = 0; });

    // Featuring saves one absolute patch together with the untouched body, then reloads.
    catalogRequests.length = 0;
    await Promise.all([page.waitForNavigation(), page.locator("#feature").click()]);
    assert.deepEqual(catalogRequests, [{ path: projectPath, frontMatter: { featured: true }, body: "Existing case." }]);

    // A declined confirmation saves nothing.
    await open();
    catalogRequests.length = 0;
    page.once("dialog", (dialog) => { assert.match(dialog.message(), /Publicar «Replay» \(EN\)/); dialog.dismiss(); });
    await page.locator("#publish").click();
    await page.waitForTimeout(300);
    assert.deepEqual(catalogRequests, []);

    page.once("dialog", (dialog) => dialog.accept());
    await Promise.all([page.waitForNavigation(), page.locator("#publish").click()]);
    assert.deepEqual(catalogRequests, [{ path: projectPath, frontMatter: { draft: null, hidden: null }, body: "Existing case." }]);

    catalogRequests.length = 0;
    await open();
    await Promise.all([page.waitForNavigation(), page.locator("#unpublish").click()]);
    assert.deepEqual(catalogRequests, [{ path: projectPath, frontMatter: { draft: true, hidden: true }, body: "Existing case." }]);

    // Without a readable body nothing is saved and the button is usable again.
    await open();
    catalogRequests.length = 0;
    const original = catalogState.page;
    catalogState.page = { path: projectPath, frontMatter: {} };
    await page.locator("#feature").click();
    await page.locator("#author-toast").waitFor({ state: "visible" });
    assert.match(await toast(), /No se pudo leer el contenido/);
    assert.equal(await page.locator("#feature").isDisabled(), false);
    assert.deepEqual(catalogRequests, []);
    catalogState.page = original;

    // A projection failure explains that GitHub already has the change.
    await page.route("**/h/api/save-page", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "GitHub was updated, but the live content projection failed.", projectionFailed: true }) }));
    await page.locator("#feature").click();
    await page.waitForFunction(() => /GitHub/.test(document.querySelector("#author-toast")?.textContent || ""));
    assert.match(await toast(), /sí se guardó en GitHub/);
    assert.equal(await page.locator("#feature").isDisabled(), false);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

const savedRequests = [];
for (const blockEditor of [false, true]) {
  const { server, origin } = await startHarnessServer(savedRequests, { blockEditor, fixtures, notebooks, routes });
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      await editCase(browser, origin, savedRequests, { blockEditor, viewport });
      await newCase(browser, origin, savedRequests, { blockEditor, viewport });
      if (!blockEditor) await catalogCase(browser, origin, viewport);
    }
    console.log(`Project editor harness (${blockEditor ? "block editor" : "textarea"}): edit, create, draft restore${blockEditor ? "" : " and catalog toggles"} passed.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
