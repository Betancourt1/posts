(function () {
  "use strict";

  var activeRequest = null;
  var debounceTimer = null;

  function pageLanguage() {
    return (document.documentElement.lang || (location.pathname.indexOf("/es/") === 0 ? "es" : "en"))
      .toLowerCase()
      .split("-")[0];
  }

  function copyFor(lang) {
    return lang === "es"
      ? {
          placeholder: "Buscar en el sitio…",
          label: "Buscar",
          idle: "Escribe para buscar.",
          searching: "Buscando…",
          empty: "No se encontraron resultados.",
          one: "1 resultado",
          many: " resultados",
          error: "No fue posible cargar la búsqueda.",
        }
      : {
          placeholder: "Search the site…",
          label: "Search",
          idle: "Type to search.",
          searching: "Searching…",
          empty: "No results found.",
          one: "1 result",
          many: " results",
          error: "Search could not be loaded.",
        };
  }

  function resultList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];
    if (Array.isArray(payload.results)) return payload.results;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.documents)) return payload.documents;
    return [];
  }

  function resultValue(result, names, fallback) {
    for (var index = 0; index < names.length; index += 1) {
      var value = result && result[names[index]];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return fallback || "";
  }

  function createSearchUi(root, lang, copy) {
    root.textContent = "";

    var ui = document.createElement("div");
    ui.className = "pagefind-ui";

    var form = document.createElement("form");
    form.className = "pagefind-ui__form";
    form.setAttribute("role", "search");

    var input = document.createElement("input");
    input.className = "pagefind-ui__search-input";
    input.type = "search";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.placeholder = root.dataset.searchPlaceholder || copy.placeholder;
    input.setAttribute("aria-label", root.dataset.searchLabel || copy.label);

    var drawer = document.createElement("div");
    drawer.className = "pagefind-ui__drawer";

    var area = document.createElement("div");
    area.className = "pagefind-ui__results-area";

    var message = document.createElement("p");
    message.className = "pagefind-ui__message";
    message.setAttribute("aria-live", "polite");
    message.textContent = copy.idle;

    var results = document.createElement("ol");
    results.className = "pagefind-ui__results";

    area.appendChild(message);
    area.appendChild(results);
    drawer.appendChild(area);
    form.appendChild(input);
    ui.appendChild(form);
    ui.appendChild(drawer);
    root.appendChild(ui);

    return { form: form, input: input, message: message, results: results };
  }

  function renderResults(view, items, copy) {
    view.results.textContent = "";
    view.message.textContent = items.length === 0
      ? copy.empty
      : items.length === 1
        ? copy.one
        : items.length + copy.many;

    items.forEach(function (result) {
      var url = resultValue(result, ["url", "path", "route", "permalink"], "#");
      var title = resultValue(result, ["title", "name"], url);
      var excerpt = resultValue(result, ["excerpt", "summary", "snippet", "description", "body_text"]);

      var item = document.createElement("li");
      item.className = "pagefind-ui__result";

      var heading = document.createElement("p");
      heading.className = "pagefind-ui__result-title";

      var link = document.createElement("a");
      link.className = "pagefind-ui__result-link";
      link.href = url;
      link.textContent = title;
      heading.appendChild(link);
      item.appendChild(heading);

      if (excerpt) {
        var summary = document.createElement("p");
        summary.className = "pagefind-ui__result-excerpt";
        summary.textContent = excerpt;
        item.appendChild(summary);
      }

      view.results.appendChild(item);
    });
  }

  async function search(root, view, query, lang, copy) {
    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();
    view.message.textContent = copy.searching;
    view.results.textContent = "";

    var endpoint = root.dataset.searchEndpoint || "/api/search";
    var url = new URL(endpoint, location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("lang", lang);
    url.searchParams.set("limit", "20");

    try {
      var response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: activeRequest.signal,
      });
      if (!response.ok) throw new Error("Search returned " + response.status);
      renderResults(view, resultList(await response.json()), copy);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      view.message.textContent = copy.error;
    }
  }

  function setupModal(input) {
    var overlay = document.getElementById("search-modal-overlay");
    var modal = document.getElementById("search-modal");
    var trigger = document.getElementById("search-trigger");
    var closeButton = document.getElementById("search-modal-close");
    var previousFocus = null;
    if (!overlay || !modal) return;

    function open() {
      previousFocus = document.activeElement;
      overlay.removeAttribute("inert");
      overlay.setAttribute("aria-hidden", "false");
      overlay.classList.add("is-visible");
      document.body.classList.add("search-active");
      if (trigger) trigger.setAttribute("aria-expanded", "true");
      window.setTimeout(function () {
        input.focus();
        input.select();
      }, 60);
    }

    function close() {
      overlay.classList.remove("is-visible");
      overlay.setAttribute("aria-hidden", "true");
      overlay.setAttribute("inert", "");
      document.body.classList.remove("search-active");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      if (previousFocus && previousFocus.isConnected) previousFocus.focus();
      else if (trigger) trigger.focus();
      previousFocus = null;
    }

    if (trigger) trigger.addEventListener("click", open);
    if (closeButton) closeButton.addEventListener("click", close);
    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", function (event) {
      var target = event.target;
      var typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        overlay.classList.contains("is-visible") ? close() : open();
      } else if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
        close();
      } else if (event.key === "/" && !typing && !overlay.classList.contains("is-visible")) {
        event.preventDefault();
        open();
      }
    });
  }

  function init() {
    var root = document.getElementById("search");
    if (!root) return;

    var lang = pageLanguage();
    var copy = copyFor(lang);
    var view = createSearchUi(root, lang, copy);
    setupModal(view.input);

    view.form.addEventListener("submit", function (event) {
      event.preventDefault();
    });
    view.input.addEventListener("input", function () {
      window.clearTimeout(debounceTimer);
      var query = view.input.value.trim();
      if (!query) {
        if (activeRequest) activeRequest.abort();
        view.results.textContent = "";
        view.message.textContent = copy.idle;
        return;
      }
      debounceTimer = window.setTimeout(function () {
        search(root, view, query, lang, copy);
      }, 160);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
