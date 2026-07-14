(function () {
  "use strict";

  var MODE_KEY = "infra_mode_enabled";
  var TERMINAL_KEY = "infra_terminal_open";
  var terminal = { cwd: "/", history: [], historyIndex: 0, root: null };

  function language() {
    return (document.documentElement.lang || (location.pathname.indexOf("/es/") === 0 ? "es" : "en"))
      .toLowerCase()
      .split("-")[0];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeNode(raw, index) {
    raw = raw && typeof raw === "object" ? raw : {};
    var children = Array.isArray(raw.children) ? raw.children : Array.isArray(raw.items) ? raw.items : null;
    var url = raw.url || raw.path || raw.route || raw.permalink || "";
    var fallbackName = url ? url.split("/").filter(Boolean).pop() : "item-" + index;
    var name = raw.name || raw.section || raw.filename || raw.title || fallbackName;
    var content = raw.content || raw.bodyMarkdown || raw.body_markdown || raw.rawMarkdown || raw.raw_markdown || raw.markdown || "";

    if (children) {
      return {
        type: "dir",
        name: String(name || "/"),
        children: children.map(normalizeNode),
      };
    }

    return {
      type: raw.type === "dir" ? "dir" : "file",
      name: String(name || fallbackName),
      url: String(url || ""),
      content: String(content || ""),
      children: raw.type === "dir" ? [] : undefined,
    };
  }

  function normalizeRoot(payload) {
    if (payload && Array.isArray(payload.root)) {
      return { type: "dir", name: "/", children: payload.root.map(normalizeNode) };
    }
    if (Array.isArray(payload)) {
      return { type: "dir", name: "/", children: payload.map(normalizeNode) };
    }
    var root = payload && (payload.root || payload.sitemap || payload.tree) || payload;
    if (!root || typeof root !== "object") return null;
    var normalized = normalizeNode(root, 0);
    normalized.type = "dir";
    normalized.name = "/";
    normalized.children = normalized.children || [];
    return normalized;
  }

  function embeddedRoot() {
    var element = document.getElementById("infra-sitemap");
    if (!element || !element.textContent.trim()) return null;
    try {
      var value = JSON.parse(element.textContent);
      if (typeof value === "string") value = JSON.parse(value);
      return normalizeRoot(value);
    } catch (error) {
      return null;
    }
  }

  async function loadRoot() {
    var element = document.getElementById("infra-sitemap");
    var endpoint = element && element.dataset.infrastructureEndpoint || "/api/infrastructure";
    var url = new URL(endpoint, location.origin);
    url.searchParams.set("lang", language());
    try {
      var response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Infrastructure returned " + response.status);
      return normalizeRoot(await response.json());
    } catch (error) {
      return embeddedRoot();
    }
  }

  function updateToggle(button, active) {
    var english = language() === "en";
    var label = active
      ? (english ? "Disable infrastructure mode" : "Desactivar modo infraestructura")
      : (english ? "Enable infrastructure mode" : "Activar modo infraestructura");
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }

  function initMode() {
    var button = document.getElementById("infra-toggle");
    var active = localStorage.getItem(MODE_KEY) === "true";
    document.documentElement.classList.toggle("infra-mode", active);
    if (!button) return;
    updateToggle(button, active);
    button.addEventListener("click", function () {
      active = !document.documentElement.classList.contains("infra-mode");
      document.documentElement.classList.toggle("infra-mode", active);
      localStorage.setItem(MODE_KEY, String(active));
      updateToggle(button, active);
    });
  }

  function resolvePath(cwd, target) {
    var parts = target && target.charAt(0) === "/"
      ? target.split("/")
      : cwd.split("/").concat(String(target || "").split("/"));
    var resolved = [];
    parts.filter(Boolean).forEach(function (part) {
      if (part === "..") resolved.pop();
      else if (part !== ".") resolved.push(part);
    });
    return "/" + resolved.join("/");
  }

  function getNode(path) {
    if (!terminal.root || path === "/") return terminal.root;
    var node = terminal.root;
    var parts = path.split("/").filter(Boolean);
    for (var index = 0; index < parts.length; index += 1) {
      if (!node || !Array.isArray(node.children)) return null;
      node = node.children.find(function (child) { return child.name === parts[index]; });
      if (!node) return null;
    }
    return node;
  }

  function prompt() {
    return '<span class="term-user">visitor@betancourt</span>:<span class="term-path">' + escapeHtml(terminal.cwd) + "</span>$ ";
  }

  function list(args) {
    var target = args[0] ? resolvePath(terminal.cwd, args[0]) : terminal.cwd;
    var node = getNode(target);
    if (!node) return "ls: " + escapeHtml(args[0] || target) + ": No such file or directory";
    if (node.type === "file") return escapeHtml(node.name);
    if (!node.children || node.children.length === 0) return "(empty)";
    return node.children.map(function (child) {
      return child.type === "dir"
        ? '<span class="term-dir">' + escapeHtml(child.name) + "/</span>"
        : escapeHtml(child.name);
    }).join("  ");
  }

  function changeDirectory(args) {
    var target = !args[0] || args[0] === "~" ? "/" : resolvePath(terminal.cwd, args[0]);
    var node = getNode(target);
    if (!node) return "cd: no such file or directory: " + escapeHtml(args[0]);
    if (node.type !== "dir") return "cd: not a directory: " + escapeHtml(args[0]);
    terminal.cwd = target;
    return "";
  }

  function cat(args) {
    if (!args[0]) return "cat: missing operand";
    var node = getNode(resolvePath(terminal.cwd, args[0]));
    if (!node) return "cat: " + escapeHtml(args[0]) + ": No such file or directory";
    if (node.type === "dir") return "cat: " + escapeHtml(args[0]) + ": Is a directory";
    if (node.content) return '<pre class="term-file-content">' + escapeHtml(node.content) + "</pre>";
    if (node.url) return "# " + escapeHtml(node.url) + "\n(use 'open " + escapeHtml(args[0]) + "' to visit)";
    return "(empty file)";
  }

  function openNode(args) {
    if (!args[0]) return "open: missing operand";
    var node = getNode(resolvePath(terminal.cwd, args[0]));
    if (!node) return "open: " + escapeHtml(args[0]) + ": No such file or directory";
    if (!node.url) return "open: no URL associated with " + escapeHtml(args[0]);
    location.assign(node.url);
    return "Opening " + escapeHtml(node.url) + "…";
  }

  function tree(args) {
    var target = args[0] ? resolvePath(terminal.cwd, args[0]) : terminal.cwd;
    var node = getNode(target);
    if (!node) return "tree: " + escapeHtml(args[0] || target) + ": No such file or directory";
    var lines = ['<span class="term-dir">' + escapeHtml(target) + "</span>"];
    function walk(current, prefix, last) {
      var label = escapeHtml(current.name) + (current.type === "dir" ? "/" : "");
      if (current.type === "dir") label = '<span class="term-dir">' + label + "</span>";
      lines.push(prefix + (last ? "└── " : "├── ") + label);
      (current.children || []).forEach(function (child, index) {
        walk(child, prefix + (last ? "    " : "│   "), index === current.children.length - 1);
      });
    }
    (node.children || []).forEach(function (child, index) {
      walk(child, "", index === node.children.length - 1);
    });
    return lines.join("\n");
  }

  function help() {
    return [
      "Available commands:",
      "  ls [path]      List directory contents",
      "  cd [path]      Change directory",
      "  cat <file>     Show raw Markdown",
      "  pwd            Print working directory",
      "  open <file>    Open a page",
      "  tree [path]    Show directory tree",
      "  clear          Clear the terminal",
      "  exit           Close the terminal",
      "  help           Show this help",
    ].join("\n");
  }

  function execute(value) {
    var parts = value.trim().split(/\s+/);
    var command = parts.shift().toLowerCase();
    if (!command) return "";
    if (command === "ls") return list(parts);
    if (command === "cd") return changeDirectory(parts);
    if (command === "cat") return cat(parts);
    if (command === "pwd") return terminal.cwd;
    if (command === "open") return openNode(parts);
    if (command === "tree") return tree(parts);
    if (command === "help") return help();
    if (command === "clear") return "__CLEAR__";
    if (command === "exit" || command === "quit") {
      toggleTerminal(false);
      return "";
    }
    return escapeHtml(command) + ": command not found. Type 'help'.";
  }

  function toggleTerminal(open, instant) {
    var overlay = document.getElementById("ssh-terminal-overlay");
    var input = document.getElementById("ssh-terminal-input");
    if (!overlay) return;
    overlay.classList.toggle("is-instant", !!instant);
    overlay.classList.toggle("is-open", open);
    localStorage.setItem(TERMINAL_KEY, String(open));
    if (open && input) input.focus();
    if (instant) window.setTimeout(function () { overlay.classList.remove("is-instant"); }, 0);
  }

  async function initTerminal() {
    var overlay = document.getElementById("ssh-terminal-overlay");
    var output = document.getElementById("ssh-terminal-output");
    var input = document.getElementById("ssh-terminal-input");
    var promptElement = document.getElementById("ssh-terminal-prompt");
    var openButton = document.getElementById("ssh-terminal-open");
    var closeButton = document.getElementById("ssh-terminal-close");
    if (!overlay || !output || !input) return;

    var rootPromise = null;

    function updatePrompt() {
      if (promptElement) promptElement.innerHTML = prompt();
    }
    function append(html) {
      output.innerHTML += html;
      output.scrollTop = output.scrollHeight;
    }
    async function ensureRoot() {
      if (terminal.root) return true;
      if (!rootPromise) rootPromise = loadRoot();
      terminal.root = await rootPromise;
      if (!terminal.root) {
        output.textContent = language() === "es"
          ? "No fue posible cargar el árbol de contenido."
          : "The content tree could not be loaded.";
        return false;
      }

      var currentPath = document.documentElement.getAttribute("data-infra-path") || "";
      var section = currentPath.split("/").filter(Boolean).filter(function (part) { return !/^content_/.test(part); })[0];
      if (section && getNode("/" + section)) terminal.cwd = "/" + section;
      append('<div class="term-result term-welcome">betancourt.work — infrastructure mode\nType "help" for available commands.\n</div>');
      updatePrompt();
      return true;
    }
    function process() {
      var value = input.value;
      if (!value.trim()) return;
      terminal.history.push(value);
      terminal.historyIndex = terminal.history.length;
      append('<div class="term-line">' + prompt() + escapeHtml(value) + "</div>");
      var result = execute(value);
      if (result === "__CLEAR__") output.textContent = "";
      else if (result) append('<div class="term-result">' + result + "</div>");
      input.value = "";
      updatePrompt();
    }

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        process();
      } else if (event.key === "ArrowUp" && terminal.historyIndex > 0) {
        event.preventDefault();
        terminal.historyIndex -= 1;
        input.value = terminal.history[terminal.historyIndex];
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        terminal.historyIndex = Math.min(terminal.history.length, terminal.historyIndex + 1);
        input.value = terminal.history[terminal.historyIndex] || "";
      }
    });
    overlay.querySelector(".ssh-terminal-body")?.addEventListener("click", function () { input.focus(); });
    if (openButton) openButton.addEventListener("click", async function () {
      if (await ensureRoot()) toggleTerminal(true);
    });
    if (closeButton) closeButton.addEventListener("click", function () { toggleTerminal(false); });
    document.addEventListener("keydown", async function (event) {
      if (event.ctrlKey && event.key === "`") {
        event.preventDefault();
        var opening = !overlay.classList.contains("is-open");
        if (!opening || await ensureRoot()) toggleTerminal(opening, true);
      } else if (event.key === "Escape" && overlay.classList.contains("is-open")) {
        toggleTerminal(false, true);
      }
    });
    if (localStorage.getItem(TERMINAL_KEY) === "true") {
      ensureRoot().then(function (ready) { if (ready) toggleTerminal(true, true); });
    }
  }

  function init() {
    initMode();
    initTerminal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
