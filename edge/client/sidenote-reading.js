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

      rail.style.minHeight = Math.ceil(Math.max(article ? article.offsetHeight : 0, nextTop)) + "px";
    }

    function schedulePosition() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(positionRailNotes);
    }

    function syncPlacement() {
      var useRail = desktop.matches && !printMode && !document.body.classList.contains("zen-mode");
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
    if ("ResizeObserver" in window) {
      var article = document.querySelector(".post--has-sidenotes");
      if (article) new ResizeObserver(schedulePosition).observe(article);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedulePosition);

    var graphDialog = document.getElementById("sidenote-graph-dialog");
    var graphOpen = document.querySelector("[data-sidenote-graph-open]");
    var graphClose = document.getElementById("sidenote-graph-close");
    if (graphDialog && graphOpen && graphClose) {
      graphOpen.addEventListener("click", function () {
        graphDialog.showModal();
        window.requestAnimationFrame(function () {
          window.dispatchEvent(new Event("resize"));
        });
      });
      graphClose.addEventListener("click", function () { graphDialog.close(); });
      graphDialog.addEventListener("click", function (event) {
        if (event.target === graphDialog) graphDialog.close();
      });
    }

    syncPlacement();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
