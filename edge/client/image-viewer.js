(function () {
  var dialog = document.querySelector("[data-image-viewer]");
  if (!dialog) return;
  var expandedImage = dialog.querySelector("img");
  var closeButton = dialog.querySelector("button");
  var opener = null;

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
      expandedImage.src = image.currentSrc || image.src;
      expandedImage.alt = image.alt;
      dialog.showModal();
      document.documentElement.classList.add("image-viewer-open");
    }

    trigger.addEventListener("click", openImage);
  });

  closeButton.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", function () {
    document.documentElement.classList.remove("image-viewer-open");
    expandedImage.removeAttribute("src");
    if (opener) opener.focus({ preventScroll: true });
  });
})();
