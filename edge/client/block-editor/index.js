import { Compartment, EditorState, Prec, StateEffect, StateField, Transaction } from "@codemirror/state";
import { Decoration, EditorView, keymap, placeholder, drawSelection } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, undo, redo, isolateHistory } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { blockAt, imageParts, moveBlock } from "./markdown.js";
import { insertTemplateText } from "../../../functions/_lib/insert-templates.js";
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
import listNumbersIcon from "@tabler/icons/outline/list-numbers.svg";
import pilcrowIcon from "@tabler/icons/outline/pilcrow.svg";
import mathIcon from "@tabler/icons/outline/math-function.svg";
import diagramIcon from "@tabler/icons/outline/schema.svg";
import noteIcon from "@tabler/icons/outline/notes.svg";
import videoIcon from "@tabler/icons/outline/player-play.svg";
import pointerIcon from "@tabler/icons/outline/pointer.svg";
import closeIcon from "@tabler/icons/outline/x.svg";
import eyeIcon from "@tabler/icons/outline/eye.svg";
import copyIcon from "@tabler/icons/outline/copy.svg";
import upIcon from "@tabler/icons/outline/arrow-up.svg";
import moveDownIcon from "@tabler/icons/outline/arrow-down.svg";
import trashIcon from "@tabler/icons/outline/trash.svg";

const HINT_SESSIONS_KEY = "authorEditorHintSessions";
const HINT_SESSION_LIMIT = 3;
const TONES = ["green", "blue", "amber"];

const prose = syntaxHighlighting(HighlightStyle.define([
  { tag: tags.heading1, fontSize: "1.45em", fontWeight: "600" },
  { tag: [tags.heading2, tags.heading3], fontSize: "1.15em", fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, textDecoration: "underline", textUnderlineOffset: "3px" },
  { tag: tags.monospace, class: "block-code" },
  { tag: tags.processingInstruction, class: "block-marker" },
]));

// A short line highlight confirms where inserted or moved content landed.
const addFlash = StateEffect.define();
const clearFlash = StateEffect.define();
const flashLine = Decoration.line({ class: "block-flash" });
const flashField = StateField.define({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (effect.is(clearFlash)) next = Decoration.none;
      if (effect.is(addFlash)) {
        const { doc } = transaction.state;
        const from = Math.max(0, Math.min(effect.value.from, doc.length));
        const to = Math.max(from, Math.min(effect.value.to, doc.length));
        const ranges = [];
        let line = doc.lineAt(from);
        while (ranges.length < 200) {
          ranges.push(flashLine.range(line.from));
          if (line.to >= to || line.number === doc.lines) break;
          line = doc.line(line.number + 1);
        }
        next = Decoration.set(ranges);
      }
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});

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

function searchable(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

// Prefer word-prefix matches ("ma" → margen, math); substring matches are only a fallback.
function filterCommands(items, query) {
  if (!query) return items;
  const prefix = items.filter((item) => item.search.split(/\s+/).some((word) => word.startsWith(query)));
  return prefix.length ? prefix : items.filter((item) => item.search.includes(query));
}

function readHintSession() {
  try {
    const session = Number(localStorage.getItem(HINT_SESSIONS_KEY) || 0) + 1;
    localStorage.setItem(HINT_SESSIONS_KEY, String(session));
    return session;
  } catch {
    return 1;
  }
}

export function createBlockEditor(options) {
  const { parent, onChange, onUpload, onPreview } = options;
  const t = (en, es) => options.language() === "es" ? es : en;
  const presentation = new Compartment();
  const hintSession = readHintSession();
  let raw = options.raw;
  let frame = 0;
  let flashTimer = 0;
  let dismissSelection = "";
  let suppressSlash = false;
  let pendingUpload = null;
  let menuReturn = null;
  let menuAnchor = null;
  let slashRange = null;
  let slashState = null;
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
        markdown({ base: markdownLanguage }), history(), drawSelection(), flashField,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": t("Writing", "Contenido"), spellcheck: "true",
          autocapitalize: "sentences", "data-writing-surface": "true",
        }),
        placeholder(t("Write, or type / to insert…", "Escribe, o usa / para insertar…")),
        presentation.of(raw ? [] : prose),
        // The slash list only captures keys while it is open; Tab still leaves the editor otherwise.
        Prec.highest(keymap.of([
          { key: "ArrowDown", run: () => moveSlash(1) },
          { key: "ArrowUp", run: () => moveSlash(-1) },
          { key: "Enter", run: () => applySlash() },
          { key: "Tab", run: () => applySlash() },
          { key: "Escape", run: () => { if (!slashState) return false; closeSlash(); return true; } },
        ])),
        keymap.of([
          { key: "Mod-b", run: () => { wrap("**", "**"); return true; } },
          { key: "Mod-i", run: () => { wrap("_", "_"); return true; } },
          { key: "Mod-k", run: () => { wrap("[", "](https://)"); return true; } },
          { key: "Mod-Shift-Enter", run: () => { openInsert(); return true; } },
          { key: "Mod-Shift-.", run: () => { openBlockMenu(); return true; } },
          { key: "Alt-ArrowUp", run: () => { moveCurrent(-1, false); return true; } },
          { key: "Alt-ArrowDown", run: () => { moveCurrent(1, false); return true; } },
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
            if (slashState) slashState.from = update.changes.mapPos(slashState.from);
            onChange(update.state.sliceDoc());
            dismissSelection = "";
            syncHint();
          }
          if (update.docChanged || update.selectionSet || update.focusChanged || update.geometryChanged) schedule();
          if (update.focusChanged && !update.view.hasFocus) closeSlash();
          if (update.docChanged && !update.view.composing && !suppressSlash && update.transactions.some(tr => tr.isUserEvent("input.type"))) {
            const selection = update.state.selection.main;
            const line = update.state.doc.lineAt(selection.head);
            if (selection.empty && line.text === "/" && line.from + 1 === selection.head && blockAt(update.state.sliceDoc(), line.from).type !== "FencedCode") {
              slashState = { from: line.from, query: null, index: 0, items: [] };
            }
          }
          if (slashState && (update.docChanged || update.selectionSet)) queueMicrotask(() => { if (mounted) updateSlash(); });
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
    element("span", "block-toolbar-separator"),
  );
  const toneLabels = { green: t("Green text", "Texto verde"), blue: t("Blue text", "Texto azul"), amber: t("Amber text", "Texto ámbar") };
  for (const tone of TONES) {
    const action = button(toneLabels[tone], '<span class="block-tone-dot"></span>', () => wrap(`{{${tone}|`, "}}"));
    action.classList.add("block-tone");
    action.dataset.tone = tone;
    formats.append(action);
  }
  toolbar.append(formats);

  const gutter = button(t("Block actions", "Acciones del bloque"), gripIcon, () => {
    const empty = gutter.dataset.empty === "true";
    if (empty) openInsert(); else openBlockMenu();
  });
  gutter.classList.add("block-gutter");
  gutter.hidden = true;
  const add = button(t("Insert block", "Insertar bloque"), plusIcon, () => openInsert());
  add.classList.add("block-add");
  add.setAttribute("aria-haspopup", "dialog");
  const actions = button(t("Block actions", "Acciones del bloque"), gripIcon, () => openBlockMenu());
  actions.classList.add("block-mobile-actions");
  const dock = element("div", "block-dock");
  dock.append(actions, add);
  for (const control of [gutter, dock]) control.addEventListener("pointerdown", event => event.preventDefault());
  const hint = element("p", "block-writing-hint", t("Select text to format · / to insert · Alt+↑/↓ moves a block", "Selecciona texto para dar formato · / para insertar · Alt+↑/↓ mueve un bloque"));
  host.after(hint);

  const slash = element("div", "block-slash");
  slash.id = "block-slash";
  slash.setAttribute("role", "listbox");
  slash.setAttribute("aria-label", t("Insert block", "Insertar bloque"));
  slash.hidden = true;
  slash.addEventListener("pointerdown", (event) => event.preventDefault());

  const dialog = element("dialog", "block-menu");
  dialog.setAttribute("aria-labelledby", "block-menu-title");
  const header = element("header");
  const menuTitle = element("h2", "", "");
  menuTitle.id = "block-menu-title";
  header.append(menuTitle, button(t("Close", "Cerrar"), closeIcon, closeMenu));
  const content = element("div", "block-menu-content");
  dialog.append(header, content);
  document.body.append(toolbar, gutter, dock, slash, dialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeMenu(); });
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeMenu(); });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  });
  dialog.addEventListener("focusout", (event) => {
    if (!isPopover() || !event.relatedTarget || dialog.contains(event.relatedTarget)) return;
    dismissMenu();
  });
  dialog.addEventListener("close", () => {
    if (dialog.open) return;
    document.body.classList.remove("block-menu-open");
    dialog.classList.remove("is-popover", "is-placing");
    if (menuReturn) {
      view.focus();
      menuReturn = null;
    }
    menuAnchor = null;
    slashRange = null;
    schedule();
  });
  const onOutsidePointer = (event) => {
    if (!isPopover() || dialog.contains(event.target) || gutter.contains(event.target)) return;
    dismissMenu();
  };
  document.addEventListener("pointerdown", onOutsidePointer, true);
  const onPopoverEscape = (event) => {
    if (event.key !== "Escape" || !isPopover() || dialog.contains(event.target)) return;
    event.preventDefault();
    closeMenu();
  };
  document.addEventListener("keydown", onPopoverEscape);

  function source() { return view.state.sliceDoc(); }
  function currentBlock() { return blockAt(source(), view.state.selection.main.head); }
  function selectionKey() { const s = view.state.selection.main; return `${s.anchor}:${s.head}`; }
  function isMobile() { return matchMedia("(max-width: 900px)").matches; }
  function isPopover() { return dialog.open && dialog.classList.contains("is-popover"); }
  function topbarBottom() { return document.querySelector(".topbar")?.getBoundingClientRect().bottom || 0; }
  function syncHint() { hint.hidden = hintSession > HINT_SESSION_LIMIT && Boolean(source().trim()); }

  function flash(from, to) {
    if (!mounted) return;
    view.dispatch({ effects: addFlash.of({ from, to }) });
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { if (mounted) view.dispatch({ effects: clearFlash.of(null) }); }, 900);
  }

  function change(from, to, insert, anchor = from + insert.length, head = anchor, opts = {}) {
    suppressSlash = true;
    view.dispatch({ changes: { from, to, insert }, selection: { anchor, head },
      annotations: [Transaction.userEvent.of("input.block"), isolateHistory.of("full")], scrollIntoView: true });
    suppressSlash = false;
    if (opts.flash) flash(opts.flash[0], opts.flash[1]);
    if (opts.focus !== false) view.focus();
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

  function anchorAt(position) {
    const coords = view.coordsAtPos(Math.min(position, view.state.doc.length)) || view.coordsAtPos(view.state.selection.main.head);
    const left = Math.max(8, host.getBoundingClientRect().left - 44);
    return coords ? { left, top: coords.top, bottom: coords.bottom } : { left, top: topbarBottom() + 8, bottom: topbarBottom() + 8 };
  }

  function placeMenu() {
    if (!isPopover()) return;
    const anchor = anchorAt(menuAnchor ?? view.state.selection.main.head);
    const width = dialog.offsetWidth;
    const height = dialog.offsetHeight;
    const minTop = topbarBottom() + 8;
    let top = anchor.bottom + 6;
    if (top + height > innerHeight - 8) top = Math.max(minTop, anchor.top - height - 6);
    dialog.style.left = Math.max(8, Math.min(innerWidth - width - 8, anchor.left)) + "px";
    dialog.style.top = Math.max(minTop, Math.min(top, innerHeight - height - 8)) + "px";
    dialog.classList.remove("is-placing");
  }

  function positionControls() {
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportHeight = viewport?.height || innerHeight;
    document.documentElement.style.setProperty("--block-viewport-bottom", Math.max(0, innerHeight - viewportTop - viewportHeight) + "px");
    document.documentElement.style.setProperty("--block-viewport-height", viewportHeight + "px");
    const s = view.state.selection.main;
    const hasFocus = view.hasFocus || toolbar.contains(document.activeElement) || dock.contains(document.activeElement) || document.activeElement === gutter;
    const mobile = isMobile();
    const barBottom = topbarBottom();
    const caret = view.coordsAtPos(s.head);
    const visible = caret && caret.bottom > barBottom && caret.top < viewportTop + viewportHeight - 50;
    toolbar.hidden = dialog.open || s.empty || !hasFocus || !visible || dismissSelection === selectionKey();
    dock.hidden = dialog.open || !toolbar.hidden || !hasFocus || Boolean(slashState);
    gutter.hidden = mobile || dialog.open || !hasFocus || !s.empty || !visible || Boolean(slashState);
    if (!toolbar.hidden && !mobile) {
      const start = view.coordsAtPos(s.from) || caret;
      const x = Math.max(8, Math.min(innerWidth - toolbar.offsetWidth - 8, (start.left + caret.right) / 2 - toolbar.offsetWidth / 2));
      toolbar.style.left = x + "px";
      toolbar.style.top = Math.max(barBottom + 8, start.top - toolbar.offsetHeight - 10) + "px";
    }
    if (!gutter.hidden) {
      const block = currentBlock();
      const coords = view.coordsAtPos(block.from) || caret;
      const empty = block.type === "Empty" || !source().slice(block.from, block.to).trim();
      gutter.dataset.empty = String(empty);
      gutter.innerHTML = empty ? plusIcon : gripIcon;
      gutter.querySelector("svg")?.setAttribute("aria-hidden", "true");
      gutter.setAttribute("aria-label", empty ? t("Insert block", "Insertar bloque") : t("Block actions", "Acciones del bloque"));
      gutter.title = gutter.getAttribute("aria-label");
      gutter.style.left = Math.max(4, host.getBoundingClientRect().left - 48) + "px";
      gutter.style.top = Math.max(barBottom + 4, coords.top - 8) + "px";
    }
    if (isPopover()) placeMenu();
    if (slashState) positionSlash();
  }

  function openMenu(title, anchorPosition = view.state.selection.main.head) {
    closeSlash();
    menuReturn = view.state.selection.main;
    menuAnchor = anchorPosition;
    content.replaceChildren();
    content.onkeydown = null;
    menuTitle.textContent = title;
    if (!dialog.open) {
      const popover = !isMobile();
      dialog.classList.toggle("is-popover", popover);
      if (popover) {
        dialog.classList.add("is-placing");
        dialog.show();
      } else dialog.showModal();
    }
    document.body.classList.add("block-menu-open");
    requestAnimationFrame(placeMenu);
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

  // Closing through an outside click leaves focus where the user clicked.
  function dismissMenu() {
    if (!dialog.open) return;
    menuReturn = null;
    slashRange = null;
    dialog.close();
  }

  function insertMarkdown(text, inline = false, range = null) {
    const selected = range || pendingUpload || slashRange || view.state.selection.main;
    const { from, to } = selected;
    const doc = source();
    const before = inline || !from || doc.slice(0, from).endsWith("\n\n") ? "" : "\n\n";
    const after = inline || doc.slice(to).startsWith("\n\n") ? "" : "\n\n";
    pendingUpload = null;
    slashRange = null;
    closeMenu();
    const start = from + before.length;
    change(from, to, before + text + after, start + text.length, undefined, { flash: inline ? null : [start, start + text.length] });
  }

  function insertNote() {
    const doc = source();
    const s = slashRange || view.state.selection.main;
    let index = 1;
    while (doc.includes(`[^note-${index}]`)) index++;
    const ref = `[^note-${index}]`;
    const note = `\n\n${ref}: ${t("Margin note.", "Nota al margen.")}\n`;
    const from = slashRange ? s.from : s.to;
    slashRange = null;
    closeMenu();
    view.dispatch({ changes: [{ from, to: s.to, insert: ref }, { from: doc.length, insert: note }],
      selection: { anchor: from + ref.length }, annotations: isolateHistory.of("full"), scrollIntoView: true });
    view.focus();
  }

  function commandCatalog(selected) {
    const lang = options.language() === "es" ? "es" : "en";
    const template = (kind) => insertTemplateText(kind, { selected, lang, language: "python" });
    return [
      { group: "text", label: t("Heading", "Encabezado"), icon: headingIcon, keywords: "heading titulo encabezado h2", run: () => insertMarkdown("## " + t("Heading", "Encabezado")) },
      { group: "text", label: t("Bulleted list", "Lista con viñetas"), icon: listIcon, keywords: "list lista bullet", run: () => insertMarkdown("- " + t("First item", "Primer elemento")) },
      { group: "text", label: t("Numbered list", "Lista numerada"), icon: listNumbersIcon, keywords: "list numbered ordenada", run: () => insertMarkdown("1. " + t("First item", "Primer elemento")) },
      { group: "text", label: t("Quote", "Cita"), icon: quoteIcon, keywords: "quote cita", run: () => insertMarkdown("> " + t("Quote", "Cita")) },
      { group: "text", label: t("Margin note", "Nota al margen"), icon: noteIcon, keywords: "note nota sidenote", run: insertNote },
      { group: "media", label: t("Upload image", "Subir imagen"), icon: photoIcon, keywords: "image imagen foto upload", run: () => { pendingUpload = slashRange || view.state.selection.main; slashRange = null; closeMenu(); onUpload(); } },
      { group: "media", label: t("SVG diagram", "Diagrama SVG"), icon: diagramIcon, keywords: "svg diagram diagrama", run: () => insertMarkdown(template("image")) },
      { group: "media", label: t("Animation / video", "Animación / video"), icon: videoIcon, keywords: "video animation animacion", run: () => insertMarkdown(template("video")) },
      { group: "technical", label: t("Code block", "Bloque de código"), icon: codeIcon, keywords: "code codigo", run: () => insertMarkdown(template("code")) },
      { group: "technical", label: t("Inline formula", "Fórmula en línea"), icon: mathIcon, keywords: "math formula latex", run: () => insertMarkdown(template("inline-math"), true) },
      { group: "technical", label: t("Equation", "Ecuación"), icon: mathIcon, keywords: "math equation ecuacion latex", run: () => insertMarkdown(template("display-math")) },
      { group: "technical", label: t("Mermaid diagram", "Diagrama Mermaid"), icon: diagramIcon, keywords: "mermaid diagram diagrama flowchart", run: () => insertMarkdown(template("mermaid")) },
      { group: "technical", label: t("Interactive visual", "Visual interactivo"), icon: pointerIcon, keywords: "interactive interactivo", run: () => insertMarkdown(template("interactive")) },
    ].map((command) => ({ ...command, search: searchable(command.label + " " + command.keywords) }));
  }

  function groupLabel(group) {
    return { text: t("Text", "Texto"), media: t("Media", "Medios"), technical: t("Technical", "Técnico") }[group];
  }

  function openInsert(range = null) {
    slashRange = range;
    const selection = view.state.selection.main;
    openMenu(t("Insert", "Insertar"));
    const search = element("input", "block-search");
    search.type = "search";
    search.placeholder = t("Search blocks…", "Buscar bloques…");
    search.setAttribute("aria-label", t("Search blocks", "Buscar bloques"));
    const list = element("div", "block-command-list");
    const empty = element("p", "block-no-results", t("No matching blocks", "No se encontraron bloques"));
    empty.hidden = true;
    const selected = range ? "" : source().slice(selection.from, selection.to);
    let group = "";
    for (const command of commandCatalog(selected)) {
      if (command.group !== group) {
        group = command.group;
        const heading = element("h3", "block-group-title", groupLabel(group));
        heading.dataset.group = group;
        list.append(heading);
      }
      const item = button(command.label, command.icon, command.run, true);
      item.dataset.search = command.search;
      item.dataset.group = command.group;
      list.append(item);
    }
    search.addEventListener("input", () => {
      const query = searchable(search.value.trim());
      const items = [...list.querySelectorAll("button")];
      const matches = new Set(filterCommands(items.map((node) => ({ node, search: node.dataset.search })), query).map((entry) => entry.node));
      for (const item of items) item.hidden = !matches.has(item);
      for (const heading of list.querySelectorAll(".block-group-title")) {
        heading.hidden = !items.some((item) => item.dataset.group === heading.dataset.group && !item.hidden);
      }
      empty.hidden = items.some((item) => !item.hidden);
      placeMenu();
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

  function slashItems() {
    return filterCommands(commandCatalog(""), slashState.query || "");
  }

  function updateSlash() {
    if (!slashState) return;
    const s = view.state.selection.main;
    const line = view.state.doc.lineAt(slashState.from);
    const typed = view.state.sliceDoc(slashState.from, s.head);
    if (!view.hasFocus || !s.empty || s.head <= slashState.from || s.head > line.to || !typed.startsWith("/") || /[\s/]/.test(typed.slice(1))) {
      closeSlash();
      return;
    }
    const query = searchable(typed.slice(1));
    if (query !== slashState.query) {
      slashState.query = query;
      slashState.index = 0;
      slashState.items = slashItems();
      renderSlash();
    }
    positionSlash();
    schedule();
  }

  function renderSlash() {
    slash.replaceChildren();
    const { items, index } = slashState;
    if (!items.length) {
      slash.append(element("p", "block-no-results", t("No matching blocks · Esc to close", "Sin resultados · Esc para cerrar")));
    }
    let group = "";
    items.forEach((command, position) => {
      if (command.group !== group) {
        group = command.group;
        slash.append(element("p", "block-group-title", groupLabel(group)));
      }
      const option = element("div", "block-slash-option");
      option.id = "block-slash-option-" + position;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(position === index));
      option.innerHTML = command.icon;
      option.querySelector("svg")?.setAttribute("aria-hidden", "true");
      option.append(element("span", "", command.label));
      option.addEventListener("click", () => { slashState.index = position; applySlash(); });
      slash.append(option);
    });
    slash.hidden = false;
    view.contentDOM.setAttribute("aria-controls", slash.id);
    view.contentDOM.setAttribute("aria-expanded", "true");
    syncSlashSelection();
  }

  function syncSlashSelection() {
    const options = [...slash.querySelectorAll(".block-slash-option")];
    options.forEach((option, position) => option.setAttribute("aria-selected", String(position === slashState.index)));
    const active = options[slashState.index];
    if (active) {
      view.contentDOM.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    } else view.contentDOM.removeAttribute("aria-activedescendant");
  }

  function positionSlash() {
    if (!slashState || slash.hidden) return;
    if (isMobile()) {
      slash.style.left = "";
      slash.style.top = "";
      return;
    }
    const caret = view.coordsAtPos(view.state.selection.main.head);
    if (!caret) return;
    const height = slash.offsetHeight;
    let top = caret.bottom + 6;
    if (top + height > innerHeight - 8) top = Math.max(topbarBottom() + 8, caret.top - height - 6);
    slash.style.left = Math.max(8, Math.min(innerWidth - slash.offsetWidth - 8, caret.left - 12)) + "px";
    slash.style.top = top + "px";
  }

  function moveSlash(direction) {
    if (!slashState || !slashState.items.length) return false;
    slashState.index = (slashState.index + direction + slashState.items.length) % slashState.items.length;
    syncSlashSelection();
    return true;
  }

  function applySlash() {
    if (!slashState || !slashState.items.length) return false;
    const command = slashState.items[slashState.index];
    const range = { from: slashState.from, to: view.state.selection.main.head };
    closeSlash();
    slashRange = range;
    command.run();
    slashRange = null;
    return true;
  }

  function closeSlash() {
    if (!slashState && slash.hidden) return;
    slashState = null;
    slash.hidden = true;
    slash.replaceChildren();
    view.contentDOM.removeAttribute("aria-activedescendant");
    view.contentDOM.removeAttribute("aria-expanded");
    view.contentDOM.removeAttribute("aria-controls");
    schedule();
  }

  function blockType(block) {
    if (block.type === "Paragraph") return "paragraph";
    if (/Heading/.test(block.type)) return "heading";
    if (block.type === "Blockquote") return "quote";
    if (block.type === "BulletList") return "list";
    if (block.type === "OrderedList") return "ordered";
    return "";
  }

  function moveCurrent(direction, keepMenu) {
    const block = currentBlock();
    const move = moveBlock(source(), block, direction);
    if (!move) return false;
    const length = block.to - block.from;
    const offset = Math.min(Math.max(0, view.state.selection.main.head - block.from), length);
    const caret = move.anchor + offset;
    change(move.from, move.to, move.insert, caret, caret, { flash: [move.anchor, move.anchor + length], focus: !keepMenu });
    if (keepMenu) openBlockMenu(direction < 0 ? "up" : "down");
    return true;
  }

  function openBlockMenu(focusAction = "") {
    const block = currentBlock();
    if (block.type === "Empty") { openInsert(); return; }
    openMenu(t("Block", "Bloque"), block.from);
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
      const current = blockType(block);
      const title = element("p", "block-field-label", t("Turn into", "Convertir en"));
      const row = element("div", "block-convert");
      row.setAttribute("role", "group");
      row.setAttribute("aria-label", t("Turn into", "Convertir en"));
      const types = [
        ["paragraph", t("Paragraph", "Párrafo"), pilcrowIcon],
        ["heading", t("Heading", "Encabezado"), headingIcon],
        ["quote", t("Quote", "Cita"), quoteIcon],
        ["list", t("Bulleted list", "Lista con viñetas"), listIcon],
        ["ordered", t("Numbered list", "Lista numerada"), listNumbersIcon],
      ];
      for (const [value, label, icon] of types) {
        const choice = button(label, icon, () => {
          if (value === current) return;
          const plain = text.replace(/^(?:#{1,6}\s+|> ?|(?:[-+*]|\d+[.)])\s+)/gm, "").replace(/\n(?:=+|-+)[ \t]*$/, "");
          const prefix = { paragraph: "", heading: "## ", quote: "> ", list: "- ", ordered: "1. " }[value];
          const next = value === "heading" ? prefix + plain : plain.split("\n").map((line) => prefix + line).join("\n");
          closeMenu(); change(block.from, block.to, next, undefined, undefined, { flash: [block.from, block.from + next.length] });
        });
        choice.dataset.convert = value;
        choice.setAttribute("aria-pressed", String(value === current));
        row.append(choice);
      }
      content.append(title, row);
    }
    content.append(button(t("Preview block", "Vista previa del bloque"), eyeIcon, () => { closeMenu(); onPreview(text); }, true));
    content.append(button(t("Insert after", "Insertar después"), plusIcon, () => {
      closeMenu(); change(block.to, block.to, "\n\n"); openInsert();
    }, true));
    content.append(button(t("Duplicate", "Duplicar"), copyIcon, () => {
      closeMenu();
      const start = block.to + 2;
      change(block.to, block.to, "\n\n" + text, undefined, undefined, { flash: [start, start + text.length] });
    }, true));
    for (const [direction, label, icon, name] of [[-1, t("Move up", "Mover arriba"), upIcon, "up"], [1, t("Move down", "Mover abajo"), moveDownIcon, "down"]]) {
      const action = button(label, icon, () => moveCurrent(direction, true), true);
      action.dataset.action = name;
      action.disabled = !block.blocks[block.index + direction];
      action.title = label + (direction < 0 ? " (Alt+↑)" : " (Alt+↓)");
      content.append(action);
    }
    const remove = button(t("Delete block", "Eliminar bloque"), trashIcon, () => {
      closeMenu(); change(block.from, block.blocks[block.index + 1]?.from ?? block.to, "");
    }, true);
    remove.classList.add("block-delete"); content.append(remove);
    const preferred = focusAction && content.querySelector(`[data-action="${focusAction}"]:not(:disabled)`);
    const fallback = focusAction && content.querySelector("[data-action]:not(:disabled)");
    (preferred || fallback || content.querySelector("select, button"))?.focus();
  }

  function openImage(block, image) {
    openMenu(t("Image", "Imagen"), block.from);
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
  syncHint();
  schedule();
  return {
    view,
    value: source,
    focus: () => view.focus(),
    insertMarkdown,
    cancelUpload: () => { pendingUpload = null; },
    dismiss() { closeSlash(); dismissMenu(); },
    setDocument(value) { if (value !== source()) change(0, view.state.doc.length, value, 0); },
    setRaw(value) {
      raw = value; host.classList.toggle("block-raw", raw);
      view.dispatch({ effects: presentation.reconfigure(raw ? [] : prose) });
      schedule();
    },
    format(kind) { if (kind === "undo") undo(view); else if (kind === "redo") redo(view); },
    destroy() {
      mounted = false; cancelAnimationFrame(frame); clearTimeout(flashTimer);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("pointerdown", onOutsidePointer, true);
      document.removeEventListener("keydown", onPopoverEscape);
      view.destroy(); [host, hint, toolbar, gutter, dock, slash, dialog].forEach((node) => node.remove());
    },
  };
}

window.BlockMarkdownEditor = { create: createBlockEditor };
