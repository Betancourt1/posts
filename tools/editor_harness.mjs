#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { imageEditorHtml } from "../functions/_lib/image-editor-template.js";
import { notebookEditorHtml } from "../functions/_lib/notebook-editor-template.js";
import { postEditorHtml } from "../functions/_lib/post-editor-template.js";
import { resolveEditorPath } from "../functions/_lib/editor-routing.js";

const fixtureImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const editorCoreScript = readFileSync(new URL("../static/js/editor/core.js", import.meta.url), "utf8");

const notebooks = [
  {
    path: "content_es/fotografia",
    indexPath: "content_es/fotografia/_index.md",
    title: "Fotografía",
    lang: "es",
  },
  {
    path: "content_es/posts",
    indexPath: "content_es/posts/_index.md",
    title: "Escritos",
    lang: "es",
  },
];

const pages = {
  "content_es/fotografia/_index.md": {
    path: "content_es/fotografia/_index.md",
    url: "/es/fotografia/",
    frontMatter: {
      title: "Fotografía",
      date: "2026-07-07",
      description: "Cuaderno de fotografías",
      draft: true,
      hidden: false,
    },
    body: "Cuaderno de fotografías.",
  },
  "content_es/posts/2026/julio/nota-de-prueba.md": {
    path: "content_es/posts/2026/julio/nota-de-prueba.md",
    url: "/es/posts/2026/07/nota-de-prueba/",
    frontMatter: {
      title: "Nota de prueba",
      date: "2026-07-10",
      tags: ["prueba"],
      summary: "Contrato del editor de posts",
      draft: false,
      hidden: false,
      arena_enabled: false,
    },
    body: "Contenido determinista para el arnés.",
  },
  "content_es/fotografia/mariposa.md": {
    path: "content_es/fotografia/mariposa.md",
    url: "/es/fotografia/mariposa/",
    frontMatter: {
      title: "Mariposa",
      date: "2026-07-10",
      tags: ["fotografia", "naturaleza"],
      image: "/fixture.png",
      thumbnail: "/fixture.png",
      image_alt: "Mariposa sobre una flor",
      caption: "",
      draft: false,
      hidden: false,
      arena_enabled: false,
    },
    body: "",
  },
};

function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function html(res, body) {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function startHarnessServer(savedRequests) {
  let origin = "";
  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", origin || "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/editor") {
      res.writeHead(302, { Location: `${resolveEditorPath(url.searchParams)}${url.search}` });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/notebook-editor") {
      html(res, notebookEditorHtml({ siteOrigin: origin, assetOrigin: origin, apiBase: "/api" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/post-editor") {
      html(res, postEditorHtml({ siteOrigin: origin, assetOrigin: origin, apiBase: "/api" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/image-editor") {
      html(res, imageEditorHtml({ siteOrigin: origin, assetOrigin: origin, apiBase: "/api" }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/fixture.png") {
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(fixtureImage);
      return;
    }

    if (req.method === "GET" && url.pathname === "/js/editor/core.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(editorCoreScript);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/notebooks") {
      json(res, 200, { notebooks });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/page") {
      const page = pages[url.searchParams.get("path") || ""];
      json(res, page ? 200 : 404, page || { error: "Fixture desconocido." });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/arena-channels") {
      json(res, 200, { profile: { id: "fixture" }, channels: [{ id: "1", title: "Desde mi blog" }] });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/arena-status") {
      json(res, 200, { state: "disabled", blocks: [], error: "" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/save-page") {
      const payload = await readJson(req);
      savedRequests.push({ path: url.pathname, payload });
      const fixture = pages[payload.path];
      json(res, 200, {
        path: payload.path,
        url: fixture?.url || "",
        frontMatter: payload.frontMatter || {},
        changed: true,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/sync-arena") {
      const payload = await readJson(req);
      savedRequests.push({ path: url.pathname, payload });
      json(res, 200, { arena: { state: "disabled", blocks: [], error: "" } });
      return;
    }

    if (req.method === "GET" && /^\/admin\/(es\/)?(fotografia|posts)\/$/.test(url.pathname)) {
      html(res, `<!doctype html><title>Notebook</title><h1 data-testid="notebook-destination">${url.pathname}</h1>`);
      return;
    }

    json(res, 404, { error: `Ruta no simulada: ${req.method} ${url.pathname}` });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
  return { server, origin };
}

async function waitForEditor(page) {
  await page.locator("#saved-pill, #save-state").first().waitFor({ state: "attached" });
  await page.waitForFunction(() => {
    const status = document.querySelector("#saved-pill, #save-state");
    return status && !/Cargando|Guardando/.test(status.textContent || "");
  });
}

async function assertEditorContract(page, expectedKind) {
  if (expectedKind !== "image" && !(await page.locator("#settings-title").isVisible())) {
    await page.locator("#top-settings-button").click();
    await page.locator("#settings-title").waitFor({ state: "visible" });
  }

  if (expectedKind === "notebook") {
    await assert.doesNotReject(() => page.locator("#settings-title").waitFor({ state: "visible" }));
    assert.equal(await page.locator("#settings-title").textContent(), "Notebook");
    assert.equal(await page.locator("#notebook-channel-section").isVisible(), true);
    assert.equal(await page.locator("#tags-field").isVisible(), false);
    assert.equal(await page.locator("#dropzone").count(), 0);
    return;
  }

  if (expectedKind === "post") {
    assert.equal(await page.locator("#settings-title").textContent(), "Propiedades");
    assert.equal(await page.locator("#body").isVisible(), true);
    assert.equal(await page.locator("#notebook-channel-section").isVisible(), false);
    assert.equal(await page.locator("#dropzone").count(), 0);
    return;
  }

  assert.equal(await page.locator("#dropzone").isVisible(), true);
  assert.equal(await page.locator("#image-stage").count(), 1);
  assert.equal(await page.locator("#settings-title").count(), 0);
}

async function runCase(browser, origin, fixture, viewport, savedRequests) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const consoleErrors = [];
  const blockedRequests = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await context.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin !== origin) {
      blockedRequests.push(requestUrl.href);
      await route.abort();
      return;
    }
    await route.continue();
  });

  const query = new URLSearchParams({
    mode: "edit",
    path: fixture.path,
    kind: fixture.requestedKind,
    theme: "dark",
  });
  const url = `${origin}/editor?${query}`;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    assert.equal(new URL(page.url()).pathname, `/${fixture.expectedKind}-editor`);
    await assertEditorContract(page, fixture.expectedKind);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(blockedRequests, []);

    if (viewport.width < 600) {
      if (fixture.expectedKind !== "image" && await page.locator("#settings-title").isVisible()) {
        await page.locator("#settings-close").click();
      }
      const before = savedRequests.length;
      const publish = page.locator(fixture.expectedKind === "image" ? "#mobile-publish" : "#save");
      await publish.waitFor({ state: "visible" });
      await Promise.all([
        page.waitForURL(/\/admin\/es\/(fotografia|posts)\/$/, { timeout: 10000 }),
        publish.click(),
      ]);
      assert.equal(savedRequests.length, before + 1);
      assert.equal(savedRequests.at(-1).payload.path, fixture.path);
    }
  } catch (error) {
    const name = `${fixture.expectedKind}-${viewport.width}x${viewport.height}`;
    const screenshotPath = `/tmp/posts-editor-harness-${name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    const status = await page.locator("#status, #publication-status-copy, #publication-message").allTextContents().catch(() => []);
    throw new Error(
      `${error.message}\nURL actual: ${page.url()}\nGuardados: ${savedRequests.length}\nEstado: ${status.join(" | ")}\nCaptura: ${screenshotPath}\nConsola: ${consoleErrors.join(" | ") || "sin errores"}`,
      { cause: error },
    );
  } finally {
    await context.close();
  }
}

async function main() {
  const savedRequests = [];
  const { server, origin } = await startHarnessServer(savedRequests);
  const browser = await chromium.launch({ headless: true });
  const fixtures = [
    {
      path: "content_es/fotografia/_index.md",
      requestedKind: "notebook",
      expectedKind: "notebook",
    },
    {
      path: "content_es/posts/2026/julio/nota-de-prueba.md",
      requestedKind: "post",
      expectedKind: "post",
    },
    {
      path: "content_es/fotografia/mariposa.md",
      requestedKind: "post",
      expectedKind: "image",
    },
  ];
  const viewports = [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ];

  try {
    for (const fixture of fixtures) {
      for (const viewport of viewports) {
        await runCase(browser, origin, fixture, viewport, savedRequests);
      }
    }
    console.log(`Editor harness: ${fixtures.length * viewports.length} escenarios correctos.`);
    console.log(`Guardados aislados comprobados: ${savedRequests.length}.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
