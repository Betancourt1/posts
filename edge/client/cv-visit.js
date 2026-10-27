// Inlined early in the public layout so the URL is cleaned before other scripts.
(function () {
  if (window.__cvVisitCaptured) return;
  window.__cvVisitCaptured = true;

  try {
    var url = new URL(window.location.href);
    var ids = url.searchParams.getAll("cv_id");
    if (!ids.length) return;
    url.searchParams.delete("cv_id");
    try {
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch (_) {}

    var id = ids[0];
    if (ids.length !== 1 || id.length < 16 || id.length > 64 || /[^A-Za-z0-9_-]/.test(id)) return;
    // No cookies, local/session storage, retry queue, or visitor identifier.
    // Failure must not interrupt the page or claim a successful receipt.
    window.fetch("/api/cv-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv_id: id }),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      keepalive: true,
    }).catch(function () {});
  } catch (_) {}
})();
