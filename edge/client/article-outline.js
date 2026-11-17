(function () {
  var outline = document.querySelector(".article-outline");
  if (!outline) return;
  var container = outline.closest(".post") || outline.parentElement;
  var body = container.querySelector(".post-body");
  if (!body) return;
  var headings = Array.from(body.querySelectorAll(":scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6"));
  if (headings.filter(function (heading) { return heading.tagName === "H2"; }).length < Number(outline.dataset.minHeadings || 3)) return;
  var list = outline.querySelector("ol");
  var links = [];
  headings.forEach(function (heading) {
    if (!heading.id) {
      var base = "section-" + (heading.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "heading");
      var id = base;
      var suffix = 2;
      while (document.getElementById(id)) id = base + "-" + suffix++;
      heading.id = id;
    }
    var item = document.createElement("li");
    if (heading.tagName !== "H2") item.className = "article-outline-" + heading.tagName.toLowerCase();
    var link = document.createElement("a");
    link.href = "#" + encodeURIComponent(heading.id);
    link.textContent = heading.textContent;
    if (outline.dataset.preview === "true") {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        heading.scrollIntoView();
      });
    }
    links.push(link);
    item.appendChild(link);
    list.appendChild(item);
  });
  outline.hidden = false;
  var firstBlock = body.firstElementChild;
  if (firstBlock && firstBlock.tagName === "H1") firstBlock.after(outline.closest(".article-outline-rail") || outline);
  outline.open = !window.matchMedia("(max-width: 720px)").matches;

  function updateCurrentSection() {
    var header = document.querySelector(".public-site .site-header");
    var threshold = header ? Math.max(110, header.getBoundingClientRect().bottom + 16) : 110;
    var current = 0;
    headings.forEach(function (heading, index) {
      if (heading.getBoundingClientRect().top <= threshold) current = index;
    });
    links.forEach(function (link, index) {
      if (index === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("scroll", updateCurrentSection, { passive: true });
  window.addEventListener("resize", updateCurrentSection, { passive: true });
  updateCurrentSection();
})();
