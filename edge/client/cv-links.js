(function () {
  const root = document.querySelector("[data-cv-links]");
  if (!root) return;
  const strings = JSON.parse(root.dataset.strings);
  const form = root.querySelector("[data-cv-form]");
  const input = form.elements.cv_id;
  const submit = form.querySelector("button");
  const status = root.querySelector("[data-cv-status]");
  const list = root.querySelector("[data-cv-list]");
  const empty = root.querySelector("[data-cv-empty]");
  const template = root.querySelector("[data-cv-row]");
  const endpoint = "/admin/api/cv-attributions";
  let entries = [];

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle("is-error", error);
  }

  async function request(options) {
    const response = await fetch(endpoint, { credentials: "same-origin", ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw new Error(data.error === "id_invalid" ? strings.invalid : strings.unavailable);
    }
    return data;
  }

  function render() {
    list.replaceChildren();
    empty.hidden = entries.length > 0;
    empty.textContent = strings.empty;
    for (const entry of entries) {
      const row = template.content.cloneNode(true);
      row.querySelector("[data-cv-id]").textContent = entry.cv_id;
      const active = entry.enabled === 1 && entry.expires_at > Date.now() / 1000;
      row.querySelector("[data-cv-state]").textContent = !entry.enabled ? strings.disabled : active ? strings.active : strings.expired;
      const time = row.querySelector("[data-cv-expires]");
      const date = new Date(entry.expires_at * 1000);
      time.dateTime = date.toISOString();
      time.textContent = new Intl.DateTimeFormat(root.dataset.lang, { dateStyle: "medium" }).format(date);
      for (const lang of ["en", "es"]) {
        const url = new URL(lang === "es" ? "/es/about/" : "/about/", root.dataset.siteOrigin);
        url.searchParams.set("cv_id", entry.cv_id);
        const link = row.querySelector(`[data-cv-url="${lang}"]`);
        link.value = url.href;
        const button = row.querySelector(`[data-cv-copy="${lang}"]`);
        button.disabled = !active;
        button.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(link.value);
            message(strings.copied);
          } catch {
            link.focus();
            link.select();
            message(strings.copyFailed);
          }
        });
      }
      list.append(row);
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    input.value = input.value.trim() || crypto.randomUUID();
    submit.disabled = true;
    submit.textContent = strings.working;
    message("");
    try {
      const data = await request({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_id: input.value }),
      });
      entries = [data.attribution, ...entries.filter((entry) => entry.cv_id !== data.attribution.cv_id)];
      render();
      input.value = "";
      message(data.created ? strings.registered : strings.existing);
    } catch (error) {
      message(error.message, true);
    } finally {
      submit.disabled = false;
      submit.textContent = strings.register;
    }
  });

  submit.disabled = true;
  request().then((data) => {
    entries = data.attributions;
    render();
  }).catch((error) => {
    empty.hidden = true;
    message(error.message, true);
  }).finally(() => {
    submit.disabled = false;
  });
})();
