#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { imageEditorHtml } from "../functions/_lib/image-editor-template.js";
import { editorCoreClientScript } from "../functions/_lib/editor-core-client.js";
import { notebookEditorHtml } from "../functions/_lib/notebook-editor-template.js";
import { postEditorHtml } from "../functions/_lib/post-editor-template.js";
import { resolveEditorPath } from "../functions/_lib/editor-routing.js";

const soundClientScript = await readFile(new URL("../edge/client/sound.js", import.meta.url), "utf8");

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

const essayCaretFixture = `## ¿Por qué matemáticas?

Decidí estudiar matemáticas cuando tenía unos 17 años. A decir verdad, no era muy consciente de qué implicaciones tendría esa decisión en mi vida o qué cosas aprendería por el camino. En aquel momento hacía mi servicio social en una biblioteca y, como toda persona que aprecie leer, decidí aprovechar todo ese tiempo para leer tanto como pudiera. Leí un montón de filosofía, de teología (en esos días era muy religioso) y, sí, también de matemáticas. En concreto leí un libro que me marcó: El último teorema de Fermat de Simon Lehna Singh[^note-1].

En este libro, el autor nos cuenta cómo la humanidad lidió con un problema aparentemente simple [^note-2] durante más de 300 años (tu criterio decidir si eso es mucho tiempo); años en los que las mejores mentes intentaron resolverlo, fallando en el intento. Aunque el libro termina inevitablemente con la solución del problema a manos de Shimura, Taniyama y Wiles, es fácil citar otros libros contando la historia de problemas que no están solucionados [^note-3]. Durante mis tardes en esa biblioteca, leyendo de esas personas que no resolvieron el problema que tenían delante, decidí que yo también quería ser parte de eso alguna vez en mi vida. ¿Por qué un adolescente de 17 años se vería atraído por la historia de cómo un montón de personas no lograron resolver un problema? Respuesta : por amor.

## Por descubrir

> [...] «todas y cada una de las fórmulas que creamos son una fórmula de amor». Las matemáticas son fuente de un conocimiento profundo y atemporal, que llega al corazón de las cosas y nos une a través de culturas, continentes y siglos. Mi sueño es que todos seamos capaces de ver, apreciar y maravillarnos ante la magica belleza y la exquisita armonía de estas ideas, fórmulas y , porque ello proporcionara mucho más significado a nuestro amor por este mundo y por el prójimo.
> Edward Frenkel

[^note-1]: Puede leerse en este [enlace](https://archive.org/details/elultimoteoremad0000sing).

[^note-2]: Un problema cuya solución fue dejada incompleta al margen de la hoja como esta nota.

[^note-3]: La música de los números primos de Marcus du Satoy así como Amor y Matemáticas de Edward Frenkel son ejemplos hermosos de esto.`;

pages["content_en/posts/2026/agosto/el_matematico_en_el_loop.md"] = {
  path: "content_en/posts/2026/agosto/el_matematico_en_el_loop.md",
  url: "/posts/2026/agosto/el_matematico_en_el_loop/",
  frontMatter: {
    title: "El matemático en el loop",
    date: "2026-08-29",
    tags: ["essays", "mathematics", "artifical-intelligence"],
    summary: "El precio de la eficiencia en la era de la AI",
    draft: true,
    hidden: true,
  },
  body: essayCaretFixture,
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

    if (req.method === "GET" && url.pathname === "/js/sound.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(soundClientScript);
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

async function textareaCaretBounds(page, selector) {
  return page.locator(selector).evaluate((textarea) => {
    const styles = window.getComputedStyle(textarea);
    const mirror = document.createElement("div");
    const marker = document.createElement("span");
    const position = textarea.selectionEnd;
    mirror.style.position = "fixed";
    mirror.style.top = "0";
    mirror.style.left = "-100000px";
    mirror.style.height = "auto";
    mirror.style.minHeight = "0";
    mirror.style.maxHeight = "none";
    mirror.style.overflow = "hidden";
    mirror.style.visibility = "hidden";
    [
      "boxSizing", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
      "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "fontFamily", "fontSize",
      "fontStyle", "fontVariant", "fontWeight", "fontStretch", "lineHeight", "letterSpacing",
      "wordSpacing", "tabSize", "textAlign", "textIndent", "textTransform", "direction",
      "whiteSpace", "wordBreak", "overflowWrap",
    ].forEach((property) => {
      mirror.style[property] = styles[property];
    });
    mirror.style.width = `${textarea.getBoundingClientRect().width}px`;
    mirror.append(document.createTextNode(textarea.value.slice(0, position)), marker);
    marker.textContent = textarea.value.slice(position, position + 1) || ".";
    document.body.appendChild(mirror);

    const textareaRect = textarea.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const lineHeight = Number.parseFloat(styles.lineHeight) || markerRect.height || Number.parseFloat(styles.fontSize) * 1.2;
    const top = window.scrollY + textareaRect.top + (markerRect.top - mirrorRect.top) - textarea.scrollTop;
    mirror.remove();
    return { top, bottom: top + lineHeight };
  });
}

async function writingViewport(page, scrollOwnerSelector = "") {
  return page.evaluate((ownerSelector) => {
    const visualViewport = window.visualViewport;
    let top = visualViewport ? visualViewport.offsetTop : 0;
    const height = visualViewport ? visualViewport.height : window.innerHeight;
    let bottom = top + height;
    const topbar = document.querySelector(".topbar");
    const topbarRect = topbar?.getBoundingClientRect();
    const topbarPosition = topbar ? window.getComputedStyle(topbar).position : "";
    if (topbarRect && ["fixed", "sticky"].includes(topbarPosition) && topbarRect.top <= top + 1) {
      top = Math.min(bottom, Math.max(top, topbarRect.bottom));
    }
    const formatbar = document.querySelector(".formatbar");
    const formatbarRect = formatbar.getBoundingClientRect();
    if (window.getComputedStyle(formatbar).position === "fixed" && formatbarRect.bottom >= bottom - 1) {
      bottom = Math.max(top, Math.min(bottom, formatbarRect.top));
    }
    if (ownerSelector) {
      const owner = document.querySelector(ownerSelector);
      const ownerRect = owner.getBoundingClientRect();
      const ownerTop = ownerRect.top + owner.clientTop;
      const ownerBottom = ownerTop + owner.clientHeight;
      top = Math.max(top, ownerTop);
      bottom = Math.max(top, Math.min(bottom, ownerBottom));
    }
    return { top, bottom, center: (top + bottom) / 2 };
  }, scrollOwnerSelector);
}

async function placeCaret(page, selector, position, clientY, scrollOwnerSelector = "") {
  await page.locator(selector).evaluate((textarea, caretPosition) => {
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(caretPosition, caretPosition);
  }, position);
  const caret = await textareaCaretBounds(page, selector);
  await page.evaluate(({ caretCenter, targetClientY, ownerSelector }) => {
    const caretClientY = caretCenter - window.scrollY;
    if (ownerSelector) {
      const owner = document.querySelector(ownerSelector);
      owner.scrollTop += caretClientY - targetClientY;
      return;
    }
    window.scrollTo(0, caretCenter - targetClientY);
  }, {
    caretCenter: (caret.top + caret.bottom) / 2,
    targetClientY: clientY,
    ownerSelector: scrollOwnerSelector,
  });
}

async function runCaretViewportCase(browser, origin, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const query = new URLSearchParams({
    mode: "edit",
    path: "content_es/posts/2026/julio/nota-de-prueba.md",
    kind: "post",
    theme: "dark",
  });

  try {
    await page.goto(`${origin}/editor?${query}`, { waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    if (await page.locator("#settings").isVisible()) await page.locator("#settings-close").click();

    const lines = Array.from({ length: 80 }, (_, index) => (
      `${String(index + 1).padStart(2, "0")} ${"A wrapped editor line with enough words to exercise the responsive textarea width. ".repeat(2)}`
    ));
    const bodyValue = lines.join("\n");
    await page.locator("#body").fill(bodyValue);

    const viewportBounds = await writingViewport(page);
    const visiblePosition = bodyValue.indexOf("20 ") + 3;
    await placeCaret(page, "#body", visiblePosition, viewportBounds.center);
    const visibleScrollY = await page.evaluate(() => window.scrollY);
    await page.keyboard.type("x");
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - visibleScrollY) <= 1, "typing at a visible caret must not scroll");
    assert.equal(await page.locator("#body").evaluate((textarea) => textarea.selectionStart), visiblePosition + 1);

    const manualScrollY = Math.max(0, visibleScrollY - 120);
    await page.evaluate((top) => window.scrollTo(0, top), manualScrollY);
    await page.waitForTimeout(50);
    assert.ok(Math.abs((await page.evaluate(() => window.scrollY)) - manualScrollY) <= 1, "manual scrolling after typing must remain untouched");

    const offscreenPosition = bodyValue.indexOf("60 ") + 3;
    await placeCaret(page, "#body", offscreenPosition, viewportBounds.center);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.type("y");
    const centeredCaret = await textareaCaretBounds(page, "#body");
    const centeredViewport = await writingViewport(page);
    const centeredClientY = ((centeredCaret.top + centeredCaret.bottom) / 2) - await page.evaluate(() => window.scrollY);
    assert.ok(Math.abs(centeredClientY - centeredViewport.center) <= 2, "an offscreen body caret must move to the viewport center");
    assert.equal(await page.locator("#body").evaluate((textarea) => textarea.selectionStart), offscreenPosition + 1);

    await placeCaret(page, "#body", 0, centeredViewport.center);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.keyboard.type("t");
    assert.ok((await page.evaluate(() => window.scrollY)) <= 1, "centering must clamp at the top of the document");

    const bodyEnd = (await page.locator("#body").inputValue()).length;
    await placeCaret(page, "#body", bodyEnd, centeredViewport.center);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.type("b");
    const bottomScroll = await page.evaluate(() => ({
      actual: window.scrollY,
      maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    }));
    assert.ok(Math.abs(bottomScroll.actual - bottomScroll.maximum) <= 1, "centering must clamp at the bottom of the document");

    await page.locator(viewport.width < 600 ? "#mobile-view-markdown" : "#view-markdown").click();
    const markdown = page.locator("#markdown-canvas");
    await markdown.waitFor({ state: "visible" });
    const markdownValue = await markdown.inputValue();
    const markdownPosition = Math.floor(markdownValue.length * 0.75);
    await placeCaret(page, "#markdown-canvas", markdownPosition, centeredViewport.center);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.keyboard.type("z");
    const markdownCaret = await textareaCaretBounds(page, "#markdown-canvas");
    const markdownViewport = await writingViewport(page);
    const markdownClientY = ((markdownCaret.top + markdownCaret.bottom) / 2) - await page.evaluate(() => window.scrollY);
    assert.ok(Math.abs(markdownClientY - markdownViewport.center) <= 2, "an offscreen Markdown caret must move to the viewport center");
  } catch (error) {
    const screenshotPath = `/tmp/posts-editor-caret-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    throw new Error(`${error.message}\nCaptura: ${screenshotPath}`, { cause: error });
  } finally {
    await context.close();
  }
}

async function runExactEssayCaretCase(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1710, height: 1067 } });
  const page = await context.newPage();
  const query = new URLSearchParams({
    mode: "edit",
    path: "content_en/posts/2026/agosto/el_matematico_en_el_loop.md",
    kind: "post",
    theme: "dark",
  });

  try {
    await page.goto(`${origin}/editor?${query}`, { waitUntil: "domcontentloaded" });
    await waitForEditor(page);
    if (await page.locator("#settings").isVisible()) await page.locator("#settings-close").click();
    assert.equal(await page.locator("#body").inputValue(), essayCaretFixture);
    await page.locator("#view-markdown").click();

    const markdown = page.locator("#markdown-canvas");
    await markdown.waitFor({ state: "visible" });
    await page.evaluate(() => {
      document.body.style.height = "calc(100dvh + 15rem)";
      const writer = document.querySelector(".writer");
      writer.style.height = "45rem";
      writer.style.overflowY = "auto";
    });
    await page.evaluate(() => window.scrollTo(0, 100));
    await page.waitForTimeout(50);

    const scrollMetrics = await page.locator(".writer").evaluate((writer) => ({
      clientHeight: writer.clientHeight,
      scrollHeight: writer.scrollHeight,
    }));
    assert.ok(scrollMetrics.scrollHeight > scrollMetrics.clientHeight, "the exact essay regression must exercise a scrolling .writer");

    const markdownValue = await markdown.inputValue();
    const phrase = "ideas, fórmulas y ";
    const position = markdownValue.indexOf(phrase) + phrase.length;
    const viewport = await writingViewport(page, ".writer");
    await placeCaret(page, "#markdown-canvas", position, viewport.bottom - 60, ".writer");
    const initialScroll = await page.evaluate(() => ({
      window: window.scrollY,
      writer: document.querySelector(".writer").scrollTop,
    }));

    for (const character of "ecuaciones") {
      await page.keyboard.type(character);
      const state = await page.evaluate(() => ({
        window: window.scrollY,
        writer: document.querySelector(".writer").scrollTop,
      }));
      const caret = await textareaCaretBounds(page, "#markdown-canvas");
      assert.equal(state.window, initialScroll.window, `typing ${character} must not move the outer window`);
      assert.equal(state.writer, initialScroll.writer, `typing ${character} at the visible essay caret must not move .writer`);
      assert.ok(caret.bottom - state.window <= viewport.bottom, `caret must remain visible after typing ${character}`);
    }
    assert.equal(await markdown.evaluate((textarea) => textarea.selectionStart), position + "ecuaciones".length);

    await page.locator(".writer").evaluate((writer) => {
      writer.scrollTop = 0;
    });
    const boundaryScroll = await page.evaluate(() => ({
      window: window.scrollY,
      writer: document.querySelector(".writer").scrollTop,
    }));
    await page.keyboard.press("Enter");
    const centeredCaret = await textareaCaretBounds(page, "#markdown-canvas");
    const centeredViewport = await writingViewport(page, ".writer");
    const centeredScroll = await page.evaluate(() => ({
      window: window.scrollY,
      writer: document.querySelector(".writer").scrollTop,
      maximum: Math.max(0, document.querySelector(".writer").scrollHeight - document.querySelector(".writer").clientHeight),
    }));
    const caretClientCenter = ((centeredCaret.top + centeredCaret.bottom) / 2) - centeredScroll.window;
    assert.equal(centeredScroll.window, boundaryScroll.window, "centering inside .writer must not move the outer window");
    assert.notEqual(centeredScroll.writer, boundaryScroll.writer, "an essay caret outside .writer must move that container");
    if (centeredScroll.writer <= 1) {
      assert.ok(caretClientCenter <= centeredViewport.center + 2, "a top-clamped caret may remain only above the viewport center");
    } else if (Math.abs(centeredScroll.writer - centeredScroll.maximum) <= 1) {
      assert.ok(caretClientCenter >= centeredViewport.center - 2, "a bottom-clamped caret may remain only below the viewport center");
    } else {
      assert.ok(Math.abs(caretClientCenter - centeredViewport.center) <= 2, "the offscreen essay caret must land at the .writer viewport center");
    }
    assert.equal(await markdown.evaluate((textarea) => textarea.selectionStart), position + "ecuaciones".length + 1);
  } catch (error) {
    const screenshotPath = "/tmp/posts-editor-caret-exact-essay.png";
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => {});
    throw new Error(`${error.message}\nCaptura: ${screenshotPath}`, { cause: error });
  } finally {
    await context.close();
  }
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
    await runCaretViewportCase(browser, origin, { width: 1280, height: 800 });
    await runCaretViewportCase(browser, origin, { width: 390, height: 844 });
    await runExactEssayCaretCase(browser, origin);
    console.log(`Editor harness: ${fixtures.length * viewports.length} escenarios correctos.`);
    console.log("Autoguardado local: restauración y descarte comprobados.");
    console.log("Propiedades móviles en escala de grises: controles y cierres comprobados.");
    console.log("Cursor del editor: desplazamiento condicionado y centrado comprobados.");
    console.log("Ensayo exacto: ecuaciones conserva el viewport y el salto real centra el cursor.");
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
