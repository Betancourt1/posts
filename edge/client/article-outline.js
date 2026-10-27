(function () {
  var outline = document.querySelector(".article-outline");
  if (!outline) return;
  var body = outline.parentElement.querySelector(".post-body");
  if (!body) return;
  var headings = Array.from(body.querySelectorAll(":scope > h2"));
  if (headings.length < Number(outline.dataset.minHeadings || 3)) return;
  var list = outline.querySelector("ol");
  headings.forEach(function (heading) {
    if (!heading.id) {
      var base = "section-" + (heading.textContent.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "heading");
      var id = base;
      var suffix = 2;
      while (document.getElementById(id)) id = base + "-" + suffix++;
      heading.id = id;
    }
    var item = document.createElement("li");
    var link = document.createElement("a");
    link.href = "#" + encodeURIComponent(heading.id);
    link.textContent = heading.textContent;
    if (outline.dataset.preview === "true") {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        heading.scrollIntoView();
      });
    }
    item.appendChild(link);
    list.appendChild(item);
  });
  outline.hidden = false;
  var firstBlock = body.firstElementChild;
  if (firstBlock && firstBlock.tagName === "H1") firstBlock.after(outline);
  outline.open = !window.matchMedia("(max-width: 720px)").matches;
})();
