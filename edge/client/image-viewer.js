(function () {
  var dialog = document.querySelector("[data-image-viewer]");
  if (!dialog) return;
  var expandedImage = dialog.querySelector("img");
  var closeButton = dialog.querySelector("button");
  var opener = null;
  var openingAnimation = null;

  document.querySelectorAll(".post .post-body img, .post-featured-image img, .photo-post-figure img").forEach(function (image) {
    var trigger = image.closest("a") || image;
    image.classList.add("image-expandable");
    trigger.setAttribute("aria-haspopup", "dialog");
    if (trigger === image) {
      trigger.tabIndex = 0;
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-label", dialog.dataset.openLabel + (image.alt ? ": " + image.alt : ""));
      trigger.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openImage(event);
        }
      });
    }

    function openImage(event) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = trigger;
      var initial = image.getBoundingClientRect();
      expandedImage.src = image.currentSrc || image.src;
      expandedImage.alt = image.alt;
      expandedImage.width = image.naturalWidth;
      expandedImage.height = image.naturalHeight;
      dialog.showModal();
      document.documentElement.classList.add("image-viewer-open");
      var final = expandedImage.getBoundingClientRect();
      if (initial.width && initial.height && final.width && final.height && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        var x = initial.left + initial.width / 2 - final.left - final.width / 2;
        var y = initial.top + initial.height / 2 - final.top - final.height / 2;
        openingAnimation = expandedImage.animate([
          { transform: "translate(" + x + "px, " + y + "px) scale(" + initial.width / final.width + ", " + initial.height / final.height + ")" },
          { transform: "none" },
        ], { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
      }
    }

    trigger.addEventListener("click", openImage);
  });

  closeButton.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", function () {
    if (openingAnimation) openingAnimation.cancel();
    openingAnimation = null;
    document.documentElement.classList.remove("image-viewer-open");
    expandedImage.removeAttribute("src");
    if (opener) opener.focus({ preventScroll: true });
  });
})();
