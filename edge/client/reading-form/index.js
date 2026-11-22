import { readBookReading } from "../../../functions/_lib/book-content.js";

document.querySelectorAll("[data-reading-form]").forEach(bindReadingForm);

function bindReadingForm(dialog) {
  const form = dialog.querySelector("form");
  const fields = form.querySelector("fieldset");
  const cancel = form.querySelector("[data-form-cancel]");
  const submit = form.querySelector("[type=submit]");
  const status = form.querySelector("[data-form-status]");
  const fullEditor = form.querySelector("[data-full-editor]");
  const updating = dialog.dataset.readingForm === "book";
  const newBook = dialog.dataset.readingForm === "new-book";
  const draftOption = form.elements.draft;
  let target;
  let initialReading;
  let quoteSlug;
  let pendingCreation;
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

  function syncSubmitLabel() {
    if (draftOption) submit.textContent = draftOption.checked ? "Save draft" : submit.dataset.publishLabel;
  }

  const triggers = newBook ? "[data-new-book-form-trigger]" : "[data-reading-form-trigger]";
  document.querySelectorAll(triggers).forEach((trigger) => {
    trigger.addEventListener("click", async () => {
      target = trigger.dataset.newBookFormTrigger || trigger.dataset.readingFormTrigger;
      form.reset();
      syncSubmitLabel();
      fields.disabled = submit.disabled = updating;
      status.textContent = updating ? "Loading book…" : "";

      if (updating) {
        form.querySelector("[data-book-title]").textContent = "";
        fullEditor.dataset.sourcePath = target;
      } else {
        pendingCreation = null;
        if (newBook) fullEditor.dataset.notebook = target;
        else quoteSlug = `quote-${crypto.randomUUID()}`;
      }
      dialog.showModal();
      if (!updating) return;

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
  draftOption?.addEventListener("change", syncSubmitLabel);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    const data = pendingCreation || Object.fromEntries(new FormData(form));
    if (data.progress) data.progress = String(form.elements.progress.valueAsNumber);
    if (!updating) {
      const required = newBook ? ["title", "author"] : ["text", "author"];
      const missing = required.find((name) => !data[name].trim());
      if (missing) {
        status.textContent = newBook ? "Enter the book title and author." : "Enter the quote text and author.";
        form.elements[missing].focus();
        return;
      }
    }

    saving = fields.disabled = submit.disabled = cancel.disabled = true;
    if (fullEditor) fullEditor.disabled = true;
    status.textContent = "Saving…";
    let bookReading;
    try {
      if (updating) {
        bookReading = Object.fromEntries(Object.entries(data).filter(([key, value]) => value !== initialReading[key]));
        const result = await request("save-page", { path: target, bookReading });
        Object.assign(initialReading, bookReading);
        const meta = result.frontMatter;
        if (meta.arena_enabled === true || meta.arena_block_id || meta.arena_blocks?.length) {
          status.textContent = "Syncing to Are.na…";
          const { arena } = await request("sync-arena", { path: target });
          if (arena.error) throw new Error(arena.error);
        }
      } else if (newBook) {
        const { title, image, draft, ...book } = data;
        await request("create-post", { notebook: target, title, image, draft: Boolean(draft), book });
      } else {
        const { tags, draft, ...quote } = data;
        await request("create-post", { notebook: target, slug: quoteSlug, tags, draft: Boolean(draft), quote });
      }
      window.location.assign(dialog.dataset.returnTo);
    } catch (error) {
      if (error.saved && updating) Object.assign(initialReading, bookReading);
      if (error.saved && !updating) {
        pendingCreation = data;
        submit.textContent = "Retry";
      }
      status.textContent = error.message;
      saving = submit.disabled = cancel.disabled = false;
      fields.disabled = Boolean(pendingCreation);
      if (fullEditor) fullEditor.disabled = false;
      submit.focus();
    }
  });
}
