export const BOOK_BATCH_SIZE = 6;
const VIEW_STORAGE_KEY = "books-read-view";

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

export function matchesBookFilter(item, state) {
  const query = String(state.query || "").trim().toLocaleLowerCase("es");
  const shelf = String(state.shelf || "").trim().toLocaleLowerCase("es");
  const year = String(state.year || "").trim();
  const reviewedOnly = Boolean(state.reviewedOnly);

  if (query && !String(item.search || "").includes(query)) return false;
  if (shelf) {
    const shelves = String(item.shelves || "").split("|").filter(Boolean);
    if (!shelves.includes(shelf)) return false;
  }
  if (year && String(item.year || "") !== year) return false;
  if (reviewedOnly && !item.reviewed) return false;
  return true;
}

function readStoredView() {
  try {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return saved === "list" || saved === "grid" ? saved : "grid";
  } catch {
    return "grid";
  }
}

function writeStoredView(view) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // Ignore storage errors in private browsing modes.
  }
}

export function initBookShelves(root = document) {
  const es = root.documentElement?.lang === "es";
  const shelves = Array.from(root.querySelectorAll("[data-book-shelf]"));
  const controls = root.querySelector("[data-book-controls]");
  const searchInput = controls?.querySelector("[data-book-search-input]");
  const yearSelect = controls?.querySelector("[data-book-year-select]");
  const reviewToggle = controls?.querySelector("[data-book-review-toggle]");
  const shelfChips = Array.from(controls?.querySelectorAll("[data-book-shelf-chip]") || []);
  const filterStatus = controls?.querySelector("[data-book-filter-status]");
  const filterCount = controls?.querySelector("[data-book-filter-count]");
  const resetButtons = Array.from(root.querySelectorAll("[data-book-filter-reset]"));
  const emptyState = root.querySelector("[data-book-empty]");
  const viewTarget = root.querySelector("[data-book-view-target]");
  const viewButtons = Array.from(root.querySelectorAll("[data-book-view-btn]"));

  const state = {
    query: "",
    shelf: "",
    year: "",
    reviewedOnly: false,
  };

  function isFiltering() {
    return Boolean(state.query.trim() || state.shelf || state.year || state.reviewedOnly);
  }

  function updateMoreButton(shelfEl) {
    const button = shelfEl.querySelector("[data-book-more]");
    if (!button) return;
    if (isFiltering()) {
      button.hidden = true;
      return;
    }
    const hiddenRows = shelfEl.querySelectorAll("[data-book-extra][hidden]");
    if (hiddenRows.length === 0) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    const nextCount = Math.min(BOOK_BATCH_SIZE, hiddenRows.length);
    button.textContent = bookMoreLabel(button.dataset.labelTemplate, nextCount);
  }

  function applyFilters() {
    const filtering = isFiltering();
    let totalMatches = 0;

    shelves.forEach((shelfEl) => {
      const rows = Array.from(shelfEl.querySelectorAll("[data-book-item]"));
      const countEl = shelfEl.querySelector("[data-book-shelf-count]");
      let shelfMatches = 0;

      rows.forEach((row) => {
        const matches = matchesBookFilter(
          {
            search: row.dataset.bookSearch || "",
            shelves: row.dataset.bookShelves || "",
            year: row.dataset.bookYear || "",
            reviewed: row.dataset.bookReviewed === "true",
          },
          state,
        );

        if (filtering) {
          row.hidden = !matches;
          if (matches) shelfMatches += 1;
        } else {
          const isExtra = row.hasAttribute("data-book-extra");
          const wasRevealed = row.dataset.bookRevealed === "true";
          row.hidden = isExtra && !wasRevealed;
          shelfMatches += 1;
        }
      });

      if (countEl) {
        countEl.textContent = `(${shelfMatches})`;
      }
      shelfEl.hidden = filtering && shelfMatches === 0;
      totalMatches += shelfMatches;
      updateMoreButton(shelfEl);
    });

    if (filterStatus && filterCount) {
      filterStatus.hidden = !filtering;
      if (filtering) {
        filterCount.textContent = es
          ? `${totalMatches} ${totalMatches === 1 ? "libro" : "libros"}`
          : `${totalMatches} ${totalMatches === 1 ? "book" : "books"}`;
      }
    }

    if (emptyState) {
      emptyState.hidden = !filtering || totalMatches > 0;
    }
  }

  shelves.forEach((shelfEl) => {
    const button = shelfEl.querySelector("[data-book-more]");
    if (!button) return;

    button.addEventListener("click", () => {
      const hiddenRows = Array.from(shelfEl.querySelectorAll("[data-book-extra][hidden]"));
      const batch = nextBookBatch(hiddenRows.length);
      const revealedRows = hiddenRows.slice(0, batch.revealCount);

      revealedRows.forEach((row) => {
        row.hidden = false;
        row.dataset.bookRevealed = "true";
      });

      if (batch.nextRemaining === 0) {
        if (document.activeElement === button) {
          revealedRows[0]?.querySelector("a")?.focus({ preventScroll: true });
        }
        button.hidden = true;
        return;
      }

      button.textContent = bookMoreLabel(button.dataset.labelTemplate, batch.nextLabelCount);
    });
  });

  if (viewTarget && viewButtons.length > 0) {
    const applyView = (view) => {
      viewTarget.dataset.view = view;
      viewButtons.forEach((btn) => {
        const active = btn.dataset.bookViewBtn === view;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    };

    applyView(readStoredView());
    viewButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const nextView = btn.dataset.bookViewBtn === "list" ? "list" : "grid";
        applyView(nextView);
        writeStoredView(nextView);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value;
      applyFilters();
    });
  }

  if (yearSelect) {
    yearSelect.addEventListener("change", () => {
      state.year = yearSelect.value;
      applyFilters();
    });
  }

  if (reviewToggle) {
    reviewToggle.addEventListener("click", () => {
      state.reviewedOnly = !state.reviewedOnly;
      reviewToggle.classList.toggle("is-active", state.reviewedOnly);
      reviewToggle.setAttribute("aria-pressed", String(state.reviewedOnly));
      applyFilters();
    });
  }

  function setActiveShelf(slug) {
    state.shelf = slug;
    shelfChips.forEach((chip) => {
      const active = (chip.dataset.bookShelfChip || "") === slug;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
  }

  shelfChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const nextShelf = chip.dataset.bookShelfChip || "";
      setActiveShelf(state.shelf === nextShelf && nextShelf !== "" ? "" : nextShelf);
      applyFilters();
    });
  });

  resetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.query = "";
      state.year = "";
      state.reviewedOnly = false;
      if (searchInput) searchInput.value = "";
      if (yearSelect) yearSelect.value = "";
      if (reviewToggle) {
        reviewToggle.classList.remove("is-active");
        reviewToggle.setAttribute("aria-pressed", "false");
      }
      setActiveShelf("");
      applyFilters();
      searchInput?.focus({ preventScroll: true });
    });
  });

  if (typeof window !== "undefined") {
    const initialShelf = new URLSearchParams(window.location.search).get("shelf");
    if (initialShelf) {
      const normalized = initialShelf.trim().toLocaleLowerCase("es");
      const matchingChip = shelfChips.find((chip) => (chip.dataset.bookShelfChip || "") === normalized);
      if (matchingChip) {
        setActiveShelf(normalized);
      } else {
        state.shelf = normalized;
      }
      applyFilters();
    }
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initBookShelves();
    });
  } else {
    initBookShelves();
  }
}
