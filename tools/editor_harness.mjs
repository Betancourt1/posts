#!/usr/bin/env node

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { imageEditorHtml } from "../functions/_lib/image-editor-template.js";
import { editorCoreClientScript } from "../functions/_lib/editor-core-client.js";
import { notebookEditorHtml } from "../functions/_lib/notebook-editor-template.js";
import { postEditorHtml } from "../functions/_lib/post-editor-template.js";
import { resolveEditorPath } from "../functions/_lib/editor-routing.js";

const fixtureImage = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

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
  "content_es/_index.md": {
    path: "content_es/_index.md",
    url: "/es/",
    frontMatter: {
      title: "Inicio",
      date: "2026-02-22",
      description: "Un jardín digital de notas y proyectos.",
      draft: false,
    },
    body: "Contenido de la página de inicio.",
  },
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
      tags: ["test"],
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
      tags: ["photography", "nature"],
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

    if (req.method === "GET" && url.pathname === "/editor-core") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(editorCoreClientScript);
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

    if (req.method === "GET" && /^\/es\/(fotografia|posts)\/.+\/$/.test(url.pathname)) {
      html(res, `<!doctype html><title>Publicación</title><main>${url.pathname}</main>`);
      return;
    }

    if (req.method === "GET" && (/^\/admin\/(es\/)?(fotografia|posts)\/$/.test(url.pathname) || url.pathname === "/admin/es/")) {
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

async function assertEditorContract(page, fixture) {
  const expectedKind = fixture.expectedKind;
  if (expectedKind !== "image" && !(await page.locator("#settings-title").isVisible())) {
    await page.locator("#top-settings-button").click();
    await page.locator("#settings-title").waitFor({ state: "visible" });
  }

  if (expectedKind === "notebook") {
    await assert.doesNotReject(() => page.locator("#settings-title").waitFor({ state: "visible" }));
    assert.equal(await page.locator("#settings-title").textContent(), fixture.home ? "Página de inicio" : "Notebook");
    assert.equal(await page.locator("#notebook-channel-section").isVisible(), !fixture.home);
    assert.equal(await page.locator("#danger-zone").isVisible(), !fixture.home);
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
    assert.equal(await page.locator("body").getAttribute("data-editor-kind"), fixture.expectedKind);
    await assertEditorContract(page, fixture);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(blockedRequests, []);

    if (viewport.width < 600) {
      if (fixture.expectedKind !== "image" && await page.locator("#settings-title").isVisible()) {
        await page.locator("#settings-close").click();
      }
      if (fixture.expectedKind !== "image") {
        assert.equal(await page.locator('.formatbar button[data-format="bold"]').isVisible(), true);
      }
      const before = savedRequests.length;
      const publish = page.locator(fixture.expectedKind === "image" ? "#mobile-publish" : "#save");
      await publish.waitFor({ state: "visible" });
      await Promise.all([
        page.waitForURL(fixture.home ? /\/admin\/es\/$/ : /\/admin\/es\/(fotografia|posts)\/$/, { timeout: 10000 }),
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

async function runDraftRestoreCase(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on("dialog", (dialog) => dialog.accept().catch(() => {}));

  try {
    const query = new URLSearchParams({
      mode: "edit",
      path: "content_es/posts/2026/julio/nota-de-prueba.md",
      kind: "post",
      theme: "dark",
    });
    await page.goto(`${origin}/editor?${query}`, { waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    assert.equal(await page.locator("#save .save-label-desktop").textContent(), "Guardar");

    await page.locator("#body").fill("Contenido determinista para el arnés.\n\nTexto añadido para el autoguardado.");
    await page.waitForFunction(() => Boolean(localStorage.getItem("authorWritingDraftV1")));

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    await page.locator("#draft-restore").waitFor({ state: "visible" });
    await page.locator("#draft-restore-accept").click();
    assert.match(await page.locator("#body").inputValue(), /Texto añadido para el autoguardado/);
    assert.equal(await page.locator("#saved-pill").textContent(), "Sin guardar");

    await page.locator("#body").fill("Contenido determinista para el arnés.\n\nTexto descartable.");
    await page.waitForFunction(() => String(JSON.parse(localStorage.getItem("authorWritingDraftV1") || "{}").body || "").includes("descartable"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    await page.locator("#draft-restore").waitFor({ state: "visible" });
    await page.locator("#draft-restore-discard").click();
    await page.locator("#draft-restore").waitFor({ state: "hidden" });
    assert.equal(await page.locator("#body").inputValue(), "Contenido determinista para el arnés.");
  } finally {
    await context.close();
  }
}

async function coordinateClick(page, selector) {
  const box = await page.locator(selector).boundingBox();
  assert.ok(box, `${selector} debe tener dimensiones visibles`);
  const point = {
    x: box.x + (box.width / 2),
    y: box.y + (box.height / 2),
  };
  const hitTarget = await page.evaluate(({ x, y }) => {
    const target = document.elementFromPoint(x, y);
    return target?.id || target?.closest("[id]")?.id || "";
  }, point);
  await page.mouse.click(point.x, point.y);
  return hitTarget;
}

async function runGrayscalePropertiesCase(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

  try {
    const query = new URLSearchParams({
      mode: "edit",
      path: "content_es/posts/2026/julio/nota-de-prueba.md",
      kind: "post",
      theme: "dark",
      grayscale: "true",
    });
    await page.goto(`${origin}/editor?${query}`, { waitUntil: "domcontentloaded" });
    await waitForEditor(page);

    await page.locator("#top-settings-button").click();
    await page.locator("#settings").waitFor({ state: "visible" });

    assert.equal(await coordinateClick(page, "#tags"), "tags");
    await page.keyboard.type(", interaction");
    assert.match(await page.locator("#tags").inputValue(), /interaction/);
    assert.equal(await page.locator("#settings").isVisible(), true);

    const previousSize = await page.locator("#editor-font-size").inputValue();
    assert.equal(await coordinateClick(page, "#editor-font-size"), "editor-font-size");
    await page.locator("#editor-font-size").selectOption(previousSize === "small" ? "medium" : "small");
    assert.notEqual(await page.locator("#editor-font-size").inputValue(), previousSize);
    assert.equal(await page.locator("#settings").isVisible(), true);

    const previousVisibility = await page.locator("#hidden").isChecked();
    assert.equal(await coordinateClick(page, "#hidden"), "hidden");
    assert.equal(await page.locator("#hidden").isChecked(), !previousVisibility);
    assert.equal(await page.locator("#settings").isVisible(), true);

    assert.equal(await coordinateClick(page, "#settings-close"), "settings-close");
    await page.locator("#settings").waitFor({ state: "hidden" });

    await page.locator("#top-settings-button").click();
    assert.equal(await page.evaluate(() => document.elementFromPoint(10, 90)?.id), "settings-backdrop");
    await page.mouse.click(10, 90);
    await page.locator("#settings").waitFor({ state: "hidden" });

    await page.locator("#top-settings-button").click();
    await page.locator("#arena-inline-details").scrollIntoViewIfNeeded();
    assert.equal(await coordinateClick(page, "#arena-inline-details"), "arena-inline-details");
    await page.locator("#settings").waitFor({ state: "hidden" });
    await page.locator("#arena-details").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.elementFromPoint(80, 30)?.id), "arena-details-backdrop");
    assert.equal(await coordinateClick(page, "#arena-details-close"), "arena-details-close");
    await page.locator("#arena-details").waitFor({ state: "hidden" });

    await page.locator("#top-settings-button").click();
    await page.locator("#arena-inline-details").scrollIntoViewIfNeeded();
    await coordinateClick(page, "#arena-inline-details");
    assert.equal(await page.evaluate(() => document.elementFromPoint(80, 30)?.id), "arena-details-backdrop");
    await page.mouse.click(80, 30);
    await page.locator("#arena-details").waitFor({ state: "hidden" });
  } catch (error) {
    const screenshotPath = "/tmp/posts-editor-harness-grayscale-properties.png";
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    throw new Error(`${error.message}\nCaptura: ${screenshotPath}`, { cause: error });
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
      path: "content_es/_index.md",
      requestedKind: "notebook",
      expectedKind: "notebook",
      home: true,
    },
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
    await runDraftRestoreCase(browser, origin);
    await runGrayscalePropertiesCase(browser, origin);
    console.log(`Editor harness: ${fixtures.length * viewports.length} escenarios correctos.`);
    console.log("Autoguardado local: restauración y descarte comprobados.");
    console.log("Propiedades móviles en escala de grises: controles y cierres comprobados.");
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
