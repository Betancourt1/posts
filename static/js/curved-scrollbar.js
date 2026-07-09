(function () {
  "use strict";

  var root = document.documentElement;
  var desktopMedia = window.matchMedia("(min-width: 1001px) and (hover: hover) and (pointer: fine)");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var frameRequested = false;
  var isDragging = false;
  var scrollMax = 0;
  var pathLength = 0;
  var elements = null;

  var VIEWBOX_HEIGHT = 220;
  var PATH_START_Y = 8;
  var PATH_END_Y = 212;
  var MIN_SCROLLABLE_DISTANCE = 120;
  var PATH_D = "M28 8 C8 42 8 76 28 110 C48 144 48 178 28 212";

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createScrollbar() {
    var container = document.createElement("div");
    container.className = "curved-scrollbar";
    container.setAttribute("aria-hidden", "true");

    container.innerHTML = [
      '<svg class="curved-scrollbar__svg" viewBox="0 0 56 220" focusable="false">',
      '<path class="curved-scrollbar__track" d="' + PATH_D + '" />',
      '<path class="curved-scrollbar__progress" d="' + PATH_D + '" />',
      '<circle class="curved-scrollbar__thumb" cx="28" cy="8" r="4.5" />',
      '</svg>'
    ].join("");

    document.body.appendChild(container);

    elements = {
      container: container,
      svg: container.querySelector(".curved-scrollbar__svg"),
      track: container.querySelector(".curved-scrollbar__track"),
      progress: container.querySelector(".curved-scrollbar__progress"),
      thumb: container.querySelector(".curved-scrollbar__thumb")
    };

    pathLength = elements.track.getTotalLength();
    elements.progress.style.strokeDasharray = pathLength;
    elements.progress.style.strokeDashoffset = pathLength;

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", stopDragging);
    container.addEventListener("pointercancel", stopDragging);
  }

  function getScrollMax() {
    var documentHeight = Math.max(
      document.body.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.clientHeight,
      document.documentElement.scrollHeight,
      document.documentElement.offsetHeight
    );
    return Math.max(0, documentHeight - window.innerHeight);
  }

  function shouldEnable() {
    scrollMax = getScrollMax();
    return desktopMedia.matches && scrollMax > MIN_SCROLLABLE_DISTANCE;
  }

  function updateVisual(progress) {
    var point = elements.track.getPointAtLength(pathLength * progress);
    elements.thumb.setAttribute("cx", point.x);
    elements.thumb.setAttribute("cy", point.y);
    elements.progress.style.strokeDashoffset = String(pathLength * (1 - progress));
  }

  function update() {
    frameRequested = false;
    var enabled = shouldEnable();
    root.classList.toggle("curved-scrollbar-active", enabled);

    if (!enabled || !elements) {
      return;
    }

    var progress = scrollMax === 0 ? 0 : clamp(window.scrollY / scrollMax, 0, 1);
    updateVisual(progress);
  }

  function requestUpdate() {
    if (frameRequested) {
      return;
    }
    frameRequested = true;
    window.requestAnimationFrame(update);
  }

  function progressFromPointer(event) {
    var rect = elements.svg.getBoundingClientRect();
    var localY = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;
    return clamp((localY - PATH_START_Y) / (PATH_END_Y - PATH_START_Y), 0, 1);
  }

  function scrollToProgress(progress, smooth) {
    window.scrollTo({
      top: scrollMax * progress,
      behavior: smooth && !reducedMotion.matches ? "smooth" : "auto"
    });
  }

  function handlePointerDown(event) {
    if (!root.classList.contains("curved-scrollbar-active")) {
      return;
    }

    event.preventDefault();
    isDragging = true;
    elements.container.classList.add("is-dragging");

    if (elements.container.setPointerCapture) {
      elements.container.setPointerCapture(event.pointerId);
    }

    scrollToProgress(progressFromPointer(event), true);
  }

  function handlePointerMove(event) {
    if (!isDragging) {
      return;
    }

    event.preventDefault();
    scrollToProgress(progressFromPointer(event), false);
  }

  function stopDragging(event) {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    elements.container.classList.remove("is-dragging");

    if (event && elements.container.releasePointerCapture) {
      elements.container.releasePointerCapture(event.pointerId);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    createScrollbar();
    update();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    desktopMedia.addEventListener("change", requestUpdate);
  });
})();
