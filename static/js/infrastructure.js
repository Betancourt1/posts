/* Infrastructure Mode — exposed raw content + SSH-like terminal navigation */
(function () {
  "use strict";

  var STORAGE_KEY = "infra_mode_enabled";
  var TERMINAL_STORAGE_KEY = "infra_terminal_open";

  /* ── helpers ── */
  function isInfraMode() {
    return document.documentElement.classList.contains("infra-mode");
  }

  /* ── Infrastructure mode toggle ── */
  function updateInfraToggleState(btn, active) {
    var lang = document.documentElement.lang || "es";
    if (active) {
      btn.classList.add("is-active");
      if (lang === "en") {
        btn.setAttribute("aria-label", "Disable infrastructure mode");
        btn.setAttribute("title", "Disable infrastructure mode");
      } else {
        btn.setAttribute("aria-label", "Desactivar modo infraestructura");
        btn.setAttribute("title", "Desactivar modo infraestructura");
      }
    } else {
      btn.classList.remove("is-active");
      if (lang === "en") {
        btn.setAttribute("aria-label", "Enable infrastructure mode");
        btn.setAttribute("title", "Enable infrastructure mode");
      } else {
        btn.setAttribute("aria-label", "Activar modo infraestructura");
        btn.setAttribute("title", "Activar modo infraestructura");
      }
    }
  }

  function initInfraToggle() {
    var btn = document.getElementById("infra-toggle");
    if (!btn) return;

    var isActive = localStorage.getItem(STORAGE_KEY) === "true";
    if (isActive) {
      enableInfra();
    }
    updateInfraToggleState(btn, isActive);

    btn.addEventListener("click", function () {
      var active = !isInfraMode();
      if (active) {
        enableInfra();
        localStorage.setItem(STORAGE_KEY, "true");
      } else {
        disableInfra();
        localStorage.setItem(STORAGE_KEY, "false");
      }
      updateInfraToggleState(btn, active);
    });
  }

  function enableInfra() {
    document.documentElement.classList.add("infra-mode");
  }

  function disableInfra() {
    document.documentElement.classList.remove("infra-mode");
  }

  /* ── SSH Terminal ── */
  var terminal = {
    cwd: "/",
    history: [],
    historyIndex: -1,
    siteMap: null
  };

  function buildSiteMap() {
    /* Build from the data injected by Hugo into #infra-sitemap */
    var el = document.getElementById("infra-sitemap");
    if (!el) return null;
    try {
      var data = JSON.parse(el.textContent);
      /* Hugo jsonify may double-encode; unwrap if we got a string */
      if (typeof data === "string") data = JSON.parse(data);
      return data;
    } catch (e) {
      return null;
    }
  }

  function resolvePath(cwd, target) {
    if (target === "/") return "/";
    var parts;
    if (target.charAt(0) === "/") {
      parts = target.split("/").filter(Boolean);
    } else {
      parts = cwd.split("/").filter(Boolean).concat(target.split("/").filter(Boolean));
    }
    var resolved = [];
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === "..") {
        resolved.pop();
      } else if (parts[i] !== ".") {
        resolved.push(parts[i]);
      }
    }
    return "/" + resolved.join("/");
  }

  function getNode(root, path) {
    if (path === "/") return root;
    var parts = path.split("/").filter(Boolean);
    var node = root;
    for (var i = 0; i < parts.length; i++) {
      if (!node || !node.children) return null;
      var found = null;
      for (var j = 0; j < node.children.length; j++) {
        if (node.children[j].name === parts[i]) {
          found = node.children[j];
          break;
        }
      }
      if (!found) return null;
      node = found;
    }
    return node;
  }

  function formatPrompt(cwd) {
    return '<span class="term-user">visitor@betancourt</span>:<span class="term-path">' + escapeHtml(cwd) + '</span>$ ';
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function cmdLs(args) {
    var target = args[0] ? resolvePath(terminal.cwd, args[0]) : terminal.cwd;
    var node = getNode(terminal.siteMap, target);
    if (!node) return "ls: cannot access '" + escapeHtml(args[0] || target) + "': No such file or directory";
    if (node.type === "file") return node.name;
    if (!node.children || node.children.length === 0) return "(empty)";
    var lines = [];
    for (var i = 0; i < node.children.length; i++) {
      var c = node.children[i];
      if (c.type === "dir") {
        lines.push('<span class="term-dir">' + escapeHtml(c.name) + '/</span>');
      } else {
        lines.push(escapeHtml(c.name));
      }
    }
    return lines.join("  ");
  }

  function cmdCd(args) {
    if (!args[0] || args[0] === "~") {
      terminal.cwd = "/";
      return "";
    }
    var target = resolvePath(terminal.cwd, args[0]);
    var node = getNode(terminal.siteMap, target);
    if (!node) return "cd: no such file or directory: " + escapeHtml(args[0]);
    if (node.type === "file") return "cd: not a directory: " + escapeHtml(args[0]);
    terminal.cwd = target === "" ? "/" : target;
    return "";
  }

  function cmdCat(args) {
    if (!args[0]) return "cat: missing operand";
    var target = resolvePath(terminal.cwd, args[0]);
    var node = getNode(terminal.siteMap, target);
    if (!node) return "cat: " + escapeHtml(args[0]) + ": No such file or directory";
    if (node.type === "dir") return "cat: " + escapeHtml(args[0]) + ": Is a directory";
    if (node.content) return '<pre class="term-file-content">' + escapeHtml(node.content) + '</pre>';
    if (node.url) return "# Navigate to: " + escapeHtml(node.url) + "\n(use 'open " + escapeHtml(args[0]) + "' to visit)";
    return "(empty file)";
  }

  function cmdPwd() {
    return terminal.cwd;
  }

  function cmdOpen(args) {
    if (!args[0]) return "open: missing operand";
    var target = resolvePath(terminal.cwd, args[0]);
    var node = getNode(terminal.siteMap, target);
    if (!node) return "open: " + escapeHtml(args[0]) + ": No such file or directory";
    if (node.url) {
      window.location.href = node.url;
      return "Opening " + escapeHtml(node.url) + "...";
    }
    return "open: no URL associated with " + escapeHtml(args[0]);
  }

  function cmdTree(args) {
    var target = args[0] ? resolvePath(terminal.cwd, args[0]) : terminal.cwd;
    var node = getNode(terminal.siteMap, target);
    if (!node) return "tree: '" + escapeHtml(args[0] || target) + "': No such file or directory";
    if (node.type === "file") return escapeHtml(node.name);
    var lines = [];
    function walk(n, prefix, isLast) {
      var connector = isLast ? "└── " : "├── ";
      var display = n.type === "dir" ? '<span class="term-dir">' + escapeHtml(n.name) + '/</span>' : escapeHtml(n.name);
      lines.push(prefix + connector + display);
      if (n.children) {
        for (var i = 0; i < n.children.length; i++) {
          walk(n.children[i], prefix + (isLast ? "    " : "│   "), i === n.children.length - 1);
        }
      }
    }
    lines.push('<span class="term-dir">' + escapeHtml(target) + '</span>');
    if (node.children) {
      for (var i = 0; i < node.children.length; i++) {
        walk(node.children[i], "", i === node.children.length - 1);
      }
    }
    return lines.join("\n");
  }

  function cmdHelp() {
    return [
      "Available commands:",
      "  ls [path]      List directory contents",
      "  cd [path]      Change directory",
      "  cat <file>     Show file contents (raw markdown)",
      "  pwd            Print working directory",
      "  open <file>    Navigate to page in browser",
      "  tree [path]    Show directory tree",
      "  clear          Clear terminal",
      "  help           Show this help",
      "",
      "Navigation tips:",
      "  cd ..          Go up one level",
      "  cd /           Go to root",
      "  ↑/↓            Browse command history"
    ].join("\n");
  }

  function executeCommand(input) {
    var trimmed = input.trim();
    if (!trimmed) return "";
    var parts = trimmed.split(/\s+/);
    var cmd = parts[0].toLowerCase();
    var args = parts.slice(1);

    switch (cmd) {
      case "ls": return cmdLs(args);
      case "cd": return cmdCd(args);
      case "cat": return cmdCat(args);
      case "pwd": return cmdPwd();
      case "open": return cmdOpen(args);
      case "tree": return cmdTree(args);
      case "clear": return "__CLEAR__";
      case "help": return cmdHelp();
      case "exit":
      case "quit":
        toggleTerminal(false);
        return "";
      default:
        return escapeHtml(cmd) + ": command not found. Type 'help' for available commands.";
    }
  }

  function initTerminal() {
    var overlay = document.getElementById("ssh-terminal-overlay");
    var output = document.getElementById("ssh-terminal-output");
    var input = document.getElementById("ssh-terminal-input");
    var openBtn = document.getElementById("ssh-terminal-open");
    var closeBtn = document.getElementById("ssh-terminal-close");

    if (!overlay || !output || !input) return;

    terminal.siteMap = buildSiteMap();
    if (!terminal.siteMap) return;

    /* Determine initial cwd from current page section */
    var currentPath = document.documentElement.getAttribute("data-infra-path");
    if (currentPath) {
      /* Extract section from the path (e.g., content_es/posts/2026/... -> posts) */
      var pathParts = currentPath.split("/").filter(Boolean);
      /* The first part is the content dir (content_es, content_en), skip it */
      if (pathParts.length > 1 && /^content/.test(pathParts[0])) {
        pathParts.shift();
      }
      /* Use only the section (first remaining part) as cwd */
      var section = pathParts[0];
      var sectionNode = getNode(terminal.siteMap, "/" + section);
      if (sectionNode) {
        terminal.cwd = "/" + section;
      } else {
        terminal.cwd = "/";
      }
    }

    function appendOutput(html) {
      output.innerHTML += html;
      output.scrollTop = output.scrollHeight;
    }

    function showPrompt() {
      /* prompt is in the input line, not in output */
    }

    function processInput() {
      var val = input.value;
      terminal.history.push(val);
      terminal.historyIndex = terminal.history.length;

      appendOutput('<div class="term-line">' + formatPrompt(terminal.cwd) + escapeHtml(val) + '</div>');

      var result = executeCommand(val);
      if (result === "__CLEAR__") {
        output.innerHTML = "";
      } else if (result) {
        appendOutput('<div class="term-result">' + result + '</div>');
      }

      input.value = "";
      updateInputPrompt();
    }

    function updateInputPrompt() {
      var promptEl = document.getElementById("ssh-terminal-prompt");
      if (promptEl) promptEl.innerHTML = formatPrompt(terminal.cwd);
    }

    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        processInput();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (terminal.historyIndex > 0) {
          terminal.historyIndex--;
          input.value = terminal.history[terminal.historyIndex];
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (terminal.historyIndex < terminal.history.length - 1) {
          terminal.historyIndex++;
          input.value = terminal.history[terminal.historyIndex];
        } else {
          terminal.historyIndex = terminal.history.length;
          input.value = "";
        }
      }
    });

    /* Focus input when clicking terminal body (not titlebar/drag handle) */
    var termBody = overlay.querySelector(".ssh-terminal-body");
    if (termBody) {
      termBody.addEventListener("click", function () {
        input.focus();
      });
    }

    if (openBtn) {
      openBtn.addEventListener("click", function () {
        toggleTerminal(true);
      });
    }

    if (closeBtn) {
      var handleClose = function (e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTerminal(false);
      };
      closeBtn.addEventListener("click", handleClose);
      closeBtn.addEventListener("touchstart", handleClose);
      closeBtn.addEventListener("mousedown", handleClose);
    }

    /* Keyboard shortcut: Ctrl+` to toggle terminal */
    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        toggleTerminal(!overlay.classList.contains("is-open"));
      }
      if (e.key === "Escape" && overlay.classList.contains("is-open")) {
        toggleTerminal(false);
      }
    });

    /* Show welcome message with root listing */
    var welcome = [
      "betancourt.work — infrastructure mode",
      'Type "help" for available commands. Use Ctrl+` to toggle terminal.',
      ""
    ].join("\n");
    appendOutput('<div class="term-result term-welcome">' + welcome + '</div>');

    updateInputPrompt();

    /* Restore terminal state */
    if (localStorage.getItem(TERMINAL_STORAGE_KEY) === "true") {
      toggleTerminal(true);
    }
  }

  function toggleTerminal(open) {
    var overlay = document.getElementById("ssh-terminal-overlay");
    var input = document.getElementById("ssh-terminal-input");
    if (!overlay) return;
    if (open) {
      overlay.classList.add("is-open");
      if (input) input.focus();
      localStorage.setItem(TERMINAL_STORAGE_KEY, "true");
      /* Wait for transition then set margin */
      setTimeout(function () { updateContentMargin(overlay.offsetHeight); }, 260);
    } else {
      overlay.classList.remove("is-open");
      localStorage.setItem(TERMINAL_STORAGE_KEY, "false");
      updateContentMargin(0);
    }
  }

  /* ── Drag to resize terminal ── */
  function initDragResize() {
    var handle = document.getElementById("ssh-terminal-drag-handle");
    var overlay = document.getElementById("ssh-terminal-overlay");
    if (!handle || !overlay) return;

    var startY, startH;

    handle.addEventListener("mousedown", function (e) {
      e.preventDefault();
      startY = e.clientY;
      startH = overlay.offsetHeight;
      document.body.classList.add("terminal-resizing");
      overlay.style.transition = "none";
      document.addEventListener("mousemove", onDrag);
      document.addEventListener("mouseup", onRelease);
    });

    handle.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      startY = t.clientY;
      startH = overlay.offsetHeight;
      overlay.style.transition = "none";
      document.addEventListener("touchmove", onTouchDrag, { passive: false });
      document.addEventListener("touchend", onRelease);
    });

    function onDrag(e) {
      var newH = startH + (startY - e.clientY);
      applyHeight(newH);
    }

    function onTouchDrag(e) {
      e.preventDefault();
      var t = e.touches[0];
      var newH = startH + (startY - t.clientY);
      applyHeight(newH);
    }

    function applyHeight(h) {
      var minH = 120;
      var maxH = window.innerHeight - 60;
      h = Math.max(minH, Math.min(maxH, h));
      overlay.style.height = h + "px";
      updateContentMargin(h);
    }

    function onRelease() {
      document.body.classList.remove("terminal-resizing");
      overlay.style.transition = "";
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", onRelease);
      document.removeEventListener("touchmove", onTouchDrag);
      document.removeEventListener("touchend", onRelease);
    }
  }

  function updateContentMargin(h) {
    var layout = document.querySelector(".layout");
    var footer = document.querySelector(".site-footer");
    if (layout) layout.style.marginBottom = h + "px";
    if (footer) footer.style.marginBottom = h + "px";
  }

  /* ── Init ── */
  document.addEventListener("DOMContentLoaded", function () {
    initInfraToggle();
    initTerminal();
    initDragResize();
  });
})();
