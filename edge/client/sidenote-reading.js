(function () {
  function init() {
    var endnotes = document.querySelector(".post-body > .sidenote-endnotes");
    var rail = document.getElementById("sidenote-rail");
    if (!endnotes || !rail) return;

    var placeholder = document.createElement("span");
    placeholder.hidden = true;
    placeholder.setAttribute("data-sidenote-placeholder", "");
    endnotes.before(placeholder);

    var desktop = window.matchMedia("(min-width: 1001px)");
    var graph = document.querySelector(".sidenote-sidebar-graph");
    var printMode = false;
    var frame = 0;

    function resetPositions() {
      endnotes.querySelectorAll(".sidenote-item").forEach(function (item) {
        item.style.removeProperty("top");
      });
      rail.style.removeProperty("min-height");
    }

    function restoreEndnotes() {
      resetPositions();
      endnotes.classList.remove("is-in-rail");
      placeholder.after(endnotes);
    }

    function positionRailNotes() {
      if (!endnotes.classList.contains("is-in-rail")) return;
      var article = document.querySelector(".post--has-sidenotes");
      var railTop = rail.getBoundingClientRect().top;
      var nextTop = 0;

      endnotes.querySelectorAll(".sidenote-item").forEach(function (item) {
        var number = item.getAttribute("data-sidenote-number");
        var reference = document.getElementById("sidenote-ref-" + number + "-1");
        var wanted = reference ? reference.getBoundingClientRect().top - railTop - 2 : nextTop;
        var top = Math.max(wanted, nextTop);
        item.style.top = Math.round(top) + "px";
        nextTop = top + item.offsetHeight + 22;
      });

      var remainingArticleHeight = article
        ? Math.max(0, article.getBoundingClientRect().bottom - railTop)
        : 0;
      rail.style.minHeight = Math.ceil(Math.max(remainingArticleHeight, nextTop)) + "px";
    }

    function schedulePosition() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        positionRailNotes();
      });
    }

    function positionRailNotesNow() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      positionRailNotes();
    }

    function setGraphCollapsed(collapsed) {
      if (!graph || graph.classList.contains("is-zen-collapsed") === collapsed) return;
      graph.classList.toggle("is-zen-collapsed", collapsed);
      positionRailNotesNow();
    }

    function syncGraphZenState() {
      if (!document.body.classList.contains("zen-mode")) {
        setGraphCollapsed(false);
      } else if (graph && graph.classList.contains("is-zen-collapsed")) {
        positionRailNotesNow();
      }
    }

    function syncPlacement() {
      var useRail = desktop.matches && !printMode;
      if (!useRail) {
        restoreEndnotes();
        return;
      }
      endnotes.classList.add("is-in-rail");
      rail.append(endnotes);
      schedulePosition();
    }

    desktop.addEventListener("change", function () {
      var startsCollapsed = desktop.matches && document.body.classList.contains("zen-mode");
      if (graph) graph.classList.toggle("is-zen-collapsed", startsCollapsed);
      syncPlacement();
      if (startsCollapsed) positionRailNotesNow();
    });
    window.addEventListener("resize", schedulePosition, { passive: true });
    window.addEventListener("load", schedulePosition, { once: true });
    window.addEventListener("beforeprint", function () {
      printMode = true;
      restoreEndnotes();
    });
    window.addEventListener("afterprint", function () {
      printMode = false;
      syncPlacement();
    });
    new MutationObserver(function () {
      syncPlacement();
      syncGraphZenState();
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    if ("ResizeObserver" in window) {
      var article = document.querySelector(".post--has-sidenotes");
      if (article) new ResizeObserver(schedulePosition).observe(article);
    }
    if (graph) {
      graph.addEventListener("transitionend", function (event) {
        if (
          event.target === graph &&
          event.propertyName === "opacity" &&
          desktop.matches &&
          document.body.classList.contains("zen-mode")
        ) setGraphCollapsed(true);
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePosition);

    var startsCollapsed = desktop.matches && document.body.classList.contains("zen-mode");
    if (graph && startsCollapsed) graph.classList.add("is-zen-collapsed");
    syncPlacement();
    if (startsCollapsed) positionRailNotesNow();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
