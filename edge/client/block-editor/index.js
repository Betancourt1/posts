import { Compartment, EditorState, Transaction } from "@codemirror/state";
import { EditorView, keymap, placeholder, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo, undoDepth, redoDepth, isolateHistory } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { blockAt, imageParts, moveBlock } from "./markdown.js";
import boldIcon from "@tabler/icons/outline/bold.svg";
import italicIcon from "@tabler/icons/outline/italic.svg";
import linkIcon from "@tabler/icons/outline/link.svg";
import codeIcon from "@tabler/icons/outline/code.svg";
import plusIcon from "@tabler/icons/outline/plus.svg";
import gripIcon from "@tabler/icons/outline/grip-vertical.svg";
import photoIcon from "@tabler/icons/outline/photo.svg";
import headingIcon from "@tabler/icons/outline/heading.svg";
import quoteIcon from "@tabler/icons/outline/blockquote.svg";
import listIcon from "@tabler/icons/outline/list.svg";
import mathIcon from "@tabler/icons/outline/math-function.svg";
import diagramIcon from "@tabler/icons/outline/schema.svg";
import noteIcon from "@tabler/icons/outline/notes.svg";
import colorIcon from "@tabler/icons/outline/palette.svg";
import videoIcon from "@tabler/icons/outline/player-play.svg";
import pointerIcon from "@tabler/icons/outline/pointer.svg";
import downIcon from "@tabler/icons/outline/chevron-down.svg";
import closeIcon from "@tabler/icons/outline/x.svg";
import eyeIcon from "@tabler/icons/outline/eye.svg";
import copyIcon from "@tabler/icons/outline/copy.svg";
import upIcon from "@tabler/icons/outline/arrow-up.svg";
import moveDownIcon from "@tabler/icons/outline/arrow-down.svg";
import trashIcon from "@tabler/icons/outline/trash.svg";
import undoIcon from "@tabler/icons/outline/arrow-back-up.svg";
import redoIcon from "@tabler/icons/outline/arrow-forward-up.svg";

const prose = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.45em", fontWeight: "600" },
  { tag: [tags.heading2, tags.heading3], fontSize: "1.15em", fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, textDecoration: "underline", textUnderlineOffset: "3px" },
  { tag: tags.monospace, class: "block-code" },
  { tag: tags.processingInstruction, class: "block-marker" },
]));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label, icon, action, text = false) {
  const node = element("button", "block-button");
  node.type = "button";
  node.title = label;
  node.setAttribute("aria-label", label);
  // Only static, locally bundled Tabler icons enter this HTML sink.
  node.innerHTML = icon;
  node.querySelector("svg")?.setAttribute("aria-hidden", "true");
  if (text) node.append(element("span", "", label));
  node.addEventListener("click", action);
  return node;
}

export function createBlockEditor(options) {
  const { parent, onChange, onUpload, onPreview } = options;
  const t = (en, es) => options.language() === "es" ? es : en;
  const presentation = new Compartment();
  let raw = options.raw;
  let frame = 0;
  let collapsed = false;
  let dismissSelection = "";
  let suppressSlash = false;
  let pendingUpload = null;
  let menuReturn = null;
  let slashRange = null;
  let mounted = true;

  const host = element("div", "block-editor");
  host.id = "block-editor";
  parent.append(host);
  host.classList.toggle("block-raw", raw);
  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc: options.value,
      extensions: [
        EditorState.lineSeparator.of("\n"),
        markdown({ base: markdownLanguage }), history(), drawSelection(),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": t("Writing", "Contenido"), spellcheck: "true",
          autocapitalize: "sentences", "data-writing-surface": "true",
        }),
        placeholder(t("Write, or type / to insert…", "Escribe, o usa / para insertar…")),
        presentation.of(raw ? [] : prose),
        keymap.of([
          { key: "Mod-b", run: () => { wrap("**", "**"); return true; } },
          { key: "Mod-i", run: () => { wrap("_", "_"); return true; } },
          { key: "Mod-k", run: () => { wrap("[", "](https://)"); return true; } },
          { key: "Mod-Shift-Enter", run: () => { openInsert(); return true; } },
          { key: "Mod-Shift-.", run: () => { openBlockMenu(); return true; } },
          { key: "Escape", run: () => { dismissSelection = selectionKey(); schedule(); return true; } },
          ...historyKeymap, ...defaultKeymap,
        ]),
        EditorView.scrollMargins.of(() => ({
          top: (document.querySelector(".topbar")?.getBoundingClientRect().bottom || 0) + 20,
          bottom: 76 + Math.max(0, innerHeight - (visualViewport?.height || innerHeight) - (visualViewport?.offsetTop || 0)),
        })),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            if (pendingUpload) pendingUpload = { from: update.changes.mapPos(pendingUpload.from), to: update.changes.mapPos(pendingUpload.to, 1) };
            onChange(update.state.sliceDoc());
            dismissSelection = "";
          }
          if (update.docChanged || update.selectionSet || update.focusChanged || update.geometryChanged) schedule();
          if (update.docChanged && !update.view.composing && !suppressSlash && update.transactions.some(tr => tr.isUserEvent("input.type"))) {
            const selection = update.state.selection.main;
            const line = update.state.doc.lineAt(selection.head);
            if (selection.empty && line.text === "/" && line.from + 1 === selection.head && blockAt(update.state.sliceDoc(), line.from).type !== "FencedCode") {
              queueMicrotask(() => { if (mounted) openInsert({ from: line.from, to: line.to }); });
            }
          }
        }),
      ],
    }),
  });

  const toolbar = element("div", "block-selection-toolbar");
  toolbar.setAttribute("role", "toolbar");
  toolbar.setAttribute("aria-label", t("Text formatting", "Formato del texto"));
  toolbar.hidden = true;
  toolbar.addEventListener("pointerdown", (event) => event.preventDefault());
  const formats = element("div", "block-selection-actions");
  formats.append(
    button(t("Bold", "Negrita"), boldIcon, () => wrap("**", "**")),
    button(t("Italic", "Cursiva"), italicIcon, () => wrap("_", "_")),
    button(t("Link", "Enlace"), linkIcon, () => wrap("[", "](https://)")),
    button(t("Inline code", "Código en línea"), codeIcon, () => wrap("`", "`")),
    button(t("Text color", "Color del texto"), colorIcon, openColors),
  );
  const collapse = button(t("Hide formatting", "Ocultar formato"), downIcon, () => {
    collapsed = !collapsed;
    formats.hidden = collapsed;
    collapse.setAttribute("aria-label", collapsed ? t("Show formatting", "Mostrar formato") : t("Hide formatting", "Ocultar formato"));
    collapse.title = collapse.getAttribute("aria-label");
    collapse.setAttribute("aria-expanded", String(!collapsed));
    schedule();
  });
  collapse.setAttribute("aria-expanded", "true");
  toolbar.append(formats, collapse);

  const gutter = button(t("Block actions", "Acciones del bloque"), gripIcon, openBlockMenu);
  gutter.classList.add("block-gutter");
  gutter.hidden = true;
  const add = button(t("Insert block", "Insertar bloque"), plusIcon, () => openInsert());
  add.classList.add("block-add");
  add.setAttribute("aria-haspopup", "dialog");
  const actions = button(t("Block actions", "Acciones del bloque"), gripIcon, openBlockMenu);
  actions.classList.add("block-mobile-actions");
  const dock = element("div", "block-dock");
  dock.append(actions, add);
  for (const control of [gutter, dock]) control.addEventListener("pointerdown", event => event.preventDefault());
  const hint = element("p", "block-writing-hint", t("Select text to format · / to insert", "Selecciona texto para dar formato · / para insertar"));
  host.after(hint);

  const dialog = element("dialog", "block-menu");
  dialog.setAttribute("aria-labelledby", "block-menu-title");
  const header = element("header");
  const menuTitle = element("h2", "", "");
  menuTitle.id = "block-menu-title";
  header.append(menuTitle, button(t("Close", "Cerrar"), closeIcon, closeMenu));
  const content = element("div", "block-menu-content");
  dialog.append(header, content);
  document.body.append(toolbar, gutter, dock, dialog);
  const settingsTools = element("div", "block-settings-tools");
  const rawToggle = button("Markdown", codeIcon, () => options.onToggleRaw(), true);
  rawToggle.id = "block-raw-toggle";
  rawToggle.setAttribute("aria-pressed", String(raw));
  const undoButton = button(t("Undo", "Deshacer"), undoIcon, () => { options.onCloseSettings(); undo(view); view.focus(); }, true);
  const redoButton = button(t("Redo", "Rehacer"), redoIcon, () => { options.onCloseSettings(); redo(view); view.focus(); }, true);
  settingsTools.append(rawToggle, button(t("Preview", "Vista previa"), eyeIcon, () => onPreview(), true), undoButton, redoButton);
  document.querySelector(".settings-header").after(settingsTools);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeMenu(); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    document.body.classList.remove("block-menu-open");
    if (menuReturn) {
      view.focus();
      menuReturn = null;
    }
    slashRange = null;
    schedule();
  });

  function source() { return view.state.sliceDoc(); }
  function currentBlock() { return blockAt(source(), view.state.selection.main.head); }
  function selectionKey() { const s = view.state.selection.main; return `${s.anchor}:${s.head}`; }

  function change(from, to, insert, anchor = from + insert.length, head = anchor) {
    suppressSlash = true;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor, head },
      annotations: [Transaction.userEvent.of("input.block"), isolateHistory.of("full")], scrollIntoView: true });
    suppressSlash = false;
    view.focus();
  }

  function wrap(before, after) {
    const { from, to } = view.state.selection.main;
    const selected = source().slice(from, to) || t("text", "texto");
    closeMenu();
    change(from, to, before + selected + after, from + before.length, from + before.length + selected.length);
  }

  function schedule() {
    if (!mounted || frame) return;
    frame = requestAnimationFrame(() => { frame = 0; positionControls(); });
  }

  function positionControls() {
    undoButton.disabled = undoDepth(view.state) === 0;
    redoButton.disabled = redoDepth(view.state) === 0;
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportHeight = viewport?.height || innerHeight;
    document.documentElement.style.setProperty("--block-viewport-bottom", Math.max(0, innerHeight - viewportTop - viewportHeight) + "px");
    document.documentElement.style.setProperty("--block-viewport-height", viewportHeight + "px");
    const s = view.state.selection.main;
    const hasFocus = view.hasFocus || toolbar.contains(document.activeElement) || dock.contains(document.activeElement) || document.activeElement === gutter;
    const mobile = matchMedia("(max-width: 900px)").matches;
    const topbarBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 0;
    const caret = view.coordsAtPos(s.head);
    const visible = caret && caret.bottom > topbarBottom && caret.top < viewportTop + viewportHeight - 50;
    toolbar.hidden = dialog.open || s.empty || !hasFocus || !visible || dismissSelection === selectionKey();
    dock.hidden = dialog.open || !toolbar.hidden || !hasFocus;
    gutter.hidden = mobile || dialog.open || !hasFocus || !s.empty || !visible;
    if (!toolbar.hidden && !mobile) {
      const start = view.coordsAtPos(s.from) || caret;
      const x = Math.max(8, Math.min(innerWidth - toolbar.offsetWidth - 8, (start.left + caret.right) / 2 - toolbar.offsetWidth / 2));
      toolbar.style.left = x + "px";
      toolbar.style.top = Math.max(topbarBottom + 8, start.top - toolbar.offsetHeight - 10) + "px";
    }
    if (!gutter.hidden) {
      const block = currentBlock();
      const coords = view.coordsAtPos(block.from) || caret;
      const empty = block.type === "Empty" || !source().slice(block.from, block.to).trim();
      gutter.innerHTML = empty ? plusIcon : gripIcon;
      gutter.querySelector("svg")?.setAttribute("aria-hidden", "true");
      gutter.setAttribute("aria-label", empty ? t("Insert block", "Insertar bloque") : t("Block actions", "Acciones del bloque"));
      gutter.title = gutter.getAttribute("aria-label");
      gutter.style.left = Math.max(4, host.getBoundingClientRect().left - 48) + "px";
      gutter.style.top = Math.max(topbarBottom + 4, coords.top - 8) + "px";
    }
  }

  function openMenu(title) {
    menuReturn = view.state.selection.main;
    content.replaceChildren();
    menuTitle.textContent = title;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("block-menu-open");
    schedule();
  }

  function closeMenu() {
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove("block-menu-open");
    menuReturn = null;
    slashRange = null;
    view.focus();
    schedule();
  }

  function openColors() {
    openMenu(t("Text color", "Color del texto"));
    for (const [tone, label] of [["green", t("Green", "Verde")], ["blue", t("Blue", "Azul")], ["amber", t("Amber", "Ámbar")]]) {
      const action = button(label, colorIcon, () => wrap(`{{${tone}|`, "}}"), true);
      action.dataset.tone = tone;
      content.append(action);
    }
    content.querySelector("button")?.focus();
  }

  function insertMarkdown(text, inline = false, range = null) {
    const selected = range || pendingUpload || slashRange || view.state.selection.main;
    const { from, to } = selected;
    const doc = source();
    const before = inline || !from || doc.slice(0, from).endsWith("\n\n") ? "" : "\n\n";
    const after = inline || doc.slice(to).startsWith("\n\n") ? "" : "\n\n";
    pendingUpload = null;
    closeMenu();
    change(from, to, before + text + after, from + before.length + text.length);
  }

  function insertNote() {
    const doc = source();
    const s = slashRange || view.state.selection.main;
    let index = 1;
    while (doc.includes(`[^note-${index}]`)) index++;
    const ref = `[^note-${index}]`;
    const note = `\n\n${ref}: ${t("Margin note.", "Nota al margen.")}\n`;
    const from = slashRange ? s.from : s.to;
    closeMenu();
    view.dispatch({ changes: [{ from, to: s.to, insert: ref }, { from: doc.length, insert: note }],
      selection: { anchor: from + ref.length }, annotations: isolateHistory.of("full"), scrollIntoView: true });
    view.focus();
  }

  function openInsert(range = null) {
    slashRange = range;
    openMenu(t("Insert", "Insertar"));
    const search = element("input", "block-search");
    search.type = "search";
    search.placeholder = t("Search blocks…", "Buscar bloques…");
    search.setAttribute("aria-label", t("Search blocks", "Buscar bloques"));
    const list = element("div", "block-command-list");
    const empty = element("p", "block-no-results", t("No matching blocks", "No se encontraron bloques"));
    empty.hidden = true;
    const fence = "```";
    const selection = view.state.selection.main;
    const selected = range ? "" : source().slice(selection.from, selection.to);
    const commands = [
      [t("Heading", "Encabezado"), headingIcon, () => insertMarkdown("## " + t("Heading", "Encabezado")), "heading titulo encabezado"],
      [t("Bulleted list", "Lista con viñetas"), listIcon, () => insertMarkdown("- " + t("First item", "Primer elemento")), "list lista"],
      [t("Numbered list", "Lista numerada"), listIcon, () => insertMarkdown("1. " + t("First item", "Primer elemento")), "list numbered ordenada"],
      [t("Quote", "Cita"), quoteIcon, () => insertMarkdown("> " + t("Quote", "Cita")), "quote cita"],
      [t("Upload image", "Subir imagen"), photoIcon, () => { pendingUpload = slashRange || view.state.selection.main; closeMenu(); onUpload(); }, "image imagen foto"],
      [t("Margin note", "Nota al margen"), noteIcon, insertNote, "note nota sidenote"],
      [t("Code block", "Bloque de código"), codeIcon, () => insertMarkdown(fence + "python\n" + (selected || 'print("Hello")') + "\n" + fence), "code codigo"],
      [t("Inline formula", "Fórmula en línea"), mathIcon, () => insertMarkdown("$" + (selected || "x^2") + "$", true), "math formula"],
      [t("Equation", "Ecuación"), mathIcon, () => insertMarkdown("$$\n" + (selected || "E = mc^2") + "\n$$"), "math equation ecuacion"],
      [t("Mermaid diagram", "Diagrama Mermaid"), diagramIcon, () => insertMarkdown(fence + "mermaid\n" + (selected || "flowchart LR\n  A --> B") + "\n" + fence), "mermaid diagram diagrama"],
      [t("SVG diagram", "Diagrama SVG"), diagramIcon, () => insertMarkdown("![" + t("Diagram", "Diagrama") + "](" + (selected || "/visuals/diagram.svg") + ")"), "svg diagram diagrama"],
      [t("Animation / video", "Animación / video"), videoIcon, () => insertMarkdown("![" + t("Animation", "Animación") + "](" + (selected || "/visuals/animation.webm") + ")"), "video animation animacion"],
      [t("Interactive visual", "Visual interactivo"), pointerIcon, () => insertMarkdown(fence + "interactive\n" + JSON.stringify({ src: selected || "/visuals/model.html", title: t("Explore the model", "Explora el modelo"), height: 480 }) + "\n" + fence), "interactive interactivo"],
    ];
    for (const [label, icon, action, keywords] of commands) {
      const item = button(label, icon, action, true);
      item.dataset.search = (label + " " + keywords).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      list.append(item);
    }
    search.addEventListener("input", () => {
      const query = search.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      for (const item of list.children) item.hidden = !item.dataset.search.includes(query);
      empty.hidden = [...list.children].some((item) => !item.hidden);
    });
    content.append(search, list, empty);
    content.onkeydown = (event) => {
      const choices = [...list.querySelectorAll("button:not([hidden])")];
      const index = choices.indexOf(document.activeElement);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        choices[(index + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length]?.focus();
      } else if (event.key === "Enter" && event.target === search) {
        event.preventDefault(); choices[0]?.click();
      }
    };
    search.focus();
  }

  function openBlockMenu() {
    const block = currentBlock();
    if (block.type === "Empty") { openInsert(); return; }
    openMenu(t("Block", "Bloque"));
    content.onkeydown = null;
    const text = source().slice(block.from, block.to);
    const image = imageParts(text);
    if (block.type === "FencedCode") {
      const match = text.match(/^([`~]{3,})([^\n\r]*)/);
      if (match) {
        const label = element("label", "block-field", t("Code language", "Lenguaje del código"));
        const select = element("select");
        for (const name of [...new Set([match[2], "python", "javascript", "typescript", "sql", "bash", "json", "yaml", "rust", "go", "mermaid", "interactive", ""])]) {
          const option = element("option", "", name || t("Plain text", "Texto"));
          option.value = name; select.append(option);
        }
        select.value = match[2];
        select.addEventListener("change", () => {
          closeMenu(); change(block.from + match[1].length, block.from + match[0].length, select.value);
        });
        label.append(select); content.append(label);
      }
    }
    if (image) {
      content.append(button(t("Edit image", "Editar imagen"), photoIcon, () => openImage(block, image), true));
      content.append(button(t("Replace image", "Reemplazar imagen"), photoIcon, () => {
        pendingUpload = { from: block.from, to: block.to }; closeMenu(); onUpload();
      }, true));
    }
    if (/^(Paragraph|ATXHeading\d|SetextHeading\d|Blockquote|BulletList|OrderedList)$/.test(block.type) && !image && !/^\[\^/.test(text)) {
      const label = element("label", "block-field", t("Turn into", "Convertir en"));
      const select = element("select");
      const types = [["", t("Choose type…", "Elegir tipo…")], ["paragraph", t("Paragraph", "Párrafo")], ["heading", t("Heading", "Encabezado")], ["quote", t("Quote", "Cita")], ["list", t("Bulleted list", "Lista con viñetas")], ["ordered", t("Numbered list", "Lista numerada")]];
      for (const [value, title] of types) { const option = element("option", "", title); option.value = value; select.append(option); }
      select.addEventListener("change", () => {
        if (!select.value) return;
        const plain = text.replace(/^(?:#{1,6}\s+|> ?|(?:[-+*]|\d+[.)])\s+)/gm, "").replace(/\n(?:=+|-+)[ \t]*$/, "");
        const prefix = { paragraph: "", heading: "## ", quote: "> ", list: "- ", ordered: "1. " }[select.value];
        const next = select.value === "heading" ? prefix + plain : plain.split("\n").map((line) => prefix + line).join("\n");
        closeMenu(); change(block.from, block.to, next);
      });
      label.append(select); content.append(label);
    }
    content.append(button(t("Preview block", "Vista previa del bloque"), eyeIcon, () => { closeMenu(); onPreview(text); }, true));
    content.append(button(t("Insert after", "Insertar después"), plusIcon, () => {
      closeMenu(); change(block.to, block.to, "\n\n"); openInsert();
    }, true));
    content.append(button(t("Duplicate", "Duplicar"), copyIcon, () => { closeMenu(); change(block.to, block.to, "\n\n" + text); }, true));
    for (const [direction, label, icon] of [[-1, t("Move up", "Mover arriba"), upIcon], [1, t("Move down", "Mover abajo"), moveDownIcon]]) {
      const action = button(label, icon, () => {
        const move = moveBlock(source(), block, direction);
        closeMenu(); if (move) change(move.from, move.to, move.insert, move.anchor);
      }, true);
      action.disabled = !block.blocks[block.index + direction];
      content.append(action);
    }
    const remove = button(t("Delete block", "Eliminar bloque"), trashIcon, () => {
      closeMenu(); change(block.from, block.blocks[block.index + 1]?.from ?? block.to, "");
    }, true);
    remove.classList.add("block-delete"); content.append(remove);
    content.querySelector("select, button")?.focus();
  }

  function openImage(block, image) {
    openMenu(t("Image", "Imagen"));
    const inputs = {};
    for (const [key, title] of [["src", t("Image URL", "URL de la imagen")], ["alt", t("Alternative text", "Texto alternativo")], ["caption", t("Caption", "Pie de imagen")]]) {
      const label = element("label", "block-field", title);
      const input = element("input"); input.value = image[key]; input.type = "text";
      label.append(input); content.append(label); inputs[key] = input;
    }
    const apply = button(t("Apply", "Aplicar"), photoIcon, () => {
      const src = inputs.src.value.trim().replace(/[<>\n\r]/g, "");
      if (!src) { inputs.src.focus(); return; }
      const alt = inputs.alt.value.replace(/[\[\]\n\r]/g, "");
      const caption = inputs.caption.value.replace(/["\n\r]/g, "");
      closeMenu(); change(block.from, block.to, `![${alt}](<${src}>${caption ? ` "${caption}"` : ""})`);
    }, true);
    content.append(apply); inputs.alt.focus();
  }

  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  schedule();
  return {
    view,
    value: source,
    focus: () => view.focus(),
    insertMarkdown,
    cancelUpload: () => { pendingUpload = null; },
    setDocument(value) { if (value !== source()) change(0, view.state.doc.length, value, 0); },
    setRaw(value) {
      raw = value; host.classList.toggle("block-raw", raw);
      rawToggle.setAttribute("aria-pressed", String(raw));
      view.dispatch({ effects: presentation.reconfigure(raw ? [] : prose) });
      schedule();
    },
    format(kind) { if (kind === "undo") undo(view); else if (kind === "redo") redo(view); },
    destroy() {
      mounted = false; cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      view.destroy(); [host, hint, toolbar, gutter, dock, dialog, settingsTools].forEach((node) => node.remove());
    },
  };
}

window.BlockMarkdownEditor = { create: createBlockEditor };
