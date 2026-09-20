export const technicalEditorStyles = `
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
    .technical-insert-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 1rem 0; }
    .technical-insert-grid button { padding: 0.75rem; text-align: left; }
    .technical-dialog summary { cursor: pointer; padding: 0.5rem 0; }
    .technical-dialog code { overflow-wrap: anywhere; }
    .technical-preview-button { width: 100%; margin-top: 1rem; }
    .technical-dialog--preview { width: min(62rem, calc(100vw - 2rem)); }
    .technical-dialog iframe { display: block; width: 100%; height: 70dvh; border: 0; border-radius: 0.4rem; background: var(--bg); }
    .technical-dialog iframe[hidden] { display: none; }
`;

export const technicalEditorMarkup = `
  <dialog class="technical-dialog" id="technical-tools" aria-labelledby="technical-tools-title">
    <header><h2 id="technical-tools-title">Contenido técnico</h2><button type="button" class="technical-close" data-close-technical="technical-tools" aria-label="Cerrar contenido técnico">&times;</button></header>
    <p>Inserta un ejemplo en el cursor o usa el texto seleccionado. Después puedes editarlo en el documento.</p>
    <label class="field"><span>Lenguaje del bloque de código</span><select id="technical-code-language">
      <option value="python">Python</option><option value="javascript">JavaScript</option><option value="typescript">TypeScript</option><option value="sql">SQL</option><option value="bash">Bash</option><option value="json">JSON</option><option value="yaml">YAML</option><option value="rust">Rust</option><option value="go">Go</option><option value="plaintext">Texto</option>
    </select></label>
    <div class="technical-insert-grid">
      <button type="button" data-technical-insert="inline-math">Fórmula en línea</button>
      <button type="button" data-technical-insert="display-math">Ecuación</button>
      <button type="button" data-technical-insert="code">Bloque de código</button>
      <button type="button" data-technical-insert="mermaid">Diagrama Mermaid</button>
      <button type="button" data-technical-insert="image">Diagrama SVG</button>
      <button type="button" data-technical-insert="video">Animación / video</button>
      <button type="button" data-technical-insert="interactive">Visual interactivo</button>
    </div>
    <details><summary>Guía rápida</summary><ul>
      <li>LaTeX: <code>$x^2$</code> en línea; <code>$$</code> en líneas separadas para ecuaciones.</li>
      <li>Código y Mermaid: edita el contenido entre las cercas. Cambia el lenguaje en la primera línea.</li>
      <li>SVG: usa el botón de imagen para subirlo, o cambia la URL del ejemplo.</li>
      <li>Video e interactivos: reemplaza la URL por tu archivo en <code>/visuals/</code> o en un host HTTPS. El botón de imagen solo sube imágenes.</li>
      <li>Interactivos: conserva un título descriptivo. El archivo HTML necesita sus propios controles de teclado y movimiento reducido.</li>
    </ul></details>
    <button type="button" class="technical-preview-button" id="technical-preview-open">Vista previa sin guardar</button>
  </dialog>
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
        document.getElementById("toolbar-technical").addEventListener("click", function () {
          var target = activeTextArea();
          technicalSelection = { target: target, start: target.selectionStart, end: target.selectionEnd };
          technicalTools.showModal();
          syncSheetLock();
        });
        Array.from(document.querySelectorAll("[data-close-technical]")).forEach(function (button) {
          button.addEventListener("click", function () { document.getElementById(button.dataset.closeTechnical).close(); });
        });
        [technicalTools, technicalPreview].forEach(function (dialog) {
          dialog.addEventListener("close", syncSheetLock);
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
        technicalTools.close();
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

      function previewTechnicalContent() {
        if (activeViewMode === "markdown") syncFieldsFromMarkdown();
        technicalTools.close();
        technicalFrame.hidden = true;
        technicalStatus.hidden = false;
        technicalStatus.textContent = "Preparando vista previa…";
        technicalPreview.showModal();
        syncSheetLock();
        var requestId = ++technicalPreviewRequest;
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
