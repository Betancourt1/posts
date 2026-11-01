import { projectTypes } from "./project-links.js";

export const projectEditorMarkup = `
<section id="project-editor" hidden>
  <h2>Recursos del proyecto</h2>
  <p>El primer enlace aparece en el catálogo. Puedes guardar un proyecto sin enlaces.</p>
  <label><input type="checkbox" id="project-featured"> Destacar en el catálogo</label>
  <div id="project-rows"></div>
  <button type="button" id="project-add">Añadir enlace</button>
  <button type="button" id="writing-load">Elegir del Blog</button>
  <select id="writing-select" aria-label="Publicación del Blog" hidden></select>
  <small role="status" id="writing-status"></small>
  <template id="project-row">
    <fieldset>
      <legend>Recurso</legend>
      <select aria-label="Tipo">${Object.entries(projectTypes).map(([type, names]) => `<option value="${type}">${names[1]}</option>`).join("")}</select>
      <input aria-label="Texto del enlace" placeholder="Texto del enlace">
      <input aria-label="Destino" placeholder="https://… o /ruta/">
      <button type="button" data-move="up" aria-label="Subir recurso">↑</button>
      <button type="button" data-move="down" aria-label="Bajar recurso">↓</button>
      <button type="button" data-remove>Quitar</button>
    </fieldset>
  </template>
</section>`;

export const projectEditorStyles = `
#project-editor { margin-block: 1.2rem 2rem; }
#project-editor h2 { font-size: 1.1rem; }
#project-editor p, #writing-status { color: var(--muted); }
#project-editor fieldset { border: 1px solid var(--line); margin: .6rem 0; padding: .6rem; min-width: 0; }
#project-editor :is(button, select, input:not([type="checkbox"])) { font: inherit; color: var(--ink); background: var(--panel); padding: .45rem; border: 1px solid var(--line); }
#project-editor fieldset input { display: block; width: 100%; margin: .35rem 0; }
#writing-select { max-width: 100%; }
`;

// Runs in the writing editor, sharing its save and local draft lifecycle.
export const projectEditorScript = String.raw`
function bindProjectEditor(onEdit, request, language) {
  const panel = document.querySelector("#project-editor");
  const rows = panel.querySelector("#project-rows");
  const featured = panel.querySelector("#project-featured");
  const picker = panel.querySelector("#writing-select");
  const status = panel.querySelector("#writing-status");

  function add(link = {}) {
    const row = panel.querySelector("template").content.firstElementChild.cloneNode(true);
    const [label, href] = row.querySelectorAll("input");
    row.querySelector("select").value = link.type || "demo";
    label.value = link.label || "";
    href.value = link.href || "";
    rows.append(row);
    return row;
  }

  panel.addEventListener("input", onEdit);
  rows.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const row = button.closest("fieldset");
    if (button.hasAttribute("data-remove")) row.remove();
    if (button.dataset.move === "up" && row.previousElementSibling) rows.insertBefore(row, row.previousElementSibling);
    if (button.dataset.move === "down" && row.nextElementSibling) rows.insertBefore(row.nextElementSibling, row);
    onEdit();
  });
  panel.querySelector("#project-add").onclick = () => { add().querySelector("input").focus(); onEdit(); };
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
    onEdit();
  };
  return {
    show(active) {
      panel.hidden = !active;
      picker.hidden = true;
      status.textContent = "";
    },
    read() {
      return { featured: featured.checked, project_links: Array.from(rows.children, row => {
        const [label, href] = row.querySelectorAll("input");
        return { type: row.querySelector("select").value, label: label.value.trim(), href: href.value.trim() };
      }) };
    },
    load(fields) {
      rows.replaceChildren();
      for (const link of fields.project_links || []) add(link);
      featured.checked = fields.featured === true;
    },
  };
}
`;
