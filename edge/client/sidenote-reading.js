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
      frame = window.requestAnimationFrame(positionRailNotes);
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

    desktop.addEventListener("change", syncPlacement);
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
    new MutationObserver(syncPlacement).observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    });
    var graph = document.querySelector(".sidenote-sidebar-graph");
    if ("ResizeObserver" in window) {
      var article = document.querySelector(".post--has-sidenotes");
      if (article) new ResizeObserver(schedulePosition).observe(article);
      if (graph) new ResizeObserver(schedulePosition).observe(graph);
    }
    if (graph) {
      graph.addEventListener("transitionend", function (event) {
        if (event.propertyName === "max-height" || event.propertyName === "margin-bottom") {
          schedulePosition();
        }
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePosition);

    syncPlacement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
