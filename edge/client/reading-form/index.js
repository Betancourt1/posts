import { readBookReading } from "../../../functions/_lib/book-content.js";

const dialog = document.querySelector("[data-reading-form]");
if (dialog) bindReadingForm(dialog);

function bindReadingForm(dialog) {
  const form = dialog.querySelector("form");
  const fields = form.querySelector("fieldset");
  const cancel = form.querySelector("[data-form-cancel]");
  const submit = form.querySelector("[type=submit]");
  const status = form.querySelector("[data-form-status]");
  const fullEditor = form.querySelector("[data-full-editor]");
  const isBook = dialog.dataset.readingForm === "book";
  const publishLabel = submit.textContent.trim();
  let target;
  let initialReading;
  let quoteSlug;
  let pendingQuote;
  let load;
  let saving = false;

  async function request(endpoint, payload, signal) {
    const response = await fetch(`/admin/api/${endpoint}`, payload ? {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    } : { signal });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Something went wrong.");
      error.saved = result.saved;
      throw error;
    }
    return result;
  }

  document.querySelectorAll("[data-reading-form-trigger]").forEach((trigger) => {
    trigger.addEventListener("click", async () => {
      target = trigger.dataset.readingFormTrigger;
      form.reset();
      submit.textContent = publishLabel;
      fields.disabled = submit.disabled = isBook;
      status.textContent = isBook ? "Loading book…" : "";

      if (isBook) {
        form.querySelector("[data-book-title]").textContent = "";
        fullEditor.dataset.sourcePath = target;
      } else {
        quoteSlug = `quote-${crypto.randomUUID()}`;
        pendingQuote = null;
      }
      dialog.showModal();
      if (!isBook) return;

      load = new AbortController();
      const { signal } = load;
      try {
        const book = await request(`page?${new URLSearchParams({ path: target })}`, null, signal);
        if (signal.aborted) return;
        initialReading = readBookReading(book.frontMatter, book.body);
        form.querySelector("[data-book-title]").textContent = book.frontMatter.title;
        for (const [name, value] of Object.entries(initialReading)) form.elements[name].value = value;
        status.textContent = "";
        fields.disabled = submit.disabled = false;
        if (document.activeElement === cancel) form.elements.progress.focus();
      } catch (error) {
        if (!signal.aborted) status.textContent = error.message;
      }
    });
  });

  cancel.addEventListener("click", () => {
    load?.abort();
    dialog.close();
  });
  dialog.addEventListener("cancel", (event) => {
    if (saving) event.preventDefault();
    else load?.abort();
  });
  form.elements.draft?.addEventListener("change", (event) => {
    submit.textContent = event.target.checked ? submit.dataset.draftLabel : publishLabel;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const data = pendingQuote || Object.fromEntries(new FormData(form));
    if (isBook && data.progress !== "") data.progress = String(form.elements.progress.valueAsNumber);
    if (!isBook && (!data.text.trim() || !data.author.trim())) {
      status.textContent = "Enter the quote text and author.";
      form.elements[data.text.trim() ? "author" : "text"].focus();
      return;
    }

    saving = fields.disabled = submit.disabled = cancel.disabled = true;
    if (fullEditor) fullEditor.disabled = true;
    status.textContent = "Saving…";
    let bookReading;
    try {
      if (isBook) {
        bookReading = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== initialReading[key]));
        const result = await request("save-page", { path: target, bookReading });
        Object.assign(initialReading, bookReading);
        const meta = result.frontMatter;
        if (meta.arena_enabled === true || meta.arena_block_id || meta.arena_blocks?.length) {
          status.textContent = "Syncing to Are.na…";
          const { arena } = await request("sync-arena", { path: target });
          if (arena.error) throw new Error(arena.error);
        }
      } else {
        const { tags, draft, ...quote } = data;
        await request("create-post", { notebook: target, slug: quoteSlug, tags, draft: Boolean(draft), quote });
      }
      window.location.assign(dialog.dataset.returnTo);
    } catch (error) {
      if (error.saved && isBook) Object.assign(initialReading, bookReading);
      if (error.saved && !isBook) {
        pendingQuote = data;
        submit.textContent = "Retry";
      }
      status.textContent = error.message;
      saving = submit.disabled = cancel.disabled = false;
      fields.disabled = Boolean(pendingQuote);
      if (fullEditor) fullEditor.disabled = false;
      submit.focus();
    }
  });
}
