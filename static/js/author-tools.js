(function () {
  var root = document.getElementById("author-tools");

  if (!root) {
    return;
  }

  var apiBase = root.dataset.api || "http://127.0.0.1:3001";
  var state = {
    notebooks: [],
    notebooksLoaded: false,
    currentPath: root.dataset.sourcePath || "",
    currentNotebook: null,
    editorPath: "",
    editorFrontMatter: {},
    editorKind: "post",
  };
  var elements = {
    status: document.getElementById("author-status"),
    modal: document.getElementById("author-modal"),
    modalTitle: document.getElementById("author-modal-title"),
    modalBody: document.getElementById("author-modal-body"),
    close: document.getElementById("author-close"),
    imageInput: document.getElementById("author-image-input"),
    toast: document.getElementById("author-toast"),
  };

  bind();
  boot();

  function bind() {
    document.querySelectorAll("[data-author-action]").forEach(function (button) {
      button.addEventListener("click", handleAuthorAction);
    });

    if (elements.close) {
      elements.close.addEventListener("click", closeModal);
    }
    if (elements.modal) {
      elements.modal.addEventListener("click", function (event) {
        if (event.target === elements.modal) {
          closeModal();
        }
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && elements.modal && !elements.modal.hidden) {
        closeModal();
      }
    });

    elements.imageInput.addEventListener("change", uploadSelectedImage);
  }

  function handleAuthorAction(event) {
    var button = event.currentTarget;
    var action = button.dataset.authorAction;

    if (action === "add-notebook") {
      openNotebookForm();
      return;
    }

    ensureNotebooks().then(function () {
      if (action === "add-post") {
        openPostForm(button);
        return;
      }

      if (action === "add-image-post") {
        openPostForm(button, "image");
        return;
      }

      if (action === "edit-notebook") {
        editCurrentNotebook(button);
        return;
      }

      if (action === "edit-post") {
        editPost(button);
        return;
      }

      toast("Unknown author action.");
    }).catch(function (error) {
      toast(error.message);
    });
  }

  function boot() {
    request("/api/health")
      .then(function () {
        return loadNotebooks();
      })
      .then(function () {
        setStatus("ready", true);
      })
      .catch(function () {
        setStatus("offline", false);
        toast("Run npm run author to enable writing.");
      });
  }

  function request(path, options) {
    return fetch(apiBase + path, options || {}).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Author API error.");
        }

        return payload;
      });
    });
  }

  function postJson(path, payload) {
    return request(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  function isAdminPath() {
    return window.location.pathname === "/admin" || window.location.pathname.indexOf("/admin/") === 0;
  }

  function contentOrigin() {
    return window.location.origin + (isAdminPath() ? "/admin" : "");
  }

  function contentUrl(url) {
    if (!url || url.charAt(0) !== "/" || url.indexOf("//") === 0) {
      return url;
    }
    if (isAdminPath() && url.indexOf("/admin/") !== 0) {
      return "/admin" + url;
    }
    return url;
  }

  function setStatus(text, ready) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = text;
    elements.status.classList.toggle("is-ready", ready);
  }

  function toast(message) {
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () {
      elements.toast.hidden = true;
    }, 3600);
  }

  function loadNotebooks() {
    return request("/api/notebooks").then(function (payload) {
      state.notebooks = payload.notebooks || [];
      state.currentNotebook = findCurrentNotebook();
      state.notebooksLoaded = true;
    });
  }

  function ensureNotebooks() {
    if (state.notebooksLoaded) {
      return Promise.resolve();
    }

    return loadNotebooks();
  }

  function findCurrentNotebook() {
    var currentPath = state.currentPath;

    if (!currentPath) {
      return null;
    }

    return state.notebooks
      .slice()
      .sort(function (a, b) {
        return b.path.length - a.path.length;
      })
      .find(function (notebook) {
        return currentPath === notebook.indexPath || currentPath.indexOf(notebook.path + "/") === 0;
      }) || null;
  }

  function openModal(title, html) {
    elements.modalTitle.textContent = title;
    elements.modalBody.innerHTML = html;
    elements.modal.hidden = false;
  }

  function closeModal() {
    elements.modal.hidden = true;
    elements.modalBody.innerHTML = "";
    state.editorPath = "";
    state.editorFrontMatter = {};
  }

  function openNotebookForm() {
    openModal("Add Notebook", [
      '<form class="author-form" id="author-notebook-form">',
      label("Language", '<select name="lang"><option value="es">Spanish</option><option value="en">English</option></select>'),
      label("Title", '<input name="title" type="text" required />'),
      label("Slug", '<input name="slug" type="text" />'),
      label("Description", '<input name="description" type="text" />'),
      checkbox("draft", "Draft", true),
      checkbox("hidden", "Hidden", false),
      '<div class="author-form-actions"><button type="submit">Create Notebook</button></div>',
      "</form>",
    ].join(""));

    var form = document.getElementById("author-notebook-form");
    var titleInput = form.elements.title;
    var slugInput = form.elements.slug;

    bindSlug(titleInput, slugInput, "-");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      postJson("/api/create-notebook", {
        lang: form.elements.lang.value,
        title: titleInput.value,
        slug: slugInput.value,
        description: form.elements.description.value,
        draft: form.elements.draft.checked,
        hidden: form.elements.hidden.checked,
      }).then(function (result) {
        toast("Notebook created.");
        closeModal();
        loadNotebooks();
        openWhenReady(result.url);
      }).catch(function (error) {
        toast(error.message);
      });
    });
  }

  function openPostForm(trigger, format) {
    var notebook = trigger && trigger.dataset.notebook
      ? trigger.dataset.notebook
      : state.currentNotebook
        ? state.currentNotebook.path
        : "content_es/posts";

    openEditor({
      mode: "new",
      notebook: notebook,
      format: format,
    });
  }

  function editCurrentNotebook(trigger) {
    var notebook = trigger && trigger.dataset.sourcePath
      ? { indexPath: trigger.dataset.sourcePath }
      : state.currentNotebook;

    if (!notebook && state.currentPath && state.currentPath.endsWith("_index.md")) {
      notebook = { indexPath: state.currentPath };
    }

    if (!notebook) {
      toast("No current notebook found.");
      return;
    }

    openEditor({
      mode: "edit",
      kind: "notebook",
      path: notebook.indexPath,
    });
  }

  function editPost(trigger) {
    var path = trigger && trigger.dataset.sourcePath ? trigger.dataset.sourcePath : state.currentPath;

    if (!path) {
      toast("No source file for this page.");
      return;
    }

    if (path.endsWith("_index.md")) {
      toast("This is a notebook page. Use Edit Current Notebook.");
      return;
    }

    openEditor({
      mode: "edit",
      kind: "post",
      path: path,
    });
  }

  function openEditor(params) {
    var theme = document.documentElement.getAttribute("data-theme") || "dark";

    try {
      theme = localStorage.getItem("site_theme") || theme;
    } catch (error) {
      theme = theme || "dark";
    }

    var query = new URLSearchParams({
      mode: params.mode || "new",
      site: contentOrigin(),
      theme: theme === "light" ? "light" : "dark",
    });

    if (params.path) {
      query.set("path", params.path);
    }
    if (params.kind) {
      query.set("kind", params.kind);
    }
    if (params.notebook) {
      query.set("notebook", params.notebook);
    }
    if (params.format) {
      query.set("format", params.format);
    }

    window.location.assign(apiBase + "/editor?" + query.toString());
  }

  function openExistingEditor(path, title, kind) {
    request("/api/page?path=" + encodeURIComponent(path)).then(function (payload) {
      var frontMatter = payload.frontMatter || {};

      state.editorPath = payload.path;
      state.editorFrontMatter = frontMatter;
      state.editorKind = kind;
      openModal(title, editorHtml({
        mode: "edit",
        title: frontMatter.title || "",
        slug: "",
        date: frontMatter.date || today(),
        tags: (frontMatter.tags || []).join(", "),
        summary: frontMatter.summary || frontMatter.description || "",
        draft: frontMatter.draft === true,
        hidden: frontMatter.hidden === true,
        body: payload.body || "",
      }));
      wireEditorForm("edit");
    }).catch(function (error) {
      toast(error.message);
    });
  }

  function editorHtml(data) {
    var notebookField = data.mode === "new"
      ? label("Notebook", '<select name="notebook">' + data.notebookOptions + "</select>")
      : '<input name="path" type="hidden" value="' + escapeHtml(state.editorPath) + '" />';

    return [
      '<form class="author-form author-editor-form" id="author-editor-form">',
      notebookField,
      '<div class="author-grid">',
      label("Title", '<input name="title" type="text" value="' + escapeHtml(data.title) + '" required />'),
      label("Slug", '<input name="slug" type="text" value="' + escapeHtml(data.slug) + '"' + (data.mode === "edit" ? " disabled" : "") + " />"),
      label("Date", '<input name="date" type="date" value="' + escapeHtml(data.date) + '" />'),
      label("Tags", '<input name="tags" type="text" value="' + escapeHtml(data.tags) + '" placeholder="ensayo, politica" />'),
      "</div>",
      label("Summary / Description", '<input name="summary" type="text" value="' + escapeHtml(data.summary) + '" />'),
      '<div class="author-check-row">',
      checkbox("draft", "Draft", data.draft),
      checkbox("hidden", "Hidden", data.hidden),
      "</div>",
      '<div class="author-editor-toolbar"><button type="button" id="author-editor-image">Add Image</button></div>',
      '<textarea name="body" class="author-body-editor" spellcheck="true">' + escapeHtml(data.body) + "</textarea>",
      '<div class="author-form-actions"><button type="submit">' + (data.mode === "edit" ? "Save Changes" : "Create Post") + "</button></div>",
      "</form>",
    ].join("");
  }

  function wireEditorForm(mode) {
    var form = document.getElementById("author-editor-form");
    var titleInput = form.elements.title;
    var slugInput = form.elements.slug;
    var notebookSelect = form.elements.notebook;
    var imageButton = document.getElementById("author-editor-image");

    if (mode === "new") {
      bindSlug(titleInput, slugInput, notebookSelect.value.endsWith("/posts") ? "_" : "-");
      notebookSelect.addEventListener("change", function () {
        if (!slugInput.dataset.touched) {
          slugInput.value = slugify(titleInput.value, notebookSelect.value.endsWith("/posts") ? "_" : "-");
        }
      });
    }

    imageButton.addEventListener("click", function () {
      elements.imageInput.click();
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (mode === "new") {
        saveNewPost(form);
      } else {
        saveExistingPage(form);
      }
    });
  }

  function saveNewPost(form) {
    postJson("/api/create-post", {
      notebook: form.elements.notebook.value,
      title: form.elements.title.value,
      slug: form.elements.slug.value,
      date: form.elements.date.value,
      tags: form.elements.tags.value,
      summary: form.elements.summary.value,
      draft: form.elements.draft.checked,
      hidden: form.elements.hidden.checked,
      body: form.elements.body.value || "# " + form.elements.title.value + "\n",
    }).then(function (result) {
      toast("Post created.");
      closeModal();
      openWhenReady(result.url);
    }).catch(function (error) {
      toast(error.message);
    });
  }

  function saveExistingPage(form) {
    var frontMatter = Object.assign({}, state.editorFrontMatter, {
      title: form.elements.title.value,
      date: form.elements.date.value,
    });

    if (form.elements.draft.checked) {
      frontMatter.draft = true;
    } else {
      delete frontMatter.draft;
    }

    if (form.elements.hidden.checked) {
      frontMatter.hidden = true;
    } else {
      delete frontMatter.hidden;
    }

    if (state.editorKind === "notebook") {
      frontMatter.description = form.elements.summary.value;
    } else {
      frontMatter.summary = form.elements.summary.value;
      frontMatter.tags = splitTags(form.elements.tags.value);
    }

    postJson("/api/save-page", {
      path: state.editorPath,
      frontMatter: frontMatter,
      body: form.elements.body.value,
    }).then(function () {
      toast("Saved.");
      closeModal();
      window.setTimeout(function () {
        window.location.reload();
      }, 250);
    }).catch(function (error) {
      toast(error.message);
    });
  }

  function uploadSelectedImage() {
    var file = elements.imageInput.files && elements.imageInput.files[0];

    if (!file) {
      return;
    }

    var reader = new FileReader();

    reader.onload = function () {
      postJson("/api/upload-image", {
        name: file.name,
        alt: file.name.replace(/\.[^.]+$/, ""),
        data: reader.result,
      }).then(function (result) {
        insertMarkdown(result.markdown);
        toast("Image added: " + result.url);
      }).catch(function (error) {
        toast(error.message);
      }).finally(function () {
        elements.imageInput.value = "";
      });
    };

    reader.readAsDataURL(file);
  }

  function insertMarkdown(markdown) {
    var textarea = document.querySelector(".author-body-editor");

    if (!textarea) {
      navigator.clipboard && navigator.clipboard.writeText(markdown);
      toast("Image markdown copied.");
      return;
    }

    var start = textarea.selectionStart || 0;
    var end = textarea.selectionEnd || 0;
    var value = textarea.value;
    var prefix = value.slice(0, start);
    var suffix = value.slice(end);
    var insert = (prefix && !prefix.endsWith("\n") ? "\n\n" : "") + markdown + "\n";

    textarea.value = prefix + insert + suffix;
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = (prefix + insert).length;
  }

  function openWhenReady(url) {
    var targetUrl = contentUrl(url);
    var deadline = Date.now() + 8000;

    function retry() {
      window.setTimeout(check, 350);
    }

    function check() {
      fetch(targetUrl, { cache: "no-store" })
        .then(function (response) {
          if (response.ok) {
            window.location.href = targetUrl;
            return;
          }

          if (Date.now() < deadline) {
            retry();
            return;
          }

          window.location.href = targetUrl;
        })
        .catch(function () {
          if (Date.now() < deadline) {
            retry();
            return;
          }

          window.location.href = targetUrl;
        });
    }

    check();
  }

  function label(text, control) {
    return '<label class="author-field"><span>' + text + "</span>" + control + "</label>";
  }

  function checkbox(name, text, checked) {
    return '<label class="author-check"><input name="' + name + '" type="checkbox"' + (checked ? " checked" : "") + " /> <span>" + text + "</span></label>";
  }

  function bindSlug(titleInput, slugInput, separator) {
    titleInput.addEventListener("input", function () {
      if (!slugInput.dataset.touched) {
        slugInput.value = slugify(titleInput.value, separator);
      }
    });
    slugInput.addEventListener("input", function () {
      slugInput.dataset.touched = "true";
    });
  }

  function slugify(value, separator) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, separator)
      .replace(new RegExp(separator + "+", "g"), separator)
      .replace(new RegExp("^" + separator + "|" + separator + "$", "g"), "");
  }

  function splitTags(value) {
    return String(value || "")
      .split(",")
      .map(function (tag) {
        return tag.trim();
      })
      .filter(Boolean);
  }

  function today() {
    return new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Mexico_City",
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
