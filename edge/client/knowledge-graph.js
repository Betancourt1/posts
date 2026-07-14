(function () {
  "use strict";

  function normalizedText(value) {
    var text = String(value || "").trim().toLowerCase();
    return typeof text.normalize === "function"
      ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      : text;
  }

  function language() {
    return (document.documentElement.lang || (location.pathname.indexOf("/es/") === 0 ? "es" : "en"))
      .toLowerCase()
      .split("-")[0];
  }

  function embeddedPayload() {
    var element = document.getElementById("knowledge-graph-data");
    if (!element || !element.textContent.trim()) return null;
    try {
      var payload = JSON.parse(element.textContent);
      return typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch (error) {
      return null;
    }
  }

  function graphFromPosts(payload, lang) {
    var posts = Array.isArray(payload && payload.posts) ? payload.posts : [];
    var tagLinks = payload && payload.tagLinks && typeof payload.tagLinks === "object"
      ? payload.tagLinks
      : {};
    var nodesById = new Map();
    var linksById = new Map();

    posts.forEach(function (post) {
      var tags = Array.isArray(post.tags) ? post.tags : [];
      var ids = tags.map(function (tag) {
        var label = String(tag || "").replace(/^#+/, "").trim();
        var id = "tag:" + normalizedText(label);
        if (!label || id === "tag:") return null;
        if (!nodesById.has(id)) {
          nodesById.set(id, {
            id: id,
            label: label,
            url: tagLinks[tag] || tagLinks[label] || (lang === "es" ? "/es/tags/" : "/tags/") + encodeURIComponent(label.toLowerCase()) + "/",
            section: "tags",
          });
        }
        return id;
      }).filter(Boolean);

      for (var left = 0; left < ids.length; left += 1) {
        for (var right = left + 1; right < ids.length; right += 1) {
          var pair = [ids[left], ids[right]].sort();
          var key = pair.join("\u0000");
          if (!linksById.has(key)) linksById.set(key, { source: pair[0], target: pair[1], weight: 0 });
          linksById.get(key).weight += 1;
        }
      }
    });

    return { nodes: Array.from(nodesById.values()), links: Array.from(linksById.values()) };
  }

  function normalizeGraph(payload, lang) {
    if (payload && payload.graph && typeof payload.graph === "object") payload = payload.graph;
    if (!payload || !Array.isArray(payload.nodes)) return graphFromPosts(payload || {}, lang);

    var nodesById = new Map();
    payload.nodes.forEach(function (raw, index) {
      var id = String(raw && (raw.id ?? raw.path ?? index));
      nodesById.set(id, {
        id: id,
        label: String((raw && (raw.title || raw.label || raw.name || raw.path)) || id),
        url: raw && (raw.path || raw.url || raw.route || raw.permalink) || null,
        section: String(raw && raw.section || ""),
      });
    });

    var links = (Array.isArray(payload.links) ? payload.links : []).flatMap(function (raw) {
      var source = raw && raw.source && typeof raw.source === "object" ? raw.source.id : raw && raw.source;
      var target = raw && raw.target && typeof raw.target === "object" ? raw.target.id : raw && raw.target;
      source = String(source ?? "");
      target = String(target ?? "");
      if (!nodesById.has(source) || !nodesById.has(target) || source === target) return [];
      return [{ source: source, target: target, type: raw.type || "link", weight: Number(raw.weight) || 1 }];
    });

    return { nodes: Array.from(nodesById.values()), links: links };
  }

  function filterToFocus(graph, focusTags) {
    var focusNames = new Set((Array.isArray(focusTags) ? focusTags : []).map(normalizedText).filter(Boolean));
    if (focusNames.size === 0) return graph;

    var focusIds = new Set(graph.nodes
      .filter(function (node) { return focusNames.has(normalizedText(node.label)); })
      .map(function (node) { return node.id; }));
    if (focusIds.size === 0) return graph;

    var includedIds = new Set(focusIds);
    var links = graph.links.filter(function (link) {
      if (!focusIds.has(link.source) && !focusIds.has(link.target)) return false;
      includedIds.add(link.source);
      includedIds.add(link.target);
      return true;
    });
    return {
      nodes: graph.nodes.filter(function (node) { return includedIds.has(node.id); }),
      links: links,
    };
  }

  function initCanvas(container, graph) {
    var tools = document.getElementById("knowledge-graph-tools");
    var searchBox = document.getElementById("graph-search");
    var searchInput = document.getElementById("graph-node-search");
    var searchStatus = document.getElementById("graph-search-status");
    var spacingInput = document.getElementById("graph-spacing");
    var labelsButton = document.getElementById("graph-toggle-labels");
    var maximizeButton = document.getElementById("graph-toggle-maximize");
    var section = container.closest(".home-graph");
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    if (!context) return;
    container.textContent = "";
    container.appendChild(canvas);

    var nodeById = new Map(graph.nodes.map(function (node) { return [node.id, node]; }));
    graph.links.forEach(function (link) {
      var source = nodeById.get(link.source);
      var target = nodeById.get(link.target);
      source.degree = (source.degree || 0) + 1;
      target.degree = (target.degree || 0) + 1;
      link.sourceNode = source;
      link.targetNode = target;
    });
    graph.nodes.sort(function (left, right) {
      return left.section.localeCompare(right.section) || (right.degree || 0) - (left.degree || 0) || left.id.localeCompare(right.id);
    });

    var state = {
      width: 0,
      height: 0,
      dpr: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      spacing: spacingInput ? Number(spacingInput.value) || 72 : 72,
      labels: false,
      hover: null,
      selected: null,
      maximized: false,
      pointerId: null,
      pointerX: 0,
      pointerY: 0,
      startOffsetX: 0,
      startOffsetY: 0,
      moved: false,
    };

    function css(name, fallback) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    }

    function placeNodes() {
      var radius = Math.max(80, Math.min(state.width, state.height) * 0.42) * state.spacing / 72;
      var count = Math.max(1, graph.nodes.length);
      graph.nodes.forEach(function (node, index) {
        var angle = index * 2.399963229728653;
        var distance = Math.sqrt((index + 0.5) / count) * radius;
        node.x = Math.cos(angle) * distance;
        node.y = Math.sin(angle) * distance;
        node.radius = 3.5 + Math.min(6.5, Math.sqrt(node.degree || 0));
      });
    }

    function resize(recenter) {
      var rect = container.getBoundingClientRect();
      state.width = Math.max(260, rect.width);
      state.height = Math.max(240, rect.height);
      canvas.width = Math.round(state.width * state.dpr);
      canvas.height = Math.round(state.height * state.dpr);
      canvas.style.width = state.width + "px";
      canvas.style.height = state.height + "px";
      placeNodes();
      if (recenter !== false) {
        state.offsetX = state.width / 2;
        state.offsetY = state.height / 2;
      }
      draw();
    }

    function screenPosition(node) {
      return {
        x: state.offsetX + node.x * state.zoom,
        y: state.offsetY + node.y * state.zoom,
      };
    }

    function draw() {
      var colors = {
        line: css("--line", "#2a2f36"),
        ink: css("--ink", "#cfcfd2"),
        dim: css("--ink-dim", "#a8abb2"),
        node: css("--graph-tag", css("--accent", "#4ecca3")),
        active: css("--graph-tag-hover", css("--accent-2", "#35b98f")),
        linkActive: css("--graph-link-active", "#f5f7fb"),
      };
      context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
      context.clearRect(0, 0, state.width, state.height);

      context.lineWidth = 0.7;
      graph.links.forEach(function (link) {
        var source = screenPosition(link.sourceNode);
        var target = screenPosition(link.targetNode);
        var active = state.hover && (link.sourceNode === state.hover || link.targetNode === state.hover);
        context.strokeStyle = active ? colors.linkActive : colors.line;
        context.globalAlpha = active ? 0.9 : 0.34;
        context.beginPath();
        context.moveTo(source.x, source.y);
        context.lineTo(target.x, target.y);
        context.stroke();
      });

      context.globalAlpha = 1;
      graph.nodes.forEach(function (node) {
        var point = screenPosition(node);
        var active = node === state.hover || node === state.selected;
        context.fillStyle = active ? colors.active : colors.node;
        context.beginPath();
        context.arc(point.x, point.y, Math.max(2.5, node.radius * Math.sqrt(state.zoom)), 0, Math.PI * 2);
        context.fill();

        if (state.labels || active) {
          context.font = active ? "600 12px ui-monospace, monospace" : "11px ui-monospace, monospace";
          context.fillStyle = active ? colors.ink : colors.dim;
          context.fillText(node.label, point.x + node.radius + 5, point.y - 4);
        }
      });
    }

    function eventPoint(event) {
      var rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function pick(point) {
      var best = null;
      var distance = Infinity;
      graph.nodes.forEach(function (node) {
        var screen = screenPosition(node);
        var next = Math.hypot(screen.x - point.x, screen.y - point.y);
        if (next <= Math.max(9, node.radius * state.zoom + 4) && next < distance) {
          best = node;
          distance = next;
        }
      });
      return best;
    }

    function center(node) {
      if (node) {
        state.offsetX = state.width / 2 - node.x * state.zoom;
        state.offsetY = state.height / 2 - node.y * state.zoom;
      } else {
        state.zoom = 1;
        state.offsetX = state.width / 2;
        state.offsetY = state.height / 2;
      }
      draw();
    }

    function findNode(cycle) {
      if (!searchInput) return;
      var query = normalizedText(searchInput.value);
      if (!query) {
        state.selected = null;
        if (searchStatus) searchStatus.textContent = "";
        center(null);
        return;
      }
      var matches = graph.nodes.filter(function (node) {
        return normalizedText(node.label).indexOf(query) !== -1;
      });
      var index = 0;
      if (cycle && state.selected && matches.length > 1) {
        index = (matches.indexOf(state.selected) + 1) % matches.length;
      }
      state.selected = matches[index] || null;
      if (searchStatus) {
        searchStatus.textContent = matches.length
          ? (index + 1) + " / " + matches.length
          : (language() === "es" ? "Sin coincidencias." : "No matches.");
      }
      if (state.selected) {
        state.zoom = Math.max(1.1, state.zoom);
        center(state.selected);
      } else draw();
    }

    canvas.addEventListener("pointerdown", function (event) {
      var point = eventPoint(event);
      state.pointerId = event.pointerId;
      state.pointerX = point.x;
      state.pointerY = point.y;
      state.startOffsetX = state.offsetX;
      state.startOffsetY = state.offsetY;
      state.moved = false;
      canvas.setPointerCapture(event.pointerId);
      container.classList.add("is-grabbing");
    });
    canvas.addEventListener("pointermove", function (event) {
      var point = eventPoint(event);
      if (state.pointerId === event.pointerId) {
        var dx = point.x - state.pointerX;
        var dy = point.y - state.pointerY;
        state.moved = state.moved || Math.hypot(dx, dy) > 3;
        state.offsetX = state.startOffsetX + dx;
        state.offsetY = state.startOffsetY + dy;
      } else {
        state.hover = pick(point);
        canvas.style.cursor = state.hover && state.hover.url ? "pointer" : "grab";
      }
      draw();
    });
    function release(event) {
      if (state.pointerId !== event.pointerId) return;
      state.pointerId = null;
      container.classList.remove("is-grabbing");
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", release);
    canvas.addEventListener("click", function (event) {
      if (state.moved) return;
      var node = pick(eventPoint(event));
      if (node && node.url) location.assign(node.url);
    });
    canvas.addEventListener("wheel", function (event) {
      event.preventDefault();
      var point = eventPoint(event);
      var oldZoom = state.zoom;
      var nextZoom = Math.max(0.45, Math.min(2.5, oldZoom * Math.exp(-event.deltaY * 0.0012)));
      var worldX = (point.x - state.offsetX) / oldZoom;
      var worldY = (point.y - state.offsetY) / oldZoom;
      state.zoom = nextZoom;
      state.offsetX = point.x - worldX * nextZoom;
      state.offsetY = point.y - worldY * nextZoom;
      draw();
    }, { passive: false });

    if (spacingInput) spacingInput.addEventListener("input", function () {
      state.spacing = Number(spacingInput.value) || 72;
      placeNodes();
      center(null);
    });
    if (searchInput) {
      searchInput.addEventListener("input", function () { findNode(false); });
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          findNode(true);
        }
      });
    }
    if (tools) tools.addEventListener("click", function (event) {
      var button = event.target.closest("[data-graph-action]");
      if (!button) return;
      var action = button.getAttribute("data-graph-action");
      if (action === "reset-view") center(null);
      if (action === "toggle-labels") {
        state.labels = !state.labels;
        button.classList.toggle("is-active", state.labels);
        button.setAttribute("aria-pressed", String(state.labels));
        draw();
      }
      if (action === "toggle-maximize" && section) {
        state.maximized = !state.maximized;
        section.classList.toggle("is-maximized", state.maximized);
        document.body.classList.toggle("graph-maximized", state.maximized);
        button.classList.toggle("is-active", state.maximized);
        button.setAttribute("aria-pressed", String(state.maximized));
        if (searchBox) searchBox.classList.toggle("is-visible", state.maximized);
        window.setTimeout(function () {
          resize();
          if (state.maximized && searchInput) searchInput.focus();
        }, 0);
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.maximized && maximizeButton) maximizeButton.click();
    });

    var observer = typeof ResizeObserver === "function" ? new ResizeObserver(function () { resize(false); }) : null;
    if (observer) observer.observe(container);
    else window.addEventListener("resize", function () { resize(false); });
    new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    resize();
  }

  async function init() {
    var container = document.getElementById("knowledge-graph");
    if (!container) return;
    container.textContent = "";
    var loading = document.createElement("p");
    loading.className = "knowledge-graph-empty";
    loading.textContent = language() === "es" ? "Cargando grafo…" : "Loading graph…";
    container.appendChild(loading);

    var endpoint = container.dataset.graphEndpoint || "/api/graph";
    var url = new URL(endpoint, location.origin);
    url.searchParams.set("lang", language());
    var fallbackPayload = embeddedPayload();
    var payload = null;
    try {
      var response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Graph returned " + response.status);
      payload = await response.json();
    } catch (error) {
      payload = fallbackPayload;
    }

    var graph = normalizeGraph(payload, language());
    if (container.closest(".sidebar-graph")) {
      graph = filterToFocus(graph, fallbackPayload && fallbackPayload.focusTags);
    }
    if (graph.nodes.length === 0) {
      loading.textContent = language() === "es"
        ? "Aún no hay contenido suficiente para construir el grafo."
        : "There is not enough content to build the graph yet.";
      return;
    }
    initCanvas(container, graph);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
