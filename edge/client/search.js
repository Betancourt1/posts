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

  function searchView(root) {
    return {
      form: root.querySelector(".search-ui__form"),
      input: root.querySelector(".search-ui__search-input"),
      drawer: root.querySelector(".search-ui__drawer"),
      message: root.querySelector(".search-ui__message"),
      results: root.querySelector(".search-ui__results"),
    };
  }

  function setResultsOpen(view, open) {
    view.drawer.hidden = !open;
    view.input.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function clearSearch(view, copy) {
    window.clearTimeout(debounceTimer);
    if (activeRequest) activeRequest.abort();
    view.input.value = "";
    view.results.textContent = "";
    view.message.textContent = copy.idle;
    setResultsOpen(view, false);
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
      item.className = "search-ui__result";

      var heading = document.createElement("p");
      heading.className = "search-ui__result-title";

      var link = document.createElement("a");
      link.className = "search-ui__result-link";
      link.href = url;
      link.textContent = title;
      heading.appendChild(link);
      item.appendChild(heading);

      if (excerpt) {
        var summary = document.createElement("p");
        summary.className = "search-ui__result-excerpt";
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

  function setupKeyboard(root, view, copy) {
    document.addEventListener("keydown", function (event) {
      var target = event.target;
      var typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        view.input.focus();
        view.input.select();
        if (view.input.value.trim()) setResultsOpen(view, true);
      } else if (event.key === "Escape" && (document.activeElement === view.input || !view.drawer.hidden)) {
        event.preventDefault();
        clearSearch(view, copy);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        view.input.focus();
        view.input.select();
        if (view.input.value.trim()) setResultsOpen(view, true);
      }
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) setResultsOpen(view, false);
    });
  }

  function init() {
    var root = document.getElementById("search");
    if (!root) return;

    var lang = pageLanguage();
    var copy = copyFor(lang);
    var view = searchView(root);
    if (!view.form || !view.input || !view.drawer || !view.message || !view.results) return;
    setupKeyboard(root, view, copy);

    view.form.addEventListener("submit", function (event) {
      event.preventDefault();
      window.clearTimeout(debounceTimer);
      var query = view.input.value.trim();
      if (!query) return clearSearch(view, copy);
      setResultsOpen(view, true);
      search(root, view, query, lang, copy);
    });
    view.input.addEventListener("input", function () {
      window.clearTimeout(debounceTimer);
      var query = view.input.value.trim();
      if (!query) {
        clearSearch(view, copy);
        return;
      }
      if (activeRequest) activeRequest.abort();
      view.results.textContent = "";
      view.message.textContent = copy.searching;
      setResultsOpen(view, true);
      debounceTimer = window.setTimeout(function () {
        search(root, view, query, lang, copy);
      }, 160);
    });
    view.input.addEventListener("focus", function () {
      if (view.input.value.trim()) setResultsOpen(view, true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
