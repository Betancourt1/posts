export const BOOK_BATCH_SIZE = 6;

export function nextBookBatch(remaining) {
  const revealCount = Math.min(BOOK_BATCH_SIZE, Math.max(0, remaining));
  const nextRemaining = Math.max(0, remaining - revealCount);

  return {
    revealCount,
    nextRemaining,
    nextLabelCount: Math.min(BOOK_BATCH_SIZE, nextRemaining),
  };
}

export function bookMoreLabel(template, count) {
  return template.replace("{count}", String(count));
}

export function initBookShelves(root = document) {
  root.querySelectorAll("[data-book-shelf]").forEach(function (shelf) {
    const button = shelf.querySelector("[data-book-more]");
    if (!button) return;

    button.addEventListener("click", function () {
      const hiddenRows = Array.from(shelf.querySelectorAll("[data-book-extra][hidden]"));
      const state = nextBookBatch(hiddenRows.length);
      const revealedRows = hiddenRows.slice(0, state.revealCount);

      revealedRows.forEach(function (row) {
        row.hidden = false;
      });

      if (state.nextRemaining === 0) {
        if (document.activeElement === button) {
          revealedRows[0]?.querySelector("a")?.focus({ preventScroll: true });
        }
        button.remove();
        return;
      }

      button.textContent = bookMoreLabel(button.dataset.labelTemplate, state.nextLabelCount);
    });
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initBookShelves();
    });
  } else {
    initBookShelves();
  }
}
