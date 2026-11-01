import { projectStatuses, projectTypes } from "./project-links.js";

// Section headings for a new case study. The page title is already the h1, so these start at h2.
export const projectCaseSkeleton = {
  en: "## Problem\n\n## What I built\n\n## Outcome\n\n## How it works\n",
  es: "## Problema\n\n## Qué construí\n\n## Resultado\n\n## Cómo funciona\n",
};

export const projectEditorMarkup = `
<section id="project-editor" aria-label="Proyecto" hidden>
  <fieldset class="project-group">
    <legend>Presentación</legend>
    <div class="project-grid">
      <label>Estado del proyecto
        <select id="project-status">
          <option value="">Sin estado</option>
          ${Object.entries(projectStatuses).map(([status, names]) => `<option value="${status}">${names[1]}</option>`).join("")}
        </select>
      </label>
      <label>Rol <input id="project-role" placeholder="Diseño y desarrollo" autocomplete="off"></label>
      <label>Periodo <input id="project-period" placeholder="2025–2026" autocomplete="off"></label>
      <label>Organización <input id="project-org" placeholder="Empresa o contexto" autocomplete="off"></label>
      <label>Orden <input id="project-order" type="number" step="1" placeholder="1" inputmode="numeric"></label>
      <label class="project-check"><input type="checkbox" id="project-featured"> Destacar en el catálogo</label>
    </div>
    <label>Stack <input id="project-stack" placeholder="Python, SQL, Dagster" autocomplete="off"></label>
    <small>Separa las tecnologías con comas.</small>
    <div class="project-results">
      <span id="project-results-label">Resultados (hasta 4)</span>
      <div id="project-highlights" role="group" aria-labelledby="project-results-label"></div>
      <button type="button" id="project-highlight-add">Añadir resultado</button>
    </div>
  </fieldset>
  <fieldset class="project-group">
    <legend>Recursos</legend>
    <p>El primer enlace aparece en el catálogo. Puedes guardar un proyecto sin enlaces.</p>
    <div id="project-rows"></div>
    <div class="project-tools">
      <button type="button" id="project-add">Añadir enlace</button>
      <button type="button" id="writing-load">Elegir del Blog</button>
      <select id="writing-select" aria-label="Publicación del Blog" hidden></select>
    </div>
    <small role="status" id="writing-status"></small>
  </fieldset>
  <fieldset class="project-group">
    <legend>Vista previa de la tarjeta</legend>
    <small id="project-preview-note"></small>
    <div id="project-preview" aria-hidden="true"></div>
  </fieldset>
  <button type="button" id="project-template" hidden>Insertar estructura del caso</button>
  <template id="project-row">
    <fieldset>
      <legend>Recurso</legend>
      <select aria-label="Tipo">${Object.entries(projectTypes).map(([type, names]) => `<option value="${type}">${names[1]}</option>`).join("")}</select>
      <input aria-label="Texto del enlace" placeholder="Texto del enlace" autocomplete="off">
      <input aria-label="Destino" placeholder="https://… o /ruta/" autocomplete="off">
      <div class="project-row-actions">
        <button type="button" data-move="up" aria-label="Subir recurso">↑</button>
        <button type="button" data-move="down" aria-label="Bajar recurso">↓</button>
        <button type="button" data-remove>Quitar</button>
      </div>
    </fieldset>
  </template>
  <template id="project-highlight-row">
    <div class="project-highlight">
      <input aria-label="Resultado" placeholder="Un resultado concreto" autocomplete="off">
      <button type="button" data-remove aria-label="Quitar resultado">Quitar</button>
    </div>
  </template>
</section>`;

export const projectEditorStyles = `
#project-editor { margin-block: 1.2rem 2rem; }
#project-editor [hidden] { display: none !important; }
#project-editor p, #project-editor small, #writing-status { color: var(--muted); }
#project-editor small { display: block; margin: .3rem 0; }
#project-editor .project-group { border: 1px solid var(--line); margin: 0 0 1rem; padding: .8rem; min-width: 0; }
#project-editor .project-group > legend { padding-inline: .4rem; font-size: 1rem; }
#project-editor label { display: block; font-size: .85rem; color: var(--muted); }
#project-editor label.project-check { display: flex; align-items: center; gap: .5rem; align-self: end; min-height: 2.6rem; color: var(--ink); }
#project-editor .project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); gap: .6rem 1rem; margin-bottom: .6rem; }
#project-editor :is(button, select, input:not([type="checkbox"])) { font: inherit; color: var(--ink); background: var(--panel); padding: .45rem; border: 1px solid var(--line); min-height: 2.4rem; }
#project-editor label :is(select, input:not([type="checkbox"])) { display: block; width: 100%; margin-top: .2rem; }
#project-editor fieldset fieldset { border: 1px solid var(--line); margin: .6rem 0; padding: .6rem; }
#project-editor fieldset fieldset input { display: block; width: 100%; margin: .35rem 0; }
#project-editor .project-results { margin-top: .8rem; font-size: .85rem; color: var(--muted); }
#project-editor .project-highlight { display: flex; gap: .5rem; margin: .35rem 0; }
#project-editor .project-highlight input { flex: 1; min-width: 0; }
#project-editor .project-row-actions, #project-editor .project-tools { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
#project-editor #project-template { margin-block: .2rem 1rem; }
#writing-select { max-width: 100%; }
#project-preview { margin-top: .4rem; }
#project-preview .pv-card { border-top: 1px solid var(--line); padding: .8rem 0 .2rem; color: var(--ink); }
#project-preview .pv-badge { display: inline-block; padding: .05rem .45rem; border: 1px solid var(--line); font-size: .7rem; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
#project-preview .pv-live { color: var(--accent); border-color: var(--accent); }
#project-preview .pv-private { border-style: dashed; }
#project-preview .pv-title { margin: .35rem 0 .1rem; font-size: 1.25rem; line-height: 1.2; }
#project-preview .is-compact .pv-title { font-size: 1rem; }
#project-preview .pv-meta { font-size: .8rem; color: var(--muted); }
#project-preview .pv-blurb { margin: .35rem 0; color: var(--muted); }
#project-preview .pv-missing { font-style: italic; }
#project-preview ul { margin: .5rem 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: .3rem; }
#project-preview ul.pv-highlights { display: block; }
#project-preview ul.pv-highlights li { margin: .2rem 0; padding: 0; border: 0; color: var(--ink); font-size: .9rem; }
#project-preview ul.pv-highlights li::before { content: "— "; color: var(--muted); }
#project-preview li { padding: .05rem .45rem; border: 1px solid var(--line); font-size: .75rem; color: var(--muted); }
#project-preview .pv-actions { display: flex; flex-wrap: wrap; gap: 1rem; font-size: .9rem; color: var(--accent); }
@media (max-width: 640px) {
  #project-editor :is(button, select, input:not([type="checkbox"])) { min-height: 44px; }
  #project-editor .project-grid { grid-template-columns: 1fr; }
}
`;

// Runs in the writing editor, sharing its save and local draft lifecycle.
// Uses string concatenation only: this source lives inside a String.raw template.
export const projectEditorScript = "var PROJECT_STATUSES = " + JSON.stringify(projectStatuses) + ";\n" +
  "var PROJECT_TYPES = " + JSON.stringify(projectTypes) + ";\n" +
  "var PROJECT_CASE_SKELETON = " + JSON.stringify(projectCaseSkeleton) + ";\n" +
  String.raw`
// hooks: { title(), summary(), tags(), bodyEmpty(), insert(markdown) } read the surrounding editor.
function bindProjectEditor(onEdit, request, language, hooks) {
  const MAX_RESULTS = 4;
  const panel = document.querySelector("#project-editor");
  const rows = panel.querySelector("#project-rows");
  const featured = panel.querySelector("#project-featured");
  const picker = panel.querySelector("#writing-select");
  const status = panel.querySelector("#writing-status");
  const highlightList = panel.querySelector("#project-highlights");
  const highlightAdd = panel.querySelector("#project-highlight-add");
  const caseButton = panel.querySelector("#project-template");
  const preview = panel.querySelector("#project-preview");
  const previewNote = panel.querySelector("#project-preview-note");
  const field = (name) => panel.querySelector("#project-" + name);
  const labelHints = {
    demo: ["View the demo", "Ver la demo"],
    code: ["Browse the repository", "Explorar el repositorio"],
    writing: ["Read more", "Leer más"],
    data: ["Explore the data", "Consultar los datos"],
  };
  let lastPreview = "";
  let lastEmpty = null;

  const spanish = () => language() === "es";
  const say = (es, en) => (spanish() ? es : en);
  const plain = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
  const known = (map, key) => Object.prototype.hasOwnProperty.call(map, key);

  // Mirrors validProjectLink in project-links.js.
  function validLink(link) {
    return known(PROJECT_TYPES, link.type) && !!link.label && !/[\s\\]/.test(link.href) &&
      (/^https?:\/\/[^/]/i.test(link.href) || /^\/(?!\/)/.test(link.href));
  }

  function detect(href) {
    const value = href.trim();
    if (!value) return "";
    if (value.charAt(0) === "/") return "writing";
    let url;
    try { url = new URL(value); } catch { return ""; }
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.toLowerCase();
    if (/\.pdf$/.test(path)) return "writing";
    if (/\.(csv|json|parquet|zip|xlsx?)$/.test(path) || /^(zenodo\.org|kaggle\.com|data\.)/.test(host) || /datos-abiertos|open-data|dataset/.test(path)) return "data";
    if (/^(github\.com|gitlab\.com|bitbucket\.org|codeberg\.org)$/.test(host)) return "code";
    if (/^(arxiv\.org|doi\.org|medium\.com)$|(^|\.)substack\.com$/.test(host)) return "writing";
    return "demo";
  }

  function refreshRow(row) {
    const type = row.querySelector("select").value;
    if (known(labelHints, type)) row.querySelectorAll("input")[0].placeholder = labelHints[type][Number(spanish())];
  }

  function renumber() {
    Array.from(rows.children).forEach((row, index) => { row.querySelector("legend").textContent = "Recurso " + (index + 1); });
    Array.from(highlightList.children).forEach((row, index) => {
      row.querySelector("input").setAttribute("aria-label", "Resultado " + (index + 1));
    });
    highlightAdd.disabled = highlightList.children.length >= MAX_RESULTS;
  }

  function add(link) {
    link = link || {};
    const row = panel.querySelector("#project-row").content.firstElementChild.cloneNode(true);
    const [label, href] = row.querySelectorAll("input");
    row.querySelector("select").value = link.type || "demo";
    // Rows created with an explicit type (loaded or picked from the Blog) are never re-detected.
    if (link.type) row.dataset.manual = "true";
    label.value = link.label || "";
    href.value = link.href || "";
    rows.append(row);
    refreshRow(row);
    renumber();
    return row;
  }

  function addHighlight(value) {
    if (highlightList.children.length >= MAX_RESULTS) return null;
    const row = panel.querySelector("#project-highlight-row").content.firstElementChild.cloneNode(true);
    row.querySelector("input").value = value || "";
    highlightList.append(row);
    renumber();
    return row;
  }

  function order() {
    const raw = field("order").value.trim();
    const number = Number(raw);
    return raw && Number.isFinite(number) ? Math.trunc(number) : "";
  }

  function read() {
    return {
      featured: featured.checked,
      project_links: Array.from(rows.children, (row) => {
        const [label, href] = row.querySelectorAll("input");
        return { type: row.querySelector("select").value, label: label.value.trim(), href: href.value.trim() };
      }).filter((link) => link.label || link.href),
      role: field("role").value.trim(),
      period: field("period").value.trim(),
      org: field("org").value.trim(),
      status: field("status").value,
      order: order(),
      highlights: Array.from(highlightList.querySelectorAll("input"), (input) => input.value.trim()).filter(Boolean),
      technologies: field("stack").value.split(",").map((item) => item.trim()).filter(Boolean),
    };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderPreview(fields) {
    const title = hooks.title().trim();
    const summary = hooks.summary().trim();
    const tagged = hooks.tags().split(",").some((tag) => tag.trim().toLowerCase() === "private");
    const state = known(PROJECT_STATUSES, fields.status) ? fields.status : tagged ? "private" : "";
    const links = fields.project_links.filter(validLink);
    const card = element("div", fields.featured ? "pv-card" : "pv-card is-compact");

    if (state) card.append(element("span", "pv-badge pv-" + state, PROJECT_STATUSES[state][Number(spanish())]));
    card.append(element("div", "pv-title", title || say("Sin título", "Untitled")));
    const facts = [fields.role, fields.period, fields.org].filter(Boolean).join(" · ");
    if (facts) card.append(element("div", "pv-meta", facts));
    card.append(element("div", summary ? "pv-blurb" : "pv-blurb pv-missing", summary || say("Sin resumen", "No summary")));
    if (fields.featured && fields.highlights.length) {
      const list = element("ul", "pv-highlights");
      fields.highlights.slice(0, 3).forEach((item) => list.append(element("li", "", item)));
      card.append(list);
    }
    if (fields.technologies.length) {
      const limit = fields.featured ? 6 : 4;
      const list = element("ul", "pv-stack");
      fields.technologies.slice(0, limit).forEach((item) => list.append(element("li", "", item)));
      if (fields.technologies.length > limit) list.append(element("li", "", "+" + (fields.technologies.length - limit)));
      card.append(list);
    }
    const actions = element("div", "pv-actions");
    if (links[0]) actions.append(element("span", "", links[0].label + " ↗"));
    actions.append(element("span", "", (state === "private" ? say("Leer el caso", "Read the case study") : say("Ver proyecto", "View project")) + " →"));
    card.append(actions);
    preview.replaceChildren(card);
    previewNote.textContent = fields.featured
      ? "Así se verá como proyecto destacado."
      : "Así se verá como entrada compacta; los resultados solo aparecen en destacados.";
  }

  function sync() {
    if (panel.hidden) return;
    const empty = hooks.bodyEmpty();
    if (empty !== lastEmpty) { lastEmpty = empty; caseButton.hidden = !empty; }
    const fields = read();
    const key = JSON.stringify([fields, hooks.title(), hooks.summary(), hooks.tags(), language()]);
    if (key === lastPreview) return;
    lastPreview = key;
    renderPreview(fields);
  }

  panel.addEventListener("input", (event) => {
    const row = event.target.closest("#project-rows > fieldset");
    if (row) {
      const select = row.querySelector("select");
      const href = row.querySelectorAll("input")[1];
      if (event.target === select) row.dataset.manual = "true";
      else if (event.target === href && !row.dataset.manual) {
        const type = detect(href.value);
        if (type) select.value = type;
      }
      refreshRow(row);
    }
    sync();
    onEdit();
  });
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const row = button.closest("fieldset");
    if (button.hasAttribute("data-remove")) row.remove();
    if (button.dataset.move === "up" && row.previousElementSibling) rows.insertBefore(row, row.previousElementSibling);
    if (button.dataset.move === "down" && row.nextElementSibling) rows.insertBefore(row.nextElementSibling, row);
    renumber();
    sync();
    onEdit();
  });
  highlightList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    button.closest(".project-highlight").remove();
    renumber();
    sync();
    onEdit();
  });
  highlightAdd.onclick = () => { const row = addHighlight(); if (row) row.querySelector("input").focus(); sync(); onEdit(); };
  panel.querySelector("#project-add").onclick = () => { add().querySelector("input").focus(); sync(); onEdit(); };
  caseButton.onclick = () => hooks.insert(PROJECT_CASE_SKELETON[spanish() ? "es" : "en"]);
  panel.querySelector("#writing-load").onclick = async () => {
    const lang = language();
    status.textContent = "Cargando…";
    try {
      const { writings } = await request("/api/project-writings?lang=" + lang);
      if (lang !== language()) return;
      picker.replaceChildren(new Option("Selecciona una publicación", ""));
      for (const post of writings) picker.add(new Option(post.title, post.path));
      status.textContent = writings.length ? "" : "No hay publicaciones en este idioma.";
      picker.hidden = !writings.length;
      if (writings.length) picker.focus();
    } catch { status.textContent = "No se pudo cargar el Blog. Vuelve a intentarlo."; }
  };
  picker.onchange = () => {
    if (!picker.value) return;
    add({ type: "writing", label: picker.selectedOptions[0].text, href: picker.value });
    picker.value = "";
    sync();
    onEdit();
  };
  return {
    show(active) {
      panel.hidden = !active;
      picker.hidden = true;
      status.textContent = "";
      if (!active) return;
      Array.from(rows.children).forEach(refreshRow);
      lastPreview = "";
      lastEmpty = null;
      sync();
    },
    sync,
    read,
    // Resets every field first, so a stored draft never leaves stale values behind.
    load(fields) {
      fields = fields || {};
      rows.replaceChildren();
      highlightList.replaceChildren();
      for (const link of Array.isArray(fields.project_links) ? fields.project_links : []) add(link);
      featured.checked = fields.featured === true;
      const state = plain(fields.status).trim().toLowerCase();
      field("status").value = known(PROJECT_STATUSES, state) ? state : "";
      field("role").value = plain(fields.role);
      field("period").value = plain(fields.period);
      field("org").value = plain(fields.org);
      const number = typeof fields.order === "number" ? fields.order : /^-?\d+$/.test(plain(fields.order).trim()) ? Number(fields.order) : NaN;
      field("order").value = Number.isInteger(number) ? String(number) : "";
      const highlights = Array.isArray(fields.highlights) ? fields.highlights : fields.highlights ? [fields.highlights] : [];
      highlights.map(plain).filter(Boolean).slice(0, MAX_RESULTS).forEach(addHighlight);
      field("stack").value = Array.isArray(fields.technologies) ? fields.technologies.map(plain).filter(Boolean).join(", ") : plain(fields.technologies);
      renumber();
      sync();
    },
  };
}
`;
