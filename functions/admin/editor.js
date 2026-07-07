import { htmlResponse } from "../_lib/http.js";

function editorHtml() {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Author Editor</title>
  <link rel="apple-touch-icon" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #000000;
      --panel: #0b0c0f;
      --panel-2: #111318;
      --ink: #e8e8ea;
      --muted: #8a8f98;
      --line: #1c2025;
      --accent: #4ecca3;
      --danger: #ff6b6b;
      --field: #07080a;
      --writer: 46rem;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
      --sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--ink); font-family: var(--sans); }
    body { display: grid; grid-template-rows: auto auto 1fr; }
    button, input, select, textarea { font: inherit; }
    .topbar {
      min-height: 4rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--line);
      background: var(--bg);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .status {
      display: inline-flex;
      align-items: center;
      min-height: 1.55rem;
      max-width: min(32rem, 56vw);
      padding: 0 0.58rem;
      border: 1px solid var(--line);
      border-radius: 0.28rem;
      background: var(--panel-2);
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions { display: flex; align-items: center; gap: 0.55rem; }
    button {
      min-height: 2.45rem;
      border: 1px solid var(--line);
      border-radius: 0.45rem;
      background: var(--panel-2);
      color: var(--ink);
      padding: 0 0.82rem;
      cursor: pointer;
      font-weight: 700;
    }
    button:hover { border-color: var(--accent); color: var(--accent); }
    button.primary { border-color: var(--accent); background: var(--accent); color: #001b14; }
    button:disabled { opacity: 0.45; cursor: default; }
    .toolbar {
      height: 4rem;
      display: flex;
      justify-content: center;
      gap: 0.35rem;
      padding: 0.65rem 1rem;
      border-bottom: 1px solid var(--line);
      overflow-x: auto;
    }
    .toolbar-inner { width: min(var(--writer), 100%); display: flex; gap: 0.35rem; }
    .toolbar button { width: 2.3rem; min-width: 2.3rem; padding: 0; }
    .shell { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; min-height: calc(100vh - 8rem); }
    .writer { display: flex; justify-content: center; padding: 2.75rem 1rem 6rem; overflow: auto; }
    .paper { width: min(var(--writer), 100%); }
    .title, .summary, .body {
      width: 100%;
      border: 0;
      background: transparent;
      color: var(--ink);
      outline: none;
      font-family: var(--mono);
    }
    .title { min-height: 4.5rem; resize: none; font-size: 2.1rem; line-height: 1.12; font-weight: 800; }
    .summary { margin: 0.25rem 0 1.6rem; color: var(--muted); font-size: 1rem; }
    .body { min-height: 58vh; resize: vertical; font-size: 1rem; line-height: 1.75; }
    .settings { border-left: 1px solid var(--line); background: var(--panel); padding: 1rem; overflow: auto; }
    .settings h2 { margin: 0 0 1rem; font-size: 0.9rem; }
    .field { display: grid; gap: 0.35rem; margin-bottom: 0.85rem; color: var(--muted); font-size: 0.78rem; font-weight: 700; }
    .field input, .field select {
      width: 100%;
      min-height: 2.35rem;
      border: 1px solid var(--line);
      border-radius: 0.38rem;
      background: var(--field);
      color: var(--ink);
      padding: 0.42rem 0.52rem;
    }
    .check { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem; color: var(--ink); font-size: 0.84rem; }
    .path { color: var(--muted); overflow-wrap: anywhere; font-family: var(--mono); font-size: 0.72rem; line-height: 1.5; }
    .error { color: var(--danger); }
    @media (max-width: 900px) {
      .shell { grid-template-columns: 1fr; }
      .settings { border-left: 0; border-top: 1px solid var(--line); }
      .topbar { align-items: flex-start; flex-direction: column; }
      .actions { width: 100%; }
      .actions button { flex: 1; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="status" id="status">Loading</div>
    <div class="actions">
      <button id="preview" type="button">Preview</button>
      <button id="save" class="primary" type="button">Continue</button>
    </div>
  </header>
  <nav class="toolbar" aria-label="Formatting">
    <div class="toolbar-inner">
      <button type="button" data-format="bold" title="Bold">B</button>
      <button type="button" data-format="italic" title="Italic">I</button>
      <button type="button" data-format="heading" title="Heading">H</button>
      <button type="button" data-format="quote" title="Quote">“</button>
      <button type="button" data-format="ul" title="Bulleted list">•</button>
      <button type="button" data-format="ol" title="Numbered list">1.</button>
      <button type="button" data-format="link" title="Link">↗</button>
      <button type="button" id="image-button" title="Image">▧</button>
    </div>
  </nav>
  <main class="shell">
    <section class="writer">
      <article class="paper">
        <textarea id="title" class="title" rows="2" placeholder="Title"></textarea>
        <input id="summary" class="summary" type="text" placeholder="Add a subtitle..." />
        <textarea id="body" class="body" placeholder="Start writing..."></textarea>
      </article>
    </section>
    <aside class="settings">
      <h2>Post Settings</h2>
      <label class="field" id="notebook-field">
        <span>Notebook</span>
        <select id="notebook"></select>
      </label>
      <label class="field">
        <span>Slug</span>
        <input id="slug" type="text" />
      </label>
      <label class="field">
        <span>Date</span>
        <input id="date" type="date" />
      </label>
      <label class="field">
        <span>Tags</span>
        <input id="tags" type="text" />
      </label>
      <label class="check">
        <input id="draft" type="checkbox" />
        <span>Draft</span>
      </label>
      <label class="check">
        <input id="hidden" type="checkbox" />
        <span>Hidden</span>
      </label>
      <input id="image-file" type="file" accept="image/*" hidden />
      <div class="path" id="path"></div>
    </aside>
  </main>
  <script>
    (function () {
      var apiBase = "/admin/api";
      var params = new URLSearchParams(window.location.search);
      var mode = params.get("mode") || "new";
      var sourcePath = params.get("path") || "";
      var kind = params.get("kind") || "post";
      var preferredNotebook = params.get("notebook") || "content_es/posts";
      var siteOrigin = params.get("site") || window.location.origin;
      var frontMatter = {};
      var savedUrl = "";
      var slugTouched = false;
      var els = {
        status: document.getElementById("status"),
        save: document.getElementById("save"),
        preview: document.getElementById("preview"),
        title: document.getElementById("title"),
        summary: document.getElementById("summary"),
        body: document.getElementById("body"),
        notebookField: document.getElementById("notebook-field"),
        notebook: document.getElementById("notebook"),
        slug: document.getElementById("slug"),
        date: document.getElementById("date"),
        tags: document.getElementById("tags"),
        draft: document.getElementById("draft"),
        hidden: document.getElementById("hidden"),
        path: document.getElementById("path"),
        imageFile: document.getElementById("image-file"),
        imageButton: document.getElementById("image-button"),
      };

      boot();

      function boot() {
        bind();
        loadNotebooks().then(function () {
          if (mode === "edit") return loadExisting();
          setupNewPost();
          return null;
        }).catch(function (error) {
          setStatus(error.message, true);
        });
      }

      function bind() {
        els.save.addEventListener("click", save);
        els.preview.addEventListener("click", function () {
          var url = previewUrl();
          if (url) window.open(url, "_blank", "noopener");
        });
        els.title.addEventListener("input", function () {
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
          resizeTitle();
        });
        els.slug.addEventListener("input", function () { slugTouched = true; });
        els.notebook.addEventListener("change", function () {
          if (mode === "new" && !slugTouched) {
            els.slug.value = slugify(els.title.value, currentSeparator());
          }
        });
        els.imageButton.addEventListener("click", function () { els.imageFile.click(); });
        els.imageFile.addEventListener("change", uploadImage);
        Array.from(document.querySelectorAll("[data-format]")).forEach(function (button) {
          button.addEventListener("click", function () { applyFormat(button.dataset.format); });
        });
      }

      function request(path, options) {
        return fetch(apiBase + path, options || {}).then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (payload) {
            if (!response.ok || payload.error) throw new Error(payload.error || "Author API error.");
            return payload;
          });
        });
      }

      function postJson(path, payload) {
        return request(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      function loadNotebooks() {
        return request("/notebooks").then(function (payload) {
          els.notebook.innerHTML = "";
          (payload.notebooks || []).forEach(function (notebook) {
            var option = document.createElement("option");
            option.value = notebook.path;
            option.textContent = notebook.title + " (" + notebook.lang + ")";
            option.selected = notebook.path === preferredNotebook;
            els.notebook.appendChild(option);
          });
        });
      }

      function setupNewPost() {
        els.notebookField.hidden = false;
        els.title.value = "";
        els.summary.value = "";
        els.body.value = "";
        els.date.value = today();
        els.draft.checked = true;
        els.hidden.checked = false;
        els.path.textContent = "";
        setStatus("New post");
        els.title.focus();
      }

      function loadExisting() {
        if (!sourcePath) throw new Error("Falta path para editar.");
        return request("/page?path=" + encodeURIComponent(sourcePath)).then(function (payload) {
          frontMatter = payload.frontMatter || {};
          savedUrl = payload.url || "";
          els.notebookField.hidden = true;
          els.title.value = frontMatter.title || "";
          els.slug.value = "";
          els.slug.disabled = true;
          els.date.value = frontMatter.date || today();
          els.tags.value = (frontMatter.tags || []).join(", ");
          els.summary.value = frontMatter.summary || frontMatter.description || "";
          els.draft.checked = frontMatter.draft === true;
          els.hidden.checked = frontMatter.hidden === true;
          els.body.value = payload.body || "";
          els.path.textContent = payload.path || "";
          setStatus("Editing " + (payload.path || ""));
          resizeTitle();
          els.body.focus();
        });
      }

      function save() {
        els.save.disabled = true;
        setStatus("Saving");
        var action = mode === "edit" ? saveExisting() : createPost();
        action.then(function (result) {
          sourcePath = result.path || sourcePath;
          savedUrl = result.url || savedUrl;
          mode = "edit";
          els.path.textContent = sourcePath;
          setStatus("Saved");
          var url = previewUrl();
          if (url) window.location.assign(url);
        }).catch(function (error) {
          setStatus(error.message, true);
        }).finally(function () {
          els.save.disabled = false;
        });
      }

      function createPost() {
        return postJson("/create-post", {
          notebook: els.notebook.value,
          title: els.title.value,
          slug: els.slug.value,
          date: els.date.value,
          tags: els.tags.value,
          summary: els.summary.value,
          draft: els.draft.checked,
          hidden: els.hidden.checked,
          body: els.body.value || "# " + els.title.value + "\\n",
        });
      }

      function saveExisting() {
        var nextFrontMatter = Object.assign({}, frontMatter, {
          title: els.title.value,
          date: els.date.value,
        });
        if (els.draft.checked) nextFrontMatter.draft = true; else delete nextFrontMatter.draft;
        if (els.hidden.checked) nextFrontMatter.hidden = true; else delete nextFrontMatter.hidden;
        if (kind === "notebook") {
          nextFrontMatter.description = els.summary.value;
        } else {
          nextFrontMatter.summary = els.summary.value;
          nextFrontMatter.tags = splitTags(els.tags.value);
        }
        return postJson("/save-page", {
          path: sourcePath,
          frontMatter: nextFrontMatter,
          body: els.body.value,
        }).then(function (result) {
          frontMatter = nextFrontMatter;
          return result;
        });
      }

      function uploadImage() {
        var file = els.imageFile.files && els.imageFile.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          postJson("/upload-image", {
            name: file.name,
            alt: file.name.replace(/\\.[^.]+$/, ""),
            data: reader.result,
          }).then(function (result) {
            insertAtCursor(result.markdown + "\\n");
            setStatus("Image added " + result.url);
          }).catch(function (error) {
            setStatus(error.message, true);
          }).finally(function () {
            els.imageFile.value = "";
          });
        };
        reader.readAsDataURL(file);
      }

      function insertAtCursor(text) {
        var start = els.body.selectionStart || 0;
        var end = els.body.selectionEnd || 0;
        var value = els.body.value;
        els.body.value = value.slice(0, start) + text + value.slice(end);
        els.body.focus();
        els.body.selectionStart = els.body.selectionEnd = start + text.length;
      }

      function applyFormat(format) {
        if (format === "bold") return wrapSelection("**", "**");
        if (format === "italic") return wrapSelection("_", "_");
        if (format === "heading") return prefixCurrentLine("## ");
        if (format === "quote") return prefixCurrentLine("> ");
        if (format === "ul") return prefixCurrentLine("- ");
        if (format === "ol") return prefixCurrentLine("1. ");
        if (format === "link") return wrapSelection("[", "](https://)");
      }

      function wrapSelection(before, after) {
        var start = els.body.selectionStart || 0;
        var end = els.body.selectionEnd || 0;
        var selected = els.body.value.slice(start, end) || "text";
        replaceBodyRange(start, end, before + selected + after, start + before.length, start + before.length + selected.length);
      }

      function prefixCurrentLine(prefix) {
        var cursor = els.body.selectionStart || 0;
        var lineStart = els.body.value.lastIndexOf("\\n", cursor - 1) + 1;
        replaceBodyRange(lineStart, lineStart, prefix, cursor + prefix.length, cursor + prefix.length);
      }

      function replaceBodyRange(start, end, text, selectionStart, selectionEnd) {
        els.body.value = els.body.value.slice(0, start) + text + els.body.value.slice(end);
        els.body.focus();
        els.body.selectionStart = selectionStart;
        els.body.selectionEnd = selectionEnd;
      }

      function previewUrl() {
        if (savedUrl) return siteOrigin + savedUrl;
        if (sourcePath) return siteOrigin + contentPathToUrl(sourcePath);
        return "";
      }

      function currentSeparator() {
        return els.notebook.value.endsWith("/posts") ? "_" : "-";
      }

      function slugify(value, separator) {
        return String(value || "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, separator)
          .replace(new RegExp(separator + "+", "g"), separator)
          .replace(new RegExp("^" + separator + "|" + separator + "$", "g"), "");
      }

      function splitTags(value) {
        return String(value || "").split(",").map(function (tag) { return tag.trim(); }).filter(Boolean);
      }

      function today() {
        return new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      }

      function contentPathToUrl(relativePath) {
        var lang = relativePath.indexOf("content_es/") === 0 ? "es" : "en";
        var root = lang === "es" ? "content_es" : "content_en";
        var route = relativePath.slice(root.length).replace(/\\.md$/, "");
        route = route.replace(/\\/index$/, "/").replace(/\\/_index$/, "/");
        if (route.charAt(0) !== "/") route = "/" + route;
        var url = (lang === "es" ? "/es" : "") + route;
        return url.charAt(url.length - 1) === "/" ? url : url + "/";
      }

      function resizeTitle() {
        els.title.style.height = "auto";
        els.title.style.height = els.title.scrollHeight + "px";
      }

      function setStatus(message, error) {
        els.status.textContent = message;
        els.status.classList.toggle("error", Boolean(error));
      }
    })();
  </script>
</body>
</html>`;
}

export function onRequestGet() {
  return htmlResponse(editorHtml());
}
