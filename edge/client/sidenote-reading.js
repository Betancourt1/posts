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
    var noteDialog;
    var noteTrigger;

    function closeNote() {
      if (noteDialog && noteDialog.open) noteDialog.close();
    }

    document.addEventListener("click", function (event) {
      var reference = event.target.closest(".post-body .sidenote-reference a");
      if (!reference || desktop.matches || printMode || event.defaultPrevented ||
          event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var note = document.getElementById(reference.hash.slice(1));
      var copy = note && note.querySelector(".sidenote-copy");
      if (!copy || typeof HTMLDialogElement === "undefined") return;

      if (!noteDialog) {
        var spanish = document.documentElement.lang.startsWith("es");
        noteDialog = document.createElement("dialog");
        noteDialog.className = "sidenote-dialog";
        noteDialog.setAttribute("aria-labelledby", "sidenote-dialog-title");
        noteDialog.innerHTML = '<div class="sidenote-dialog-header"><h2 id="sidenote-dialog-title"></h2>' +
          '<button type="button" autofocus>' + (spanish ? "Cerrar" : "Close") + '</button></div>' +
          '<div class="sidenote-dialog-copy"></div>';
        document.body.append(noteDialog);
        noteDialog.querySelector("button").addEventListener("click", closeNote);
        noteDialog.addEventListener("click", function (click) {
          if (click.target !== noteDialog) return;
          var bounds = noteDialog.getBoundingClientRect();
          if (click.clientX < bounds.left || click.clientX > bounds.right ||
              click.clientY < bounds.top || click.clientY > bounds.bottom) closeNote();
        });
        noteDialog.addEventListener("close", function () {
          if (noteTrigger) noteTrigger.focus({ preventScroll: true });
        });
      }

      event.preventDefault();
      noteTrigger = reference;
      noteDialog.querySelector("h2").textContent =
        (document.documentElement.lang.startsWith("es") ? "Nota " : "Note ") +
        note.getAttribute("data-sidenote-number").padStart(2, "0");
      var dialogCopy = noteDialog.querySelector(".sidenote-dialog-copy");
      dialogCopy.replaceChildren(...copy.cloneNode(true).childNodes);
      noteDialog.showModal();
      dialogCopy.scrollTop = 0;
    });

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
      closeNote();
      var startsCollapsed = desktop.matches && document.body.classList.contains("zen-mode");
      if (graph) graph.classList.toggle("is-zen-collapsed", startsCollapsed);
      syncPlacement();
      if (startsCollapsed) positionRailNotesNow();
    });
    window.addEventListener("resize", schedulePosition, { passive: true });
    window.addEventListener("load", schedulePosition, { once: true });
    window.addEventListener("beforeprint", function () {
      closeNote();
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
