(function () {
  "use strict";

  function toTagName(value) {
    if (typeof value !== "string") {
      return "";
    }
    var normalized = value.replace(/^#+/, "").trim().replace(/\s+/g, " ").toLowerCase();
    if (typeof normalized.normalize === "function") {
      normalized = normalized.normalize("NFC");
    }
    return normalized;
  }

  function normalizeSearchText(value) {
    if (typeof value !== "string") {
      return "";
    }
    var normalized = value.trim().toLowerCase();
    if (typeof normalized.normalize === "function") {
      normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return normalized;
  }

  function shouldSkipTag(tag) {
    return tag === "nota" || tag === "zettelkasten" || tag === "cita";
  }

  function cleanTagList(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }

    var seen = new Set();
    var cleanTags = [];
    tags.forEach(function (rawTag) {
      var tag = toTagName(rawTag);
      if (!tag || seen.has(tag) || shouldSkipTag(tag)) {
        return;
      }
      seen.add(tag);
      cleanTags.push(tag);
    });
    return cleanTags;
  }

  function normalizePayload(parsed) {
    try {
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        tagLinks: parsed.tagLinks && typeof parsed.tagLinks === "object" ? parsed.tagLinks : {},
        focusTags: Array.isArray(parsed.focusTags) ? parsed.focusTags : []
      };
    } catch (error) {
      return { posts: [], tagLinks: {}, focusTags: [] };
    }
  }

  function parsePayload(scriptEl) {
    if (!scriptEl) {
      return normalizePayload({});
    }

    try {
      return normalizePayload(JSON.parse(scriptEl.textContent || "{}"));
    } catch (error) {
      return normalizePayload({});
    }
  }

  function pageLanguage() {
    return (document.documentElement.lang || (location.pathname.indexOf("/es/") === 0 ? "es" : "en"))
      .toLowerCase()
      .split("-")[0];
  }

  function authorUrl(url) {
    if (
      location.pathname.indexOf("/admin/") !== 0 ||
      typeof url !== "string" ||
      url.indexOf("/") !== 0 ||
      url.indexOf("/admin/") === 0
    ) {
      return url;
    }
    return url === "/" ? "/admin/" : "/admin" + url;
  }

  async function loadPayload(container, dataEl) {
    var embedded = parsePayload(dataEl);
    if (embedded.posts.length > 0) {
      return embedded;
    }

    try {
      var endpoint = container.dataset.graphEndpoint || "/api/graph";
      var url = new URL(endpoint, location.origin);
      url.searchParams.set("lang", pageLanguage());
      url.searchParams.set("format", "posts");
      var response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) {
        return embedded;
      }
      var projected = normalizePayload(await response.json());
      projected.focusTags = embedded.focusTags;
      return projected;
    } catch (error) {
      return embedded;
    }
  }

  function buildGraph(posts, tagLinks) {
    var normalizedTagLinks = {};
    if (tagLinks && typeof tagLinks === "object") {
      Object.keys(tagLinks).forEach(function (tagName) {
        var normalizedTag = toTagName(tagName);
        if (!normalizedTag || typeof tagLinks[tagName] !== "string") {
          return;
        }
        normalizedTagLinks[normalizedTag] = authorUrl(tagLinks[tagName]);
      });
    }

    var tagCounts = new Map();
    var tagNodes = new Map();
    var linksByPair = new Map();

    function ensureTagNode(tag) {
      if (!tagNodes.has(tag)) {
        tagNodes.set(tag, {
          id: "tag:" + tag,
          label: tag,
          type: "tag",
          count: 0,
          radius: 0,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          neighbors: new Set(),
          url: typeof normalizedTagLinks[tag] === "string" ? normalizedTagLinks[tag] : null
        });
      }

      return tagNodes.get(tag);
    }

    posts.forEach(function (post) {
      if (!post || !Array.isArray(post.tags)) {
        return;
      }

      var cleanTags = cleanTagList(post.tags);

      if (cleanTags.length === 0) {
        return;
      }

      cleanTags.forEach(function (tag) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        ensureTagNode(tag);
      });

      for (var i = 0; i < cleanTags.length; i += 1) {
        for (var j = i + 1; j < cleanTags.length; j += 1) {
          var sourceTag = cleanTags[i];
          var targetTag = cleanTags[j];
          var pair = sourceTag < targetTag ? [sourceTag, targetTag] : [targetTag, sourceTag];
          var pairKey = pair[0] + "\u0000" + pair[1];
          var link = linksByPair.get(pairKey);

          if (!link) {
            link = {
              source: ensureTagNode(pair[0]),
              target: ensureTagNode(pair[1]),
              weight: 0
            };
            linksByPair.set(pairKey, link);
          }

          link.weight += 1;
          link.source.neighbors.add(link.target);
          link.target.neighbors.add(link.source);
        }
      }
    });

    tagNodes.forEach(function (tagNode, tag) {
      var count = tagCounts.get(tag) || 1;
      tagNode.count = count;
      tagNode.radius = 5.5 + Math.min(11, Math.sqrt(count) * 2.2);
    });

    return {
      nodes: Array.from(tagNodes.values()),
      links: Array.from(linksByPair.values())
    };
  }

  function filterGraphToEgoNetwork(graph, focusTags) {
    var cleanFocusTags = cleanTagList(focusTags);
    if (cleanFocusTags.length === 0) {
      return graph;
    }

    var focusSet = new Set(cleanFocusTags);
    var includedTags = new Set(cleanFocusTags);
    var directLinks = graph.links.filter(function (link) {
      var sourceIsFocus = focusSet.has(link.source.label);
      var targetIsFocus = focusSet.has(link.target.label);
      if (!sourceIsFocus && !targetIsFocus) {
        return false;
      }

      includedTags.add(link.source.label);
      includedTags.add(link.target.label);
      return true;
    });

    var includedNodes = graph.nodes.filter(function (node) {
      return includedTags.has(node.label);
    });
    var includedNodeSet = new Set(includedNodes);

    includedNodes.forEach(function (node) {
      node.isFocus = focusSet.has(node.label);
      node.neighbors = new Set();
    });

    directLinks = directLinks.filter(function (link) {
      return includedNodeSet.has(link.source) && includedNodeSet.has(link.target);
    });
    directLinks.forEach(function (link) {
      link.source.neighbors.add(link.target);
      link.target.neighbors.add(link.source);
    });

    return {
      nodes: includedNodes,
      links: directLinks
    };
  }

  function filterGraphToRepeatedTags(graph) {
    var includedNodes = graph.nodes.filter(function (node) {
      return node.count > 1;
    });
    var includedNodeSet = new Set(includedNodes);
    var includedLinks = graph.links.filter(function (link) {
      return includedNodeSet.has(link.source) && includedNodeSet.has(link.target);
    });

    includedNodes.forEach(function (node) {
      node.neighbors = new Set();
    });
    includedLinks.forEach(function (link) {
      link.source.neighbors.add(link.target);
      link.target.neighbors.add(link.source);
    });

    return {
      nodes: includedNodes,
      links: includedLinks
    };
  }

  async function init() {
    var container = document.getElementById("knowledge-graph");
    var dataEl = document.getElementById("knowledge-graph-data");
    var toolsEl = document.getElementById("knowledge-graph-tools");
    var searchEl = document.getElementById("graph-search");
    var searchInput = document.getElementById("graph-node-search");
    var searchStatus = document.getElementById("graph-search-status");
    var spacingInput = document.getElementById("graph-spacing");
    var labelsButton = document.getElementById("graph-toggle-labels");
    var maximizeButton = document.getElementById("graph-toggle-maximize");
    if (!container || !dataEl) {
      return;
    }
    var homeGraphSection = container.closest(".home-graph");

    var payload = await loadPayload(container, dataEl);
    var graph = buildGraph(payload.posts, payload.tagLinks);
    graph = cleanTagList(payload.focusTags).length > 0
      ? filterGraphToEgoNetwork(graph, payload.focusTags)
      : filterGraphToRepeatedTags(graph);
    var nodes = graph.nodes;
    var links = graph.links;

    if (nodes.length === 0) {
      var emptyState = document.createElement("p");
      emptyState.className = "knowledge-graph-empty";
      emptyState.textContent = "Aún no hay tags suficientes para construir el grafo.";
      container.appendChild(emptyState);
      return;
    }

    var canvas = document.createElement("canvas");
    container.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    var width = 0;
    var height = 0;
    var theme = {};
    var hasPositioned = false;

    var state = {
      zoom: 1,
      minZoom: 0.45,
      maxZoom: 2.3,
      baseLinkDistance: 72,
      linkDistance: 72,
      forceLabels: false,
      offsetX: 0,
      offsetY: 0,
      pointerId: null,
      hoverNode: null,
      draggingNode: null,
      panning: false,
      moved: false,
      downScreenX: 0,
      downScreenY: 0,
      panStartOffsetX: 0,
      panStartOffsetY: 0,
      touchPointers: new Map(),
      pinching: false,
      pinchDistance: 0,
      pinchCenterX: 0,
      pinchCenterY: 0,
      fallbackMaximized: false,
      maximized: false,
      searchNode: null,
      searchMatches: [],
      searchMatchIndex: -1
    };
    var simulationFrame = null;
    var simulationFrames = 0;
    var graphVisible = true;
    var MAX_SIMULATION_FRAMES = 360;
    var SETTLED_SPEED = 0.02;

    function requestSimulationFrame() {
      if (simulationFrame !== null || !graphVisible || document.hidden) {
        return;
      }
      simulationFrame = window.requestAnimationFrame(tick);
    }

    function wakeSimulation() {
      simulationFrames = 0;
      requestSimulationFrame();
    }

    function drawIfIdle() {
      if (simulationFrame === null && graphVisible && !document.hidden) {
        draw();
      }
    }

    function readVar(name, fallback) {
      var value = getComputedStyle(document.documentElement).getPropertyValue(name);
      return value ? value.trim() : fallback;
    }

    function refreshTheme() {
      theme = {
        line: readVar("--line", "#2a2f36"),
        ink: readVar("--ink", "#cfcfd2"),
        inkDim: readVar("--ink-dim", "#a8abb2"),
        tag: readVar("--graph-tag", readVar("--accent", "#76a694")),
        tagHover: readVar("--graph-tag-hover", readVar("--accent-2", "#91bfaf")),
        linkActive: readVar("--graph-link-active", readVar("--graph-tag-hover", readVar("--accent-2", "#91bfaf"))),
        bg: readVar("--graph-bg", "#0a0c10")
      };
    }

    function setCanvasSize() {
      var rect = container.getBoundingClientRect();
      width = Math.max(260, rect.width);
      height = Math.max(240, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      if (!hasPositioned) {
        state.offsetX = width / 2;
        state.offsetY = height / 2;
        placeInitialNodes();
        hasPositioned = true;
      }
      drawIfIdle();
    }

    function placeInitialNodes() {
      var n = nodes.length;
      if (n === 1) {
        nodes[0].x = 0;
        nodes[0].y = 0;
        return;
      }

      var tagRingRadius = Math.max(80, Math.min(width, height) * 0.22);
      nodes.forEach(function (node, index) {
        var angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
        node.x = Math.cos(angle) * tagRingRadius;
        node.y = Math.sin(angle) * tagRingRadius;
        node.vx = 0;
        node.vy = 0;
      });
    }

    function screenToWorld(screenX, screenY) {
      return {
        x: (screenX - state.offsetX) / state.zoom,
        y: (screenY - state.offsetY) / state.zoom
      };
    }

    function pointerXY(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function applyZoomByFactor(factor, screenX, screenY) {
      var worldBefore = screenToWorld(screenX, screenY);
      var nextZoom = clamp(state.zoom * factor, state.minZoom, state.maxZoom);
      if (nextZoom === state.zoom) {
        return;
      }

      state.zoom = nextZoom;
      state.offsetX = screenX - worldBefore.x * state.zoom;
      state.offsetY = screenY - worldBefore.y * state.zoom;
      drawIfIdle();
    }

    function getPinchMetrics() {
      var points = Array.from(state.touchPointers.values());
      if (points.length < 2) {
        return null;
      }

      return {
        distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        centerX: (points[0].x + points[1].x) / 2,
        centerY: (points[0].y + points[1].y) / 2
      };
    }

    function recenterGraph() {
      state.zoom = 1;
      state.offsetX = width / 2;
      state.offsetY = height / 2;
      placeInitialNodes();
      wakeSimulation();
    }

    function syncLabelsButton() {
      if (!labelsButton) {
        return;
      }
      var label = state.forceLabels ? "Etiquetas: todo" : "Etiquetas: auto";
      labelsButton.setAttribute("aria-pressed", state.forceLabels ? "true" : "false");
      labelsButton.setAttribute("aria-label", label);
      labelsButton.setAttribute("title", label);
      labelsButton.classList.toggle("is-active", state.forceLabels);
    }

    function updateSearchStatus(message) {
      if (!searchStatus) {
        return;
      }
      searchStatus.textContent = message || "";
    }

    function clearSearchSelection() {
      state.searchNode = null;
      state.searchMatches = [];
      state.searchMatchIndex = -1;
      updateSearchStatus("");
      drawIfIdle();
    }

    function centerViewport(node) {
      if (node) {
        state.offsetX = width / 2 - node.x * state.zoom;
        state.offsetY = height / 2 - node.y * state.zoom;
        return;
      }
      state.offsetX = width / 2;
      state.offsetY = height / 2;
    }

    function centerViewForCurrentFocus() {
      centerViewport(state.searchNode);
    }

    function focusNode(node) {
      if (!node) {
        return;
      }
      state.hoverNode = node;
      state.searchNode = node;
      state.zoom = clamp(Math.max(state.zoom, 1.08), state.minZoom, state.maxZoom);
      centerViewport(node);
      drawIfIdle();
    }

    function applySearchQuery(rawQuery, cycleNext) {
      var query = normalizeSearchText(rawQuery);
      if (!query) {
        clearSearchSelection();
        centerViewport(null);
        return;
      }

      var matches = nodes.filter(function (node) {
        return normalizeSearchText(node.label).indexOf(query) !== -1;
      });
      state.searchMatches = matches;
      if (matches.length === 0) {
        state.searchNode = null;
        state.searchMatchIndex = -1;
        updateSearchStatus("Sin coincidencias.");
        return;
      }

      var index = 0;
      if (cycleNext && matches.length > 1 && state.searchNode) {
        var currentIndex = matches.indexOf(state.searchNode);
        if (currentIndex >= 0) {
          index = (currentIndex + 1) % matches.length;
        }
      }
      state.searchMatchIndex = index;

      var selected = matches[index];
      focusNode(selected);
      var hint = matches.length > 1 ? " Presiona Enter para siguiente." : "";
      updateSearchStatus("Coincidencia " + (index + 1) + " de " + matches.length + "." + hint);
    }

    function setFallbackMaximized(enabled) {
      state.fallbackMaximized = enabled;
      if (homeGraphSection) {
        homeGraphSection.classList.toggle("is-maximized", enabled);
      }
      document.body.classList.toggle("graph-maximized", enabled);
    }

    function syncMaximizeButton() {
      if (!maximizeButton) {
        return;
      }
      var active = state.fallbackMaximized;
      var wasActive = state.maximized;
      state.maximized = active;
      var label = active ? "Restaurar vista" : "Maximizar vista";
      maximizeButton.setAttribute("aria-pressed", active ? "true" : "false");
      maximizeButton.setAttribute("aria-label", label);
      maximizeButton.setAttribute("title", label);
      maximizeButton.classList.toggle("is-active", active);

      if (searchEl) {
        searchEl.classList.toggle("is-visible", active);
      }

      if (!active && wasActive && searchInput) {
        searchInput.value = "";
        clearSearchSelection();
      }
      if (active && !wasActive && searchInput) {
        window.setTimeout(function () {
          try {
            searchInput.focus();
          } catch (error) {
            return;
          }
        }, 0);
      }
    }

    function toggleMaximize() {
      if (!homeGraphSection) {
        return;
      }

      if (state.fallbackMaximized) {
        setFallbackMaximized(false);
        syncMaximizeButton();
        setCanvasSize();
        centerViewForCurrentFocus();
        return;
      }

      setFallbackMaximized(true);
      syncMaximizeButton();
      setCanvasSize();
      centerViewForCurrentFocus();
    }

    function pickNode(worldX, worldY) {
      var best = null;
      var bestDistance = Infinity;

      nodes.forEach(function (node) {
        var dx = worldX - node.x;
        var dy = worldY - node.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var threshold = node.radius + 5 / state.zoom;
        if (distance <= threshold && distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      });

      return best;
    }

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(state.offsetX, state.offsetY);
      ctx.scale(state.zoom, state.zoom);
      var activeNode = state.draggingNode || state.hoverNode || state.searchNode;
      var hasActiveNode = !!activeNode;

      function isAdjacentLink(link) {
        return !!activeNode && (link.source === activeNode || link.target === activeNode);
      }

      function drawLink(link, active) {
        if (active) {
          ctx.globalAlpha = 0.92;
          ctx.strokeStyle = theme.linkActive;
          ctx.lineWidth = 0.95 + Math.min(1.1, link.weight * 0.28);
        } else {
          ctx.globalAlpha = hasActiveNode
            ? Math.min(0.34, 0.08 + link.weight * 0.05)
            : Math.min(0.7, 0.16 + link.weight * 0.08);
          ctx.strokeStyle = theme.line;
          ctx.lineWidth = 0.7 + Math.min(2.4, link.weight * 0.45);
        }
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      }

      links.forEach(function (link) {
        if (isAdjacentLink(link)) {
          return;
        }
        drawLink(link, false);
      });
      links.forEach(function (link) {
        if (!isAdjacentLink(link)) {
          return;
        }
        drawLink(link, true);
      });
      ctx.globalAlpha = 1;

      nodes.forEach(function (node) {
        var hovered = state.hoverNode === node;
        var selected = state.searchNode === node;
        ctx.fillStyle = hovered || selected ? theme.tagHover : theme.tag;
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = selected ? 2.2 : hovered ? 1.5 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      var activeNode = state.draggingNode || state.hoverNode || state.searchNode;
      var hasActiveNode = !!activeNode;

      // Calcular umbral dinámico para etiquetas por defecto
      var defaultThreshold = 2;
      if (nodes.length > 20) {
        var counts = nodes.map(function (n) { return n.count; }).sort(function (a, b) { return b - a; });
        defaultThreshold = Math.max(2, counts[Math.min(counts.length - 1, 14)]);
      }

      nodes.forEach(function (node) {
        var hovered = state.hoverNode === node;
        var selected = state.searchNode === node;
        var isMainActive = hovered || selected;
        var isNeighbor = hasActiveNode && (activeNode.neighbors && activeNode.neighbors.has(node));

        var showLabel = false;
        if (state.forceLabels) {
          showLabel = true;
        } else if (hasActiveNode) {
          showLabel = isMainActive || isNeighbor;
        } else {
          showLabel = node.count >= defaultThreshold || nodes.length <= 20;
        }

        if (!showLabel) {
          return;
        }

        // Jerarquía visual y tipografía
        if (isMainActive) {
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.ink;
          ctx.font = "bold 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Cascadia Mono, Fira Code, IBM Plex Mono, Liberation Mono, monospace";
        } else if (isNeighbor) {
          ctx.globalAlpha = 0.95;
          ctx.fillStyle = theme.inkDim;
          ctx.font = "500 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Cascadia Mono, Fira Code, IBM Plex Mono, Liberation Mono, monospace";
        } else {
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = theme.inkDim;
          ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, Cascadia Mono, Fira Code, IBM Plex Mono, Liberation Mono, monospace";
        }

        // Dibujar contorno de contraste protector (stroke)
        ctx.strokeStyle = theme.bg;
        ctx.lineWidth = isMainActive ? 4.5 : 3.5;
        ctx.strokeText(node.label, node.x, node.y - node.radius - 6);

        // Dibujar el texto
        ctx.fillText(node.label, node.x, node.y - node.radius - 6);
      });
      ctx.globalAlpha = 1;
    }

    function tick() {
      simulationFrame = null;
      if (!graphVisible || document.hidden) {
        return;
      }

      var spacingScale = state.linkDistance / state.baseLinkDistance;
      var repulsion = 2200 * spacingScale;
      var springStrength = 0.011;
      var centerStrength = 0.0025;
      var damping = 0.88;
      var maxSpeed = 0;

      for (var i = 0; i < nodes.length; i += 1) {
        for (var j = i + 1; j < nodes.length; j += 1) {
          var a = nodes[i];
          var b = nodes[j];
          var dx = b.x - a.x;
          var dy = b.y - a.y;
          var distanceSq = dx * dx + dy * dy + 0.01;
          var distance = Math.sqrt(distanceSq);
          var force = repulsion / distanceSq;
          var fx = (force * dx) / distance;
          var fy = (force * dy) / distance;

          if (state.draggingNode !== a) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (state.draggingNode !== b) {
            b.vx += fx;
            b.vy += fy;
          }

          // Fuerza de prevención de colisión (círculos elásticos)
          var minDist = a.radius + b.radius + 14;
          if (distanceSq < minDist * minDist) {
            var overlapForce = (minDist * minDist - distanceSq) * 0.08;
            var ox = (overlapForce * dx) / distance;
            var oy = (overlapForce * dy) / distance;
            if (state.draggingNode !== a) {
              a.vx -= ox;
              a.vy -= oy;
            }
            if (state.draggingNode !== b) {
              b.vx += ox;
              b.vy += oy;
            }
          }
        }
      }

      links.forEach(function (link) {
        var sx = link.source.x;
        var sy = link.source.y;
        var tx = link.target.x;
        var ty = link.target.y;
        var dx = tx - sx;
        var dy = ty - sy;
        var distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var desired = state.linkDistance;
        var stretch = distance - desired;
        var spring = springStrength * (0.8 + Math.min(2, link.weight * 0.35));
        var fx = (stretch * spring * dx) / distance;
        var fy = (stretch * spring * dy) / distance;

        if (state.draggingNode !== link.source) {
          link.source.vx += fx;
          link.source.vy += fy;
        }
        if (state.draggingNode !== link.target) {
          link.target.vx -= fx;
          link.target.vy -= fy;
        }
      });

      nodes.forEach(function (node) {
        if (state.draggingNode === node) {
          node.vx = 0;
          node.vy = 0;
          return;
        }

        node.vx += -node.x * centerStrength;
        node.vy += -node.y * centerStrength;
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx * 0.08;
        node.y += node.vy * 0.08;
        maxSpeed = Math.max(maxSpeed, Math.abs(node.vx) + Math.abs(node.vy));
      });

      draw();
      simulationFrames += 1;
      if (
        state.draggingNode ||
        state.panning ||
        (maxSpeed > SETTLED_SPEED && simulationFrames < MAX_SIMULATION_FRAMES)
      ) {
        requestSimulationFrame();
      }
    }

    canvas.addEventListener("pointerdown", function (event) {
      var pos = pointerXY(event);
      if (event.pointerType === "touch") {
        event.preventDefault();
        if (state.touchPointers.size >= 2) {
          return;
        }

        state.touchPointers.set(event.pointerId, pos);
        canvas.setPointerCapture(event.pointerId);

        if (state.touchPointers.size === 2) {
          var pinch = getPinchMetrics();
          state.pointerId = null;
          state.draggingNode = null;
          state.panning = false;
          state.moved = true;
          state.pinching = true;
          state.pinchDistance = pinch.distance;
          state.pinchCenterX = pinch.centerX;
          state.pinchCenterY = pinch.centerY;
          container.classList.toggle("is-grabbing", true);
          return;
        }
      }

      if (state.pointerId !== null) {
        return;
      }
      var world = screenToWorld(pos.x, pos.y);
      var pickedNode = pickNode(world.x, world.y);

      state.pointerId = event.pointerId;
      state.draggingNode = pickedNode;
      state.panning = !pickedNode;
      state.downScreenX = pos.x;
      state.downScreenY = pos.y;
      state.moved = false;
      state.panStartOffsetX = state.offsetX;
      state.panStartOffsetY = state.offsetY;
      container.classList.toggle("is-grabbing", true);

      if (pickedNode) {
        pickedNode.vx = 0;
        pickedNode.vy = 0;
      }

      if (event.pointerType !== "touch") {
        canvas.setPointerCapture(event.pointerId);
      }
      wakeSimulation();
    });

    canvas.addEventListener("pointermove", function (event) {
      var pos = pointerXY(event);

      if (event.pointerType === "touch" && state.touchPointers.has(event.pointerId)) {
        state.touchPointers.set(event.pointerId, pos);

        if (state.pinching) {
          event.preventDefault();
          var pinch = getPinchMetrics();
          if (!pinch || state.pinchDistance === 0) {
            return;
          }

          var worldBeforePinch = screenToWorld(state.pinchCenterX, state.pinchCenterY);
          state.zoom = clamp(
            state.zoom * (pinch.distance / state.pinchDistance),
            state.minZoom,
            state.maxZoom
          );
          state.offsetX = pinch.centerX - worldBeforePinch.x * state.zoom;
          state.offsetY = pinch.centerY - worldBeforePinch.y * state.zoom;
          state.pinchDistance = pinch.distance;
          state.pinchCenterX = pinch.centerX;
          state.pinchCenterY = pinch.centerY;
          state.moved = true;
          drawIfIdle();
          return;
        }
      }

      var world = screenToWorld(pos.x, pos.y);

      if (event.pointerId === state.pointerId && (state.draggingNode || state.panning)) {
        var moveDistance = Math.hypot(pos.x - state.downScreenX, pos.y - state.downScreenY);
        if (moveDistance > 3) {
          state.moved = true;
        }

        if (state.draggingNode) {
          state.draggingNode.x = world.x;
          state.draggingNode.y = world.y;
          requestSimulationFrame();
          return;
        }

        if (state.panning) {
          state.offsetX = state.panStartOffsetX + (pos.x - state.downScreenX);
          state.offsetY = state.panStartOffsetY + (pos.y - state.downScreenY);
          drawIfIdle();
        }
        return;
      }

      var nextHoverNode = pickNode(world.x, world.y);
      if (nextHoverNode !== state.hoverNode) {
        state.hoverNode = nextHoverNode;
        drawIfIdle();
      }
    });

    function onPointerUp(event) {
      if (event.pointerType === "touch") {
        state.touchPointers.delete(event.pointerId);
      }

      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }

      if (state.pinching) {
        if (state.touchPointers.size < 2) {
          state.pinching = false;
          state.pinchDistance = 0;
          state.pointerId = null;
          state.draggingNode = null;
          state.panning = false;
          container.classList.toggle("is-grabbing", false);
          wakeSimulation();
        }
        return;
      }

      if (state.pointerId !== event.pointerId) {
        return;
      }

      state.pointerId = null;
      state.draggingNode = null;
      state.panning = false;
      container.classList.toggle("is-grabbing", false);
      wakeSimulation();
    }

    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    canvas.addEventListener("click", function (event) {
      if (state.moved) {
        return;
      }

      var pos = pointerXY(event);
      var world = screenToWorld(pos.x, pos.y);
      var node = pickNode(world.x, world.y);
      if (node && node.url) {
        window.location.assign(node.url);
      }
    });

    canvas.addEventListener(
      "wheel",
      function (event) {
        event.preventDefault();
        var pos = pointerXY(event);
        var zoomDelta = Math.exp(-event.deltaY * 0.0012);
        applyZoomByFactor(zoomDelta, pos.x, pos.y);
      },
      { passive: false }
    );

    if (spacingInput) {
      var parsedSpacing = Number(spacingInput.value);
      if (!isNaN(parsedSpacing)) {
        state.linkDistance = clamp(parsedSpacing, 30, 200);
      }

      spacingInput.addEventListener("input", function () {
        var nextValue = Number(spacingInput.value);
        if (isNaN(nextValue)) {
          return;
        }
        state.linkDistance = clamp(nextValue, 30, 200);
        wakeSimulation();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        applySearchQuery(searchInput.value, false);
        drawIfIdle();
      });
      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          applySearchQuery(searchInput.value, true);
          drawIfIdle();
          return;
        }
        if (event.key === "Escape" && searchInput.value) {
          searchInput.value = "";
          clearSearchSelection();
          centerViewport(null);
          drawIfIdle();
        }
      });
    }

    if (toolsEl) {
      toolsEl.addEventListener("click", function (event) {
        var button = event.target.closest("[data-graph-action]");
        if (!button) {
          return;
        }

        var action = button.getAttribute("data-graph-action");
        if (action === "reset-view") {
          recenterGraph();
          return;
        }
        if (action === "toggle-labels") {
          state.forceLabels = !state.forceLabels;
          syncLabelsButton();
          drawIfIdle();
          return;
        }
        if (action === "toggle-maximize") {
          toggleMaximize();
        }
      });
    }

    window.addEventListener("resize", setCanvasSize);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.fallbackMaximized) {
        setFallbackMaximized(false);
        syncMaximizeButton();
        setCanvasSize();
        centerViewForCurrentFocus();
      }
    });

    var themeObserver = new MutationObserver(function () {
      refreshTheme();
      drawIfIdle();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    if ("IntersectionObserver" in window) {
      var visibilityObserver = new IntersectionObserver(function (entries) {
        graphVisible = entries.some(function (entry) {
          return entry.isIntersecting;
        });
        if (graphVisible) {
          drawIfIdle();
          wakeSimulation();
        }
      }, { rootMargin: "100px" });
      visibilityObserver.observe(container);
    }

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        drawIfIdle();
        wakeSimulation();
      }
    });

    refreshTheme();
    setCanvasSize();
    syncLabelsButton();
    syncMaximizeButton();
    wakeSimulation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
