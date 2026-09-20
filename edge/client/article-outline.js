(function () {
  var outline = document.querySelector(".article-outline");
  if (!outline) return;
  var headings = Array.from(document.querySelectorAll(".post > .post-body > h2"));
  if (headings.length < 3) return;
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
    item.appendChild(link);
    list.appendChild(item);
  });
  outline.hidden = false;
  var firstBlock = document.querySelector(".post > .post-body > :first-child");
  if (firstBlock && firstBlock.tagName === "H1") firstBlock.after(outline);
  outline.open = !window.matchMedia("(max-width: 720px)").matches;
})();
