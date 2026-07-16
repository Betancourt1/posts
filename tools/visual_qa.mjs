#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_VIEWPORT = { label: "mobile", width: 390, height: 844 };
const DEFAULT_THRESHOLD = 9;
const DEFAULT_WAIT_MS = 500;
const VALID_LOAD_STATES = new Set(["load", "domcontentloaded", "networkidle"]);

const repoRoot = findRepoRoot(process.cwd());
process.chdir(repoRoot);

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});

async function main() {
  const { options } = parseArgs(process.argv.slice(2));

  if (options.help || options.h) {
    printHelp();
    return;
  }

  const feature = stringOption(options.feature, "visual-qa");
  const threshold = numberOption(options.threshold, DEFAULT_THRESHOLD);
  const waitMs = numberOption(options.wait, DEFAULT_WAIT_MS);
  const fullPage = Boolean(options["full-page"]);
  const noCapture = Boolean(options["no-capture"]);
  const assertResponsive = Boolean(options["assert-responsive"]);
  const minimumHitTarget = numberOption(options["minimum-hit-target"], 44);
  const loadState = stringOption(options["load-state"], "networkidle");

  if (!VALID_LOAD_STATES.has(loadState)) {
    throw new Error(`--load-state debe ser: ${Array.from(VALID_LOAD_STATES).join(", ")}`);
  }

  const targets = values(options.target).map(parseTargetSpec);
  const references = values(options.reference).concat(values(options.mockup));
  const criteria = values(options.criteria);
  const viewports = values(options.viewport).length
    ? values(options.viewport).map(parseViewportSpec)
    : [DEFAULT_VIEWPORT];
  const clickMap = mapActions(values(options.click), "click");
  const waitMap = mapActions(values(options["wait-for"]), "wait-for");
  const typeMap = mapActions(values(options.type), "type");

  if (!targets.length && !noCapture) {
    throw new Error("Agrega al menos un --target nombre=url o usa --no-capture.");
  }

  const outputDir = path.resolve(
    repoRoot,
    stringOption(options.out, path.join("tmp", "visual-qa", `${timestampSlug()}-${slugify(feature)}`)),
  );
  const screenshotsDir = path.join(outputDir, "screenshots");
  mkdirSync(screenshotsDir, { recursive: true });

  const manifest = {
    feature,
    threshold,
    createdAt: new Date().toISOString(),
    repo: {
      root: repoRoot,
      commit: gitOutput(["rev-parse", "--short", "HEAD"]),
      branch: gitOutput(["branch", "--show-current"]),
      status: gitOutput(["status", "--short"]),
    },
    viewports,
    targets,
    references: references.map((item) => path.resolve(repoRoot, item)),
    criteria,
    captures: [],
    notes: [],
  };

  if (targets.length && !noCapture) {
    manifest.captures = await captureTargets({
      targets,
      viewports,
      screenshotsDir,
      clickMap,
      waitMap,
      typeMap,
      loadState,
      waitMs,
      fullPage,
      minimumHitTarget,
    });
  } else {
    manifest.notes.push("Captura automatica omitida con --no-capture.");
  }

  writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(outputDir, "subagent-prompt.md"), buildSubagentPrompt(manifest));
  writeFileSync(path.join(outputDir, "README.md"), buildReadme(manifest));

  if (assertResponsive) {
    const failures = responsiveFailures(manifest.captures);
    if (failures.length) {
      throw new Error(`QA responsive fallido:\n- ${failures.join("\n- ")}`);
    }
  }

  const summary = {
    outputDir,
    screenshots: manifest.captures.map((capture) => capture.path),
    prompt: path.join(outputDir, "subagent-prompt.md"),
    manifest: path.join(outputDir, "manifest.json"),
  };

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  console.log(`QA visual listo: ${path.relative(repoRoot, outputDir)}`);
  console.log(`Prompt de subagente: ${path.relative(repoRoot, summary.prompt)}`);
  if (summary.screenshots.length) {
    console.log(`Capturas: ${summary.screenshots.length}`);
  }
}

async function captureTargets({
  targets,
  viewports,
  screenshotsDir,
  clickMap,
  waitMap,
  typeMap,
  loadState,
  waitMs,
  fullPage,
  minimumHitTarget,
}) {
  const { chromium } = await loadPlaywright();
  const browser = await launchBrowser(chromium);
  const captures = [];

  try {
    for (const viewport of viewports) {
      for (const target of targets) {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.width <= 480,
          hasTouch: viewport.width <= 480,
        });
        const errors = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
        });
        page.on("console", (message) => {
          if (message.type() === "error") {
            errors.push(message.text());
          }
        });

        await page.goto(target.url, { waitUntil: loadState, timeout: 45000 });
        await applyTargetActions(page, target.label, waitMap, typeMap, clickMap, waitMs);
        await page.waitForTimeout(waitMs);
        const responsiveAudit = await auditResponsiveLayout(page, viewport, minimumHitTarget);

        const fileName = `${slugify(target.label)}-${slugify(viewport.label)}.png`;
        const screenshotPath = path.join(screenshotsDir, fileName);
        await page.screenshot({ path: screenshotPath, fullPage });

        captures.push({
          target: target.label,
          url: target.url,
          viewport,
          path: screenshotPath,
          errors,
          responsiveAudit,
        });

        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  return captures;
}

async function auditResponsiveLayout(page, viewport, minimumHitTarget) {
  return page.evaluate(({ width, minimumSize }) => {
    const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const undersizedControls = width > 480 ? [] : Array.from(document.querySelectorAll(
      'button, input[type="button"], input[type="submit"], input[type="reset"], [role="button"]',
    )).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const isVisible = !element.closest('[inert], [aria-hidden="true"]')
        && (typeof element.checkVisibility !== "function" || element.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }))
        && style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;

      if (!isVisible || (rect.width >= minimumSize && rect.height >= minimumSize)) {
        return [];
      }

      return [{
        selector: element.id ? `#${element.id}` : element.className || element.tagName.toLowerCase(),
        label: element.getAttribute("aria-label") || element.textContent.trim().slice(0, 48),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      }];
    });

    return {
      viewportWidth: width,
      documentWidth,
      horizontalOverflow: Math.max(0, documentWidth - width),
      minimumHitTarget: minimumSize,
      undersizedControls,
    };
  }, { width: viewport.width, minimumSize: minimumHitTarget });
}

function responsiveFailures(captures) {
  return captures.flatMap((capture) => {
    const audit = capture.responsiveAudit;
    const context = `${capture.target} (${capture.viewport.label})`;
    const failures = [];

    if (audit.horizontalOverflow > 1) {
      failures.push(`${context}: desbordamiento horizontal de ${audit.horizontalOverflow}px`);
    }
    for (const control of audit.undersizedControls) {
      failures.push(
        `${context}: ${control.selector} mide ${control.width}x${control.height}px`,
      );
    }

    return failures;
  });
}

async function applyTargetActions(page, targetLabel, waitMap, typeMap, clickMap, waitMs) {
  for (const selector of waitMap.get(targetLabel) || []) {
    await page.locator(selector).waitFor({ timeout: 10000 });
  }

  for (const action of typeMap.get(targetLabel) || []) {
    const separator = action.indexOf("::");
    if (separator === -1) {
      throw new Error(`--type ${targetLabel}=... debe usar selector::texto`);
    }
    const selector = action.slice(0, separator);
    const text = action.slice(separator + 2);
    await page.locator(selector).fill(text, { timeout: 10000 });
    await page.waitForTimeout(waitMs);
  }

  for (const selector of clickMap.get(targetLabel) || []) {
    await page.locator(selector).click({ timeout: 10000 });
    await page.waitForTimeout(waitMs);
  }
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch (error) {
    throw new Error(
      "No encontre Playwright. Instala Playwright o corre la CLI con --no-capture para generar solo manifiesto y prompt.",
    );
  }
}

async function launchBrowser(chromium) {
  const launchOptions = { headless: true };
  if (process.env.VISUAL_QA_CHROME_CHANNEL) {
    launchOptions.channel = process.env.VISUAL_QA_CHROME_CHANNEL;
  }

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    throw new Error(
      [
        "No pude abrir Chromium para capturar screenshots.",
        "En Codex puede requerir ejecutar el comando con permisos elevados; en una terminal local normal suele funcionar directo.",
        `Detalle: ${error.message || error}`,
      ].join("\n"),
    );
  }
}

function buildSubagentPrompt(manifest) {
  const lines = [
    `Evalua QA visual para: ${manifest.feature}`,
    "",
    `Califica del 1 al 10 y da luz verde solo si el promedio general es ${manifest.threshold}+.`,
    "Si no alcanza el umbral, lista los cambios minimos para llegar a luz verde.",
    "",
    "Criterios:",
    ...(manifest.criteria.length ? manifest.criteria.map((item) => `- ${item}`) : ["- Similitud visual contra referencias y mockups.", "- Layout sin traslapes en los viewports capturados.", "- Jerarquia visual, estados y controles esperados."]),
    "",
    "Referencias/mockups:",
    ...(manifest.references.length ? manifest.references.map((item) => `- ${item}`) : ["- Sin referencias declaradas; usa los criterios y las capturas."]),
    "",
    "Capturas generadas:",
    ...(manifest.captures.length ? manifest.captures.map((capture) => `- ${capture.target} (${capture.viewport.label}, ${capture.viewport.width}x${capture.viewport.height}): ${capture.path}`) : ["- No se generaron capturas automaticas."]),
    "",
    "Formato de respuesta requerido:",
    "- Editor/pantalla por pantalla: N/10",
    "- Promedio general: N/10",
    "- Luz verde: Si/No",
    "- Cambios minimos si falta llegar al umbral",
  ];

  return `${lines.join("\n")}\n`;
}

function buildReadme(manifest) {
  return [
    `# QA visual: ${manifest.feature}`,
    "",
    `Umbral de luz verde: ${manifest.threshold}+`,
    "",
    "Archivos:",
    "- `manifest.json`: rutas, viewports y capturas.",
    "- `subagent-prompt.md`: prompt listo para enviar a un subagente.",
    "- `screenshots/`: capturas generadas por la CLI.",
    "",
    "Siguiente paso:",
    "1. Envia `subagent-prompt.md` y las imagenes listadas a un subagente.",
    "2. Si el promedio es menor al umbral, implementa los cambios minimos y vuelve a correr esta CLI.",
    "",
  ].join("\n");
}

function printHelp() {
  console.log(`Uso:
  npm run visual:qa -- --feature "Nombre" --target pantalla=http://127.0.0.1:4321/es/

Opciones:
  --feature texto                 Nombre del feature evaluado
  --target nombre=url             Ruta a capturar; se puede repetir
  --viewport nombre=390x844       Viewport; default mobile=390x844
  --reference archivo             Mockup o referencia local; se puede repetir
  --criteria texto                Criterio de evaluacion; se puede repetir
  --click nombre=selector         Click antes de capturar ese target
  --wait-for nombre=selector      Espera a que exista un selector
  --type nombre=selector::texto   Llena un input antes de capturar
  --threshold numero              Umbral de luz verde; default 9
  --out ruta                      Carpeta de salida; default tmp/visual-qa/<fecha>-<feature>
  --wait ms                       Pausa tras acciones; default 500
  --full-page                     Captura pagina completa
  --assert-responsive             Falla si hay overflow horizontal o controles móviles menores a 44 px
  --minimum-hit-target numero     Tamaño táctil mínimo; default 44
  --no-capture                    Solo genera manifest y prompt
  --json                          Imprime resumen JSON

Ejemplo:
  npm run visual:qa -- \\
    --feature "mobile author editor" \\
    --reference /tmp/mockup.png \\
    --target editor=http://127.0.0.1:3001/editor?theme=dark \\
    --target editor_props=http://127.0.0.1:3001/editor?theme=dark \\
    --click "editor_props=#top-settings-button"`);
}

function parseArgs(argv) {
  const options = {};

  function addOption(key, value) {
    if (options[key] === undefined) {
      options[key] = value;
      return;
    }
    if (!Array.isArray(options[key])) {
      options[key] = [options[key]];
    }
    options[key].push(value);
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (!value.startsWith("--")) {
      continue;
    }

    const raw = value.slice(2);
    const equalsIndex = raw.indexOf("=");

    if (equalsIndex !== -1) {
      addOption(raw.slice(0, equalsIndex), raw.slice(equalsIndex + 1));
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      addOption(raw, true);
      continue;
    }

    addOption(raw, next);
    index += 1;
  }

  return { options };
}

function parseTargetSpec(spec) {
  const { key, value } = splitKeyValue(spec, "target");
  return {
    label: key || `target-${Date.now()}`,
    url: normalizeUrl(value),
  };
}

function parseViewportSpec(spec) {
  const { key, value } = splitKeyValue(spec, "viewport");
  const size = value || key;
  const match = String(size).match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error(`Viewport invalido: ${spec}. Usa nombre=390x844 o 390x844.`);
  }
  return {
    label: value ? key : "viewport",
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function splitKeyValue(spec, optionName) {
  const text = String(spec || "");
  const index = text.indexOf("=");
  if (index === -1) {
    if (optionName === "viewport") return { key: text, value: "" };
    throw new Error(`--${optionName} debe usar nombre=valor`);
  }
  const key = text.slice(0, index).trim();
  const value = text.slice(index + 1).trim();
  if (!key || !value) {
    throw new Error(`--${optionName} debe usar nombre=valor`);
  }
  return { key, value };
}

function mapActions(actionSpecs, optionName) {
  const map = new Map();
  for (const spec of actionSpecs) {
    const { key, value } = splitKeyValue(spec, optionName);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(value);
  }
  return map;
}

function normalizeUrl(value) {
  const text = String(value || "");
  if (/^(https?:|file:|data:)/.test(text)) {
    return text;
  }
  return pathToFileURL(path.resolve(repoRoot, text)).href;
}

function values(value) {
  if (value === undefined || value === false) return [];
  return Array.isArray(value) ? value : [value];
}

function stringOption(value, fallback) {
  if (value === undefined || value === true || value === false) return fallback;
  if (Array.isArray(value)) return String(value[value.length - 1]);
  return String(value);
}

function numberOption(value, fallback) {
  const raw = stringOption(value, String(fallback));
  const number = Number(raw);
  if (!Number.isFinite(number)) {
    throw new Error(`Numero invalido: ${raw}`);
  }
  return number;
}

function slugify(value) {
  return String(value || "visual-qa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "visual-qa";
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace(/T/, "T").slice(0, 19);
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) return "";
  return (result.stdout || "").trim();
}

function findRepoRoot(start) {
  let current = path.resolve(start);

  while (current !== path.dirname(current)) {
    if (
      existsSync(path.join(current, "package.json")) &&
      existsSync(path.join(current, "edge", "package.json"))
    ) {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error("Ejecuta la CLI dentro del repo del sitio.");
}
