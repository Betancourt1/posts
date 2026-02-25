(function () {
  "use strict";

  function toTagName(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.trim();
  }

  function parsePayload(scriptEl) {
    if (!scriptEl) {
      return { posts: [], tagLinks: {} };
    }

    try {
      var parsed = JSON.parse(scriptEl.textContent || "{}");
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
      }
      return {
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        tagLinks: parsed.tagLinks && typeof parsed.tagLinks === "object" ? parsed.tagLinks : {}
      };
    } catch (error) {
      return { posts: [], tagLinks: {} };
    }
  }

  function buildGraph(posts, tagLinks) {
    var tagCounts = new Map();
    var edgeCounts = new Map();

    posts.forEach(function (post) {
      if (!post || !Array.isArray(post.tags)) {
        return;
      }

      var seen = new Set();
      var cleanTags = [];
      post.tags.forEach(function (rawTag) {
        var tag = toTagName(rawTag);
        if (!tag || seen.has(tag)) {
          return;
        }
        seen.add(tag);
        cleanTags.push(tag);
      });

      cleanTags.forEach(function (tag) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      for (var i = 0; i < cleanTags.length; i += 1) {
        for (var j = i + 1; j < cleanTags.length; j += 1) {
          var a = cleanTags[i];
          var b = cleanTags[j];
          var key = a < b ? a + "||" + b : b + "||" + a;
          edgeCounts.set(key, (edgeCounts.get(key) || 0) + 1);
        }
      }
    });

    var nodes = Array.from(tagCounts.entries()).map(function (entry) {
      var tag = entry[0];
      var count = entry[1];
      return {
        id: tag,
        count: count,
        radius: 5 + Math.min(11, Math.sqrt(count) * 2.2),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        url: typeof tagLinks[tag] === "string" ? tagLinks[tag] : null
      };
    });

    var nodeById = new Map();
    nodes.forEach(function (node) {
      nodeById.set(node.id, node);
    });

    var links = [];
    edgeCounts.forEach(function (weight, key) {
      var pair = key.split("||");
      var source = nodeById.get(pair[0]);
      var target = nodeById.get(pair[1]);
      if (source && target) {
        links.push({ source: source, target: target, weight: weight });
      }
    });

    if (links.length === 0 && nodes.length > 1) {
      var sortedNodes = nodes.slice().sort(function (a, b) {
        return b.count - a.count;
      });
      var hub = sortedNodes[0];
      sortedNodes.slice(1).forEach(function (node) {
        links.push({ source: hub, target: node, weight: 0.7 });
      });
    }

    return { nodes: nodes, links: links };
  }

  function init() {
    var container = document.getElementById("knowledge-graph");
    var dataEl = document.getElementById("knowledge-graph-data");
    if (!container || !dataEl) {
      return;
    }

    var payload = parsePayload(dataEl);
    var graph = buildGraph(payload.posts, payload.tagLinks);
    var nodes = graph.nodes;
    var links = graph.links;

    if (nodes.length === 0) {
      var emptyState = document.createElement("p");
      emptyState.className = "knowledge-graph-empty";
      emptyState.textContent = "Aun no hay tags suficientes para construir el grafo.";
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
      panStartOffsetY: 0
    };

    function readVar(name, fallback) {
      var value = getComputedStyle(document.documentElement).getPropertyValue(name);
      return value ? value.trim() : fallback;
    }

    function refreshTheme() {
      theme = {
        line: readVar("--line", "#2a2f36"),
        ink: readVar("--ink", "#cfcfd2"),
        inkDim: readVar("--ink-dim", "#a8abb2"),
        accent: readVar("--accent", "#4ecca3"),
        accentStrong: readVar("--accent-2", "#35b98f")
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
    }

    function placeInitialNodes() {
      var n = nodes.length;
      if (n === 1) {
        nodes[0].x = 0;
        nodes[0].y = 0;
        return;
      }

      var ringRadius = Math.max(90, Math.min(width, height) * 0.28);
      nodes.forEach(function (node, index) {
        var angle = (index / n) * Math.PI * 2;
        node.x = Math.cos(angle) * ringRadius;
        node.y = Math.sin(angle) * ringRadius;
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

      links.forEach(function (link) {
        var alpha = Math.min(0.7, 0.16 + link.weight * 0.08);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = 0.7 + Math.min(2.4, link.weight * 0.45);
        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      nodes.forEach(function (node) {
        var hovered = state.hoverNode === node;
        ctx.fillStyle = hovered ? theme.accentStrong : theme.accent;
        ctx.strokeStyle = theme.line;
        ctx.lineWidth = hovered ? 1.5 : 1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, Monaco, Cascadia Mono, Fira Code, IBM Plex Mono, Liberation Mono, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      nodes.forEach(function (node) {
        var hovered = state.hoverNode === node;
        var showLabel = hovered || node.count > 1 || nodes.length <= 24;
        if (!showLabel) {
          return;
        }

        ctx.globalAlpha = hovered ? 1 : 0.85;
        ctx.fillStyle = hovered ? theme.ink : theme.inkDim;
        ctx.fillText(node.id, node.x, node.y - node.radius - 6);
      });
      ctx.globalAlpha = 1;
    }

    function tick() {
      var repulsion = 2200;
      var springStrength = 0.011;
      var centerStrength = 0.0025;
      var damping = 0.88;

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
        var desired = 70 + Math.max(0, 3 - link.weight) * 9;
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
      });

      draw();
      window.requestAnimationFrame(tick);
    }

    canvas.addEventListener("pointerdown", function (event) {
      var pos = pointerXY(event);
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

      canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", function (event) {
      var pos = pointerXY(event);
      var world = screenToWorld(pos.x, pos.y);

      if (event.pointerId === state.pointerId && (state.draggingNode || state.panning)) {
        var moveDistance = Math.hypot(pos.x - state.downScreenX, pos.y - state.downScreenY);
        if (moveDistance > 3) {
          state.moved = true;
        }

        if (state.draggingNode) {
          state.draggingNode.x = world.x;
          state.draggingNode.y = world.y;
          return;
        }

        if (state.panning) {
          state.offsetX = state.panStartOffsetX + (pos.x - state.downScreenX);
          state.offsetY = state.panStartOffsetY + (pos.y - state.downScreenY);
        }
        return;
      }

      state.hoverNode = pickNode(world.x, world.y);
    });

    function onPointerUp(event) {
      if (state.pointerId !== event.pointerId) {
        return;
      }

      canvas.releasePointerCapture(event.pointerId);
      state.pointerId = null;
      state.draggingNode = null;
      state.panning = false;
      container.classList.toggle("is-grabbing", false);
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
        var worldBefore = screenToWorld(pos.x, pos.y);
        var zoomDelta = Math.exp(-event.deltaY * 0.0012);
        var nextZoom = Math.max(state.minZoom, Math.min(state.maxZoom, state.zoom * zoomDelta));
        if (nextZoom === state.zoom) {
          return;
        }

        state.zoom = nextZoom;
        state.offsetX = pos.x - worldBefore.x * state.zoom;
        state.offsetY = pos.y - worldBefore.y * state.zoom;
      },
      { passive: false }
    );

    window.addEventListener("resize", setCanvasSize);

    var themeObserver = new MutationObserver(function () {
      refreshTheme();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"]
    });

    refreshTheme();
    setCanvasSize();
    tick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
