function insertIcon(paths) {
  return `<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
}

const INSERT_ICONS = Object.freeze({
  image: insertIcon('<rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m3 17 5-5 4 4 3-3 6 6" />'),
  sidenote: insertIcon('<rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 7h5M8 11h5M8 15h5M17 7v10" />'),
  color: insertIcon('<path d="m5 17 5-12h4l5 12M7 13h10M4 21h16" />'),
  inlineMath: insertIcon('<path d="M3 8h4l5 8h4M12 8l-5 8M18 5h3l-3 4h3" />'),
  displayMath: insertIcon('<path d="M4 4h16M4 20h16M8 10h8M7 14h10" />'),
  codeBlock: insertIcon('<rect x="2" y="3" width="20" height="18" rx="2" /><path d="m9 9-3 3 3 3m6-6 3 3-3 3" />'),
  mermaid: insertIcon('<rect x="2" y="9" width="6" height="6" rx="1" /><rect x="16" y="3" width="6" height="6" rx="1" /><rect x="16" y="15" width="6" height="6" rx="1" /><path d="M8 12h4m0 0 4-6m-4 6 4 6" />'),
  svg: insertIcon('<circle cx="4" cy="17" r="2" /><circle cx="20" cy="7" r="2" /><path d="M6 17c7 0 5-10 12-10M4 10h5m6 4h5" />'),
  video: insertIcon('<rect x="2" y="4" width="20" height="16" rx="2" /><path d="m10 8 6 4-6 4z" />'),
  interactive: insertIcon('<rect x="2" y="3" width="20" height="18" rx="2" /><path d="m7 7 3 10 2-4 4-1zM16 7h2m-1-1v2" />'),
  more: insertIcon('<path d="M4 12h1m6.5 0h1m6.5 0h1" />'),
});

function insertButton(attributes, label, mobileLabel, icon) {
  return `<button type="button" ${attributes} title="${label}" aria-label="${label}">${icon}<span class="insert-label">${label}</span><span class="insert-mobile-label" aria-hidden="true">${mobileLabel}</span></button>`;
}

export const technicalEditorStyles = `
    .insert-tools-open .formatbar { height: auto; min-height: 4.75rem; flex-direction: column; overflow: visible; }
    .formatbar #toolbar-technical { gap: 0.35rem; }
    .formatbar .mobile-markdown-toggle .button-icon { display: none; }
    .technical-insert-bar {
      width: min(62rem, 100%);
      padding: 0.5rem 0 0.6rem;
      border-top: 1px solid var(--line);
    }
    .technical-insert-bar[hidden] { display: none !important; }
    .technical-insert-actions {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 0.35rem;
    }
    .formatbar .technical-insert-actions button {
      width: 100%;
      min-width: 0;
      min-height: 2.75rem;
      gap: 0.4rem;
      padding: 0 0.45rem;
      border: 1px solid var(--line);
      background: var(--panel);
      font-size: 0.75rem;
      font-weight: 600;
    }
    .technical-insert-actions .insert-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .technical-insert-actions .insert-mobile-label { display: none; }
    .technical-insert-actions [data-sidenote-tone="green"] { --tone: #4ecca3; }
    .technical-insert-actions [data-sidenote-tone="blue"] { --tone: #8fb8ff; }
    .technical-insert-actions [data-sidenote-tone="amber"] { --tone: #f0c36e; }
    .technical-insert-actions [data-sidenote-tone] .button-icon { color: var(--tone); }
    .technical-insert-options {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 0.45rem;
      font-size: 0.78rem;
    }
    .technical-insert-options label { display: flex; align-items: center; gap: 0.5rem; }
    .formatbar #insert-more { display: none !important; }
    .technical-insert-options select {
      min-height: 2.5rem;
      border: 1px solid var(--line);
      border-radius: 0.35rem;
      background: var(--panel);
      color: var(--ink);
      padding: 0 0.5rem;
    }
    .technical-insert-options summary { cursor: pointer; }
    .technical-insert-options details { position: relative; }
    .technical-insert-options ul {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 20;
      width: min(38rem, calc(100vw - 1rem));
      max-height: min(40dvh, 18rem);
      overflow: auto;
      margin: 0.35rem 0 0;
      padding: 0.75rem 1rem 0.75rem 1.75rem;
      border: 1px solid var(--line);
      border-radius: 0.5rem;
      background: var(--panel);
      line-height: 1.5;
      box-shadow: 0 0.5rem 1.5rem rgb(0 0 0 / 0.16);
    }
    @media (max-width: 900px) {
      .technical-insert-bar:not(.show-all) [data-mobile-extra] { display: none !important; }
      .formatbar #toolbar-technical { width: 2.75rem; min-width: 2.75rem; padding: 0; }
      .formatbar #toolbar-technical .insert-label { display: none; }
      .formatbar .technical-insert-bar { width: 100%; padding: 0.4rem 0 0.2rem; }
      .technical-insert-actions { gap: 0.2rem; }
      .formatbar .technical-insert-actions button { min-height: 2.75rem; flex-direction: column; gap: 0.1rem; padding: 0; }
      .technical-insert-actions .insert-label { display: none; }
      .technical-insert-actions .insert-mobile-label {
        display: block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.65rem;
        line-height: 1;
      }
      .technical-insert-options { margin-top: 0.35rem; gap: 0.35rem; }
      .technical-insert-options label { min-width: 0; }
      .technical-insert-options label span { display: none; }
      .technical-insert-options select { min-height: 2.75rem; max-width: 7rem; }
      .technical-insert-options summary { display: flex; align-items: center; min-height: 2.75rem; }
      .formatbar #insert-more {
        display: inline-flex !important;
        width: auto;
        min-width: 4rem;
        min-height: 2.75rem;
        gap: 0.2rem;
        padding: 0 0.4rem;
        border: 1px solid var(--line);
        background: var(--panel);
        font-size: 0.78rem;
      }
      .reference-theme.insert-tools-open .writer {
        padding-bottom: calc(17rem + env(safe-area-inset-bottom));
      }
      .technical-insert-options ul { top: auto; bottom: 100%; margin: 0 0 0.35rem; }
    }
    @media (max-width: 380px) {
      .formatbar { padding-left: 0.25rem; padding-right: 0.25rem; }
      .formatbar-inner { gap: 0; }
      .formatbar .mobile-markdown-toggle { width: 2.75rem; min-width: 2.75rem; padding: 0; }
      .formatbar .mobile-markdown-toggle .button-icon { display: block; }
      .formatbar .mobile-markdown-toggle .markdown-label { display: none; }
    }
    .technical-dialog {
      width: min(34rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
      padding: 1.25rem;
      border: 1px solid var(--line);
      border-radius: 0.8rem;
      background: var(--panel);
      color: var(--ink);
      overflow: auto;
    }
    .technical-dialog::backdrop { background: rgb(0 0 0 / 0.65); }
    .technical-dialog header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
    .technical-dialog h2 { margin: 0; font-size: 1.1rem; }
    .technical-dialog p, .technical-dialog li { color: var(--muted); font-size: 0.85rem; line-height: 1.6; }
    .technical-dialog button { min-height: 44px; }
    .technical-dialog .technical-close { min-width: 44px; font-size: 1.3rem; }
    .technical-dialog code { overflow-wrap: anywhere; }
    .technical-dialog--preview { width: min(62rem, calc(100vw - 2rem)); }
    .technical-dialog iframe { display: block; width: 100%; height: 70dvh; border: 0; border-radius: 0.4rem; background: var(--bg); }
    .technical-dialog iframe[hidden] { display: none; }
`;

export const technicalInsertMarkup = `
  <div class="technical-insert-bar" id="technical-tools" role="group" aria-label="Insertar contenido" hidden>
    <div class="technical-insert-actions">
      ${insertButton('id="toolbar-image"', 'Subir imagen', 'Imagen', INSERT_ICONS.image)}
      ${insertButton('id="toolbar-sidenote"', 'Nota al margen', 'Nota', INSERT_ICONS.sidenote)}
      ${insertButton('data-sidenote-tone="green" data-mobile-extra', 'Texto verde', 'Verde', INSERT_ICONS.color)}
      ${insertButton('data-sidenote-tone="blue" data-mobile-extra', 'Texto azul', 'Azul', INSERT_ICONS.color)}
      ${insertButton('data-sidenote-tone="amber" data-mobile-extra', 'Texto ámbar', 'Ámbar', INSERT_ICONS.color)}
      ${insertButton('data-technical-insert="inline-math"', 'Fórmula en línea', 'Fórmula', INSERT_ICONS.inlineMath)}
      ${insertButton('data-technical-insert="display-math" data-mobile-extra', 'Ecuación', 'Ecuación', INSERT_ICONS.displayMath)}
      ${insertButton('data-technical-insert="code"', 'Bloque de código', 'Código', INSERT_ICONS.codeBlock)}
      ${insertButton('data-technical-insert="mermaid"', 'Diagrama Mermaid', 'Mermaid', INSERT_ICONS.mermaid)}
      ${insertButton('data-technical-insert="image" data-mobile-extra', 'Diagrama SVG', 'SVG', INSERT_ICONS.svg)}
      ${insertButton('data-technical-insert="video" data-mobile-extra', 'Animación / video', 'Video', INSERT_ICONS.video)}
      ${insertButton('data-technical-insert="interactive" data-mobile-extra', 'Visual interactivo', 'Visual', INSERT_ICONS.interactive)}
    </div>
    <div class="technical-insert-options">
      <button type="button" id="insert-more" aria-expanded="false" aria-label="Mostrar más opciones" title="Mostrar más opciones">${INSERT_ICONS.more}<span class="insert-label">Más</span></button>
      <label><span>Lenguaje del bloque de código</span><select id="technical-code-language" aria-label="Lenguaje del bloque de código">
      <option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="sql">SQL</option><option value="bash">Bash</option><option value="json">JSON</option><option value="yaml">YAML</option><option value="rust">Rust</option><option value="go">Go</option><option value="plaintext">Texto</option>
      </select></label>
      <details><summary>Guía rápida</summary><ul>
        <li>LaTeX: <code>$x^2$</code> en línea; <code>$$</code> en líneas separadas para ecuaciones.</li>
        <li>Código y Mermaid: edita el contenido entre las cercas. Cambia el lenguaje en la primera línea.</li>
        <li>SVG: usa el botón de imagen para subirlo, o cambia la URL del ejemplo.</li>
        <li>Video e interactivos: reemplaza la URL por tu archivo en <code>/visuals/</code> o en un host HTTPS. El botón de imagen solo sube imágenes.</li>
        <li>Interactivos: conserva un título descriptivo. El archivo HTML necesita sus propios controles de teclado y movimiento reducido.</li>
      </ul></details>
    </div>
  </div>
`;

export const technicalEditorMarkup = `
  <dialog class="technical-dialog technical-dialog--preview" id="technical-preview" aria-labelledby="technical-preview-title">
    <header><h2 id="technical-preview-title">Vista previa sin guardar</h2><button type="button" class="technical-close" data-close-technical="technical-preview" aria-label="Cerrar vista previa">&times;</button></header>
    <p id="technical-preview-status" role="status">Preparando vista previa…</p>
    <iframe id="technical-preview-frame" title="Vista previa del artículo" sandbox="allow-scripts allow-same-origin" hidden></iframe>
  </dialog>
`;

export const technicalEditorScript = String.raw`
      var technicalTools = document.getElementById("technical-tools");
      var technicalPreview = document.getElementById("technical-preview");
      var technicalFrame = document.getElementById("technical-preview-frame");
      var technicalStatus = document.getElementById("technical-preview-status");
      var technicalSelection = null;
      var technicalPreviewRequest = 0;

      function bindTechnicalTools() {
        var trigger = document.getElementById("toolbar-technical");
        var more = document.getElementById("insert-more");
        trigger.addEventListener("click", function () {
          if (!technicalTools.hidden) {
            closeTechnicalTools();
            return;
          }
          var target = activeTextArea();
          technicalSelection = { target: target, start: target.selectionStart, end: target.selectionEnd };
          technicalTools.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          document.body.classList.add("insert-tools-open");
        });
        more.addEventListener("click", function () {
          var expanded = technicalTools.classList.toggle("show-all");
          more.setAttribute("aria-expanded", String(expanded));
          more.setAttribute("aria-label", expanded ? "Mostrar menos opciones" : "Mostrar más opciones");
          more.title = expanded ? "Mostrar menos opciones" : "Mostrar más opciones";
          more.querySelector(".insert-label").textContent = expanded ? "Menos" : "Más";
        });
        Array.from(document.querySelectorAll("[data-close-technical]")).forEach(function (button) {
          button.addEventListener("click", function () { document.getElementById(button.dataset.closeTechnical).close(); });
        });
        technicalPreview.addEventListener("close", syncSheetLock);
        document.addEventListener("pointerdown", function (event) {
          if (!technicalTools.hidden && !technicalTools.contains(event.target) && !trigger.contains(event.target)) {
            closeTechnicalTools();
          }
        });
        document.addEventListener("keydown", function (event) {
          if (event.key === "Escape" && !technicalTools.hidden) {
            closeTechnicalTools();
            trigger.focus({ preventScroll: true });
          }
        });
        technicalPreview.addEventListener("close", function () {
          technicalPreviewRequest += 1;
          technicalFrame.srcdoc = "";
        });
        Array.from(document.querySelectorAll("[data-technical-insert]")).forEach(function (button) {
          button.addEventListener("click", function () { insertTechnicalContent(button.dataset.technicalInsert); });
        });
        document.getElementById("technical-preview-open").addEventListener("click", previewTechnicalContent);
      }

      function closeTechnicalTools() {
        technicalTools.hidden = true;
        technicalTools.classList.remove("show-all");
        var more = document.getElementById("insert-more");
        more.setAttribute("aria-expanded", "false");
        more.setAttribute("aria-label", "Mostrar más opciones");
        more.title = "Mostrar más opciones";
        more.querySelector(".insert-label").textContent = "Más";
        technicalTools.querySelector("details").open = false;
        document.getElementById("toolbar-technical").setAttribute("aria-expanded", "false");
        document.body.classList.remove("insert-tools-open");
      }

      function insertTechnicalContent(kind) {
        if (!technicalSelection) return;
        var target = technicalSelection.target;
        var start = technicalSelection.start;
        var end = technicalSelection.end;
        var selected = target.value.slice(start, end);
        var english = (sourcePath || els.notebook.value).indexOf("content_en/") === 0;
        var fence = String.fromCharCode(96).repeat(3);
        var language = document.getElementById("technical-code-language").value;
        var text;
        if (kind === "inline-math") text = "$" + (selected || "x^2 + y^2 = z^2") + "$";
        if (kind === "display-math") text = "$$\n" + (selected || "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}") + "\n$$";
        if (kind === "code") text = fence + language + "\n" + (selected || (language === "python" ? "def square(x):\n    return x ** 2" : english ? "Your code here" : "Tu código aquí")) + "\n" + fence;
        if (kind === "mermaid") text = fence + "mermaid\n" + (selected || (english ? "flowchart LR\n  accTitle: Data flow\n  A[Input] --> B[Model] --> C[Output]" : "flowchart LR\n  accTitle: Flujo de datos\n  A[Entrada] --> B[Modelo] --> C[Salida]")) + "\n" + fence;
        if (kind === "image") text = "![" + (english ? "Describe the diagram" : "Describe el diagrama") + "](" + (selected || "/visuals/diagram.svg") + ")";
        if (kind === "video") text = "![" + (english ? "Describe the animation" : "Describe la animación") + "](" + (selected || "/visuals/animation.webm") + ")";
        if (kind === "interactive") text = fence + "interactive\n" + JSON.stringify({ src: selected || "/visuals/model.html", title: english ? "Explore the model" : "Explora el modelo", height: 480 }) + "\n" + fence;
        if (!text) return;
        if (kind === "inline-math") {
          if (start && !/\s$/.test(target.value.slice(0, start))) text = " " + text;
          if (end < target.value.length && !/^[\s?!.,:]/.test(target.value.slice(end))) text += " ";
        } else {
          if (start && !target.value.slice(0, start).endsWith("\n\n")) text = "\n\n" + text;
          text += "\n\n";
        }
        closeTechnicalTools();
        target.focus({ preventScroll: true });
        target.setSelectionRange(start, end);
        if (target === els.body) recordBodyHistory();
        // Native insertion keeps the Markdown textarea's undo stack usable.
        if (!document.execCommand("insertText", false, text)) {
          replaceTextRange(target, start, end, text, start + text.length, start + text.length);
        }
        if (target === els.markdownCanvas) syncFieldsFromMarkdown();
        else recordBodyHistory();
        resizeTextarea(target);
        markContentEdited();
      }

      function restoreInsertSelection() {
        if (technicalTools.hidden || !technicalSelection) return;
        closeTechnicalTools();
        technicalSelection.target.focus({ preventScroll: true });
        technicalSelection.target.setSelectionRange(technicalSelection.start, technicalSelection.end);
      }

      function previewTechnicalContent() {
        if (activeViewMode === "markdown") syncFieldsFromMarkdown();
        closeTechnicalTools();
        technicalFrame.hidden = true;
        technicalStatus.hidden = false;
        technicalStatus.textContent = "Preparando vista previa…";
        technicalPreview.showModal();
        syncSheetLock();
        var requestId = ++technicalPreviewRequest;
        if (!els.title.value.trim() && !els.body.value.trim()) {
          technicalStatus.textContent = "Escribe un título o contenido para ver la vista previa.";
          return;
        }
        postJson("/api/preview", {
          body: els.body.value,
          title: els.title.value,
          sourcePath: sourcePath,
          frontMatter: frontMatter,
          lang: (sourcePath || els.notebook.value).indexOf("content_es/") === 0 ? "es" : "en",
          theme: theme,
        }).then(function (result) {
          if (requestId !== technicalPreviewRequest || !technicalPreview.open) return;
          technicalFrame.srcdoc = result.html;
          technicalFrame.hidden = false;
          technicalStatus.hidden = true;
        }).catch(function (error) {
          if (requestId !== technicalPreviewRequest || !technicalPreview.open) return;
          technicalStatus.textContent = "No se pudo preparar la vista previa: " + error.message;
        });
      }
`;
