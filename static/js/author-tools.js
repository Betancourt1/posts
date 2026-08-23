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
  };
  var elements = {
    status: document.getElementById("author-status"),
    modal: document.getElementById("author-modal"),
    modalTitle: document.getElementById("author-modal-title"),
    modalBody: document.getElementById("author-modal-body"),
    close: document.getElementById("author-close"),
    toast: document.getElementById("author-toast"),
  };
  var actionFeedback = {
    "add-notebook": "Nuevo notebook",
    "add-post": "Abriendo editor",
    "add-image-post": "Abriendo imagen",
    "edit-home": "Abriendo inicio",
    "edit-notebook": "Abriendo notebook",
    "edit-post": "Abriendo post",
    "create-notebook-channel": "Sincronizando Are.na",
    "delete-post": "Preparando eliminación",
    "delete-notebook": "Preparando eliminación",
  };

  bind();
  boot();

  function bind() {
    document.querySelectorAll("[data-author-action]").forEach(function (button) {
      button.addEventListener("click", handleAuthorAction);
    });

    document.addEventListener("click", function (event) {
      document.querySelectorAll(".author-more-actions[open]").forEach(function (menu) {
        if (!menu.contains(event.target)) {
          menu.open = false;
        }
      });
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
  }

  function handleAuthorAction(event) {
    var button = event.currentTarget;
    var action = button.dataset.authorAction;
    var clearBusy = null;

    pulseButton(button);

    if (action === "add-notebook") {
      openNotebookForm();
      return;
    }

    clearBusy = setIconBusy(button, actionFeedback[action]);

    ensureNotebooks().then(function () {
      if (action === "add-post") {
        return openPostForm(button);
      }

      if (action === "add-image-post") {
        return openImagePostForm(button);
      }

      if (action === "edit-notebook") {
        return editCurrentNotebook(button);
      }

      if (action === "edit-home") {
        return editCurrentNotebook(button);
      }

      if (action === "edit-post") {
        return editPost(button);
      }

      if (action === "create-notebook-channel") {
        return createNotebookChannel();
      }

      if (action === "delete-post") {
        return openDeletePostForm(button);
      }

      if (action === "delete-notebook") {
        return openDeleteNotebookForm(button);
      }

      toast("Acción de autor desconocida.");
      return false;
    }).then(function (keepBusy) {
      if (!keepBusy && clearBusy) {
        clearBusy();
      }
    }).catch(function (error) {
      if (clearBusy) {
        clearBusy();
      }
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
        toast("La API del autor no está disponible.");
      });
  }

  function request(path, options) {
    return fetch(apiBase + path, options || {}).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (payload) {
        if (!response.ok || payload.error) {
          throw new Error(payload.error || "Error de la API del autor.");
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

  function pulseButton(button) {
    if (!button) {
      return;
    }

    button.classList.add("is-pressed");
    window.setTimeout(function () {
      button.classList.remove("is-pressed");
    }, 160);
  }

  function setIconBusy(button, label) {
    if (!button) {
      return null;
    }

    var oldLabel = button.getAttribute("aria-label");
    var oldTitle = button.getAttribute("title");
    button.classList.add("is-busy");
    button.setAttribute("aria-busy", "true");
    if (label) {
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
    }

    return function () {
      button.classList.remove("is-busy");
      button.removeAttribute("aria-busy");
      if (oldLabel) {
        button.setAttribute("aria-label", oldLabel);
      } else {
        button.removeAttribute("aria-label");
      }
      if (oldTitle) {
        button.setAttribute("title", oldTitle);
      } else {
        button.removeAttribute("title");
      }
    };
  }

  function setSubmitBusy(form, label) {
    var button = form && form.querySelector('button[type="submit"]');

    if (!button) {
      return function () {};
    }

    var oldText = button.textContent;
    var wasDisabled = button.disabled;
    button.disabled = true;
    button.classList.add("is-busy");
    button.setAttribute("aria-busy", "true");
    button.textContent = label;

    return function () {
      button.disabled = wasDisabled;
      button.classList.remove("is-busy");
      button.removeAttribute("aria-busy");
      button.textContent = oldText;
    };
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
  }

  function openNotebookForm() {
    openModal("Agregar notebook", [
      '<form class="author-form" id="author-notebook-form">',
      label("Idioma", '<select name="lang"><option value="es">Español</option><option value="en">Inglés</option></select>'),
      label("Título", '<input name="title" type="text" required />'),
      label("Ruta", '<input name="slug" type="text" />'),
      label("Descripción", '<input name="description" type="text" />'),
      checkbox("draft", "Borrador", true),
      checkbox("hidden", "Oculto", false),
      '<div class="author-form-actions"><button type="submit">Crear notebook</button></div>',
      "</form>",
    ].join(""));

    var form = document.getElementById("author-notebook-form");
    var titleInput = form.elements.title;
    var slugInput = form.elements.slug;

    bindSlug(titleInput, slugInput, "-");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var clearBusy = setSubmitBusy(form, "Creando...");
      postJson("/api/create-notebook", {
        lang: form.elements.lang.value,
        title: titleInput.value,
        slug: slugInput.value,
        description: form.elements.description.value,
        draft: form.elements.draft.checked,
        hidden: form.elements.hidden.checked,
      }).then(function (result) {
        toast("Notebook creado.");
        closeModal();
        loadNotebooks();
        openWhenReady(result.url);
      }).catch(function (error) {
        toast(error.message);
      }).finally(function () {
        clearBusy();
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
      template: trigger && trigger.dataset.editorTemplate ? trigger.dataset.editorTemplate : "",
    });
    return true;
  }

  function openImagePostForm(trigger) {
    var notebook = trigger && trigger.dataset.notebook
      ? trigger.dataset.notebook
      : state.currentNotebook
        ? state.currentNotebook.path
        : "content_es/posts";

    openImageEditor({
      notebook: notebook,
    });
    return true;
  }

  function editCurrentNotebook(trigger) {
    var notebook = trigger && trigger.dataset.sourcePath
      ? { indexPath: trigger.dataset.sourcePath }
      : state.currentNotebook;

    if (!notebook && state.currentPath && state.currentPath.endsWith("_index.md")) {
      notebook = { indexPath: state.currentPath };
    }

    if (!notebook) {
      toast("No se encontró el notebook actual.");
      return false;
    }

    openEditor({
      mode: "edit",
      kind: "notebook",
      path: notebook.indexPath,
    });
    return true;
  }

  function editPost(trigger) {
    var path = trigger && trigger.dataset.sourcePath ? trigger.dataset.sourcePath : state.currentPath;

    if (!path) {
      toast("Esta página no tiene archivo fuente.");
      return false;
    }

    if (path.endsWith("_index.md")) {
      toast("Esta es una página de notebook. Usa Editar notebook.");
      return false;
    }

    openEditor({
      mode: "edit",
      kind: "post",
      path: path,
      template: /^content_(?:en\/books|es\/libros)\//.test(path) ? "book" : "",
    });
    return true;
  }

  function openDeletePostForm(trigger) {
    var path = trigger && trigger.dataset.sourcePath ? trigger.dataset.sourcePath : state.currentPath;

    if (!path) {
      toast("Esta página no tiene archivo fuente.");
      return false;
    }

    if (path.endsWith("_index.md")) {
      toast("Esta es una página de notebook. Usa Eliminar notebook.");
      return false;
    }

    return request("/api/page?path=" + encodeURIComponent(path)).then(function (payload) {
      var frontMatter = payload.frontMatter || {};
      openDeleteForm({
        type: "page",
        endpoint: "/api/delete-page",
        path: payload.path,
        title: frontMatter.title || payload.path,
        label: "post",
        imageCopy: "Borrar también las imágenes adjuntas a este post.",
      });
    });
  }

  function openDeleteNotebookForm(trigger) {
    var notebook = trigger && trigger.dataset.sourcePath
      ? { indexPath: trigger.dataset.sourcePath, path: trigger.dataset.sourcePath.replace(/\/_index\.md$/, "") }
      : state.currentNotebook;

    if (!notebook && state.currentPath && state.currentPath.endsWith("_index.md")) {
      notebook = {
        indexPath: state.currentPath,
        path: state.currentPath.replace(/\/_index\.md$/, ""),
      };
    }

    if (!notebook) {
      toast("No se encontró el notebook actual.");
      return false;
    }

    return request("/api/page?path=" + encodeURIComponent(notebook.indexPath)).then(function (payload) {
      var frontMatter = payload.frontMatter || {};
      openDeleteForm({
        type: "notebook",
        endpoint: "/api/delete-notebook",
        path: notebook.path,
        title: frontMatter.title || notebook.path,
        label: "notebook",
        imageCopy: "Borrar también las imágenes referenciadas por sus páginas.",
      });
    });
  }

  function openDeleteForm(options) {
    openModal("Eliminar " + options.label, [
      '<form class="author-form author-delete-form" id="author-delete-form">',
      '<p class="author-delete-copy">Vas a eliminar <strong>' + escapeHtml(options.title) + '</strong>.</p>',
      '<p class="author-path">' + escapeHtml(options.path) + '</p>',
      checkbox("deleteImages", options.imageCopy, false),
      label("Confirmacion", '<input name="confirm" type="text" autocomplete="off" placeholder="Escribe BORRAR" required />'),
      '<div class="author-form-actions author-form-actions--split">',
      '<button type="button" id="author-delete-cancel">Cancelar</button>',
      '<button type="submit" class="author-danger-button">Eliminar</button>',
      '</div>',
      "</form>",
    ].join(""));

    var form = document.getElementById("author-delete-form");
    var cancel = document.getElementById("author-delete-cancel");

    cancel.addEventListener("click", closeModal);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.elements.confirm.value.trim() !== "BORRAR") {
        toast("Escribe BORRAR para confirmar.");
        return;
      }

      var clearBusy = setSubmitBusy(form, "Eliminando...");
      postJson(options.endpoint, {
        path: options.path,
        deleteImages: form.elements.deleteImages.checked,
      }).then(function (result) {
        toast("Eliminado.");
        closeModal();
        window.location.href = contentUrl(result.url || fallbackContentUrl());
      }).catch(function (error) {
        toast(error.message);
      }).finally(function () {
        clearBusy();
      });
    });
  }

  function openEditor(params) {
    var theme = document.documentElement.getAttribute("data-theme") || "dark";
    var grayscale = false;

    try {
      theme = localStorage.getItem("site_theme") || theme;
      grayscale = localStorage.getItem("grayscale_mode_enabled") === "true";
    } catch (error) {
      theme = theme || "dark";
    }

    var query = new URLSearchParams({
      mode: params.mode || "new",
      site: contentOrigin(),
      theme: theme === "light" ? "light" : "dark",
      grayscale: grayscale ? "true" : "false",
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
    if (params.template) {
      query.set("template", params.template);
    }

    window.location.assign(apiBase + "/editor?" + query.toString());
  }

  function createNotebookChannel() {
    if (!state.currentPath || !state.currentPath.endsWith("/_index.md")) {
      throw new Error("No se encontró la ruta de este notebook.");
    }
    if (!window.confirm("Se creará o actualizará un channel de Are.na con las publicaciones públicas de este notebook. ¿Continuar?")) {
      return false;
    }

    toast("Sincronizando notebook con Are.na...");
    return postJson("/api/create-notebook-channel", { path: state.currentPath }).then(function (result) {
      var channel = result.channel || {};
      var failures = Array.isArray(result.failures) ? result.failures.length : 0;
      var message = String(result.synced || 0) + "/" + String(result.total || 0) + " publicaciones sincronizadas";
      if (failures) {
        message += "; " + failures + " necesitan reintento";
      }
      toast(message + (channel.title ? " en " + channel.title + "." : "."));
      return false;
    });
  }

  function openImageEditor(params) {
    var theme = document.documentElement.getAttribute("data-theme") || "dark";
    var grayscale = false;

    try {
      theme = localStorage.getItem("site_theme") || theme;
      grayscale = localStorage.getItem("grayscale_mode_enabled") === "true";
    } catch (error) {
      theme = theme || "dark";
    }

    var query = new URLSearchParams({
      site: contentOrigin(),
      theme: theme === "light" ? "light" : "dark",
      grayscale: grayscale ? "true" : "false",
    });

    if (params.notebook) {
      query.set("notebook", params.notebook);
    }

    window.location.assign(apiBase + "/image-editor?" + query.toString());
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

  function fallbackContentUrl() {
    return root.dataset.lang === "es" ? "/es/" : "/";
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
