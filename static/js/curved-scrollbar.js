(function () {
  "use strict";

  var root = document.documentElement;
  var mobileMedia = window.matchMedia("(max-width: 720px)");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var frameRequested = false;
  var isDragging = false;
  var capturedPointerElement = null;
  var scrollMax = 0;
  var pathLength = 0;
  var viewportWidth = 0;
  var viewportHeight = 0;
  var geometryKey = "";
  var elements = null;

  var MIN_SCROLLABLE_DISTANCE = 16;
  var POINTER_SAMPLE_COUNT = 96;
  var SEGMENT_LENGTH_DESKTOP = 140;
  var SEGMENT_LENGTH_MOBILE = 112;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createScrollbar() {
    var container = document.createElement("div");
    container.className = "curved-scrollbar";
    container.setAttribute("aria-hidden", "true");

    container.innerHTML = [
      '<svg class="curved-scrollbar__svg" viewBox="0 0 1 1" focusable="false">',
      '<path class="curved-scrollbar__hit-area" d="" />',
      '<path class="curved-scrollbar__track" d="" />',
      '<path class="curved-scrollbar__progress" d="" />',
      '</svg>'
    ].join("");

    document.body.appendChild(container);

    elements = {
      container: container,
      svg: container.querySelector(".curved-scrollbar__svg"),
      hitArea: container.querySelector(".curved-scrollbar__hit-area"),
      track: container.querySelector(".curved-scrollbar__track"),
      progress: container.querySelector(".curved-scrollbar__progress")
    };

    updateGeometry();

    elements.hitArea.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
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
    return scrollMax > MIN_SCROLLABLE_DISTANCE;
  }

  function getGeometry() {
    var rect = elements.svg.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var isMobile = mobileMedia.matches;
    var edge = isMobile ? 4 : 8;
    var radius = isMobile ? 26 : 40;
    var topRun = isMobile ? 260 : 420;
    var right = getRightEdge(width, edge, isMobile);
    var top = edge;
    var bottom = height - edge;
    var startX = Math.max(edge, right - topRun);

    startX = Math.min(startX, right - 16);
    radius = clamp(radius, 16, Math.max(16, Math.min(right - startX, bottom - top)));

    return {
      bottom: bottom,
      edge: edge,
      height: height,
      radius: radius,
      right: right,
      startX: startX,
      top: top,
      width: width
    };
  }

  function getRightEdge(width, edge, isMobile) {
    if (isMobile) {
      return width - edge;
    }

    var layout = document.querySelector(".layout");
    if (!layout) {
      return width - edge;
    }

    var rect = layout.getBoundingClientRect();
    var style = window.getComputedStyle(layout);
    var paddingRight = Number(String(style.paddingRight).replace("px", "")) || 0;
    var layoutRight = rect.right - paddingRight;

    return clamp(Math.round(layoutRight), Math.round(width * 0.55), width - edge);
  }

  function pathFor(geometry) {
    return [
      "M", geometry.startX, geometry.top,
      "L", geometry.right - geometry.radius, geometry.top,
      "Q", geometry.right, geometry.top, geometry.right, geometry.top + geometry.radius,
      "L", geometry.right, geometry.bottom
    ].join(" ");
  }

  function updateGeometry() {
    var geometry = getGeometry();
    var nextGeometryKey = [
      geometry.width,
      geometry.height,
      geometry.right,
      geometry.startX,
      geometry.top,
      geometry.bottom
    ].join(":");

    if (nextGeometryKey === geometryKey && pathLength > 0) {
      return;
    }

    viewportWidth = geometry.width;
    viewportHeight = geometry.height;
    geometryKey = nextGeometryKey;

    var path = pathFor(geometry);
    elements.svg.setAttribute("viewBox", "0 0 " + geometry.width + " " + geometry.height);
    elements.hitArea.setAttribute("d", path);
    elements.track.setAttribute("d", path);
    elements.progress.setAttribute("d", path);

    pathLength = elements.track.getTotalLength();
    var segmentLength = getSegmentLength();
    elements.progress.style.strokeDasharray = segmentLength + " " + pathLength;
  }

  function getSegmentLength() {
    var preferredLength = mobileMedia.matches ? SEGMENT_LENGTH_MOBILE : SEGMENT_LENGTH_DESKTOP;
    return Math.min(preferredLength, Math.max(24, pathLength * 0.42));
  }

  function updateVisual(progress) {
    if (!pathLength) {
      return;
    }

    var segmentLength = getSegmentLength();
    var travel = Math.max(0, pathLength - segmentLength);
    elements.progress.style.strokeDashoffset = String(-travel * progress);
  }

  function update() {
    frameRequested = false;
    updateGeometry();

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
    var x = clamp(event.clientX - rect.left, 0, viewportWidth);
    var y = clamp(event.clientY - rect.top, 0, viewportHeight);
    var bestLength = 0;
    var bestDistance = Infinity;

    for (var i = 0; i <= POINTER_SAMPLE_COUNT; i++) {
      var length = (pathLength * i) / POINTER_SAMPLE_COUNT;
      var point = elements.track.getPointAtLength(length);
      var distance = Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestLength = length;
      }
    }

    return pathLength === 0 ? 0 : bestLength / pathLength;
  }

  function scrollToProgress(progress, smooth) {
    scrollMax = getScrollMax();
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
    capturedPointerElement = event.currentTarget;
    elements.container.classList.add("is-dragging");

    if (capturedPointerElement.setPointerCapture) {
      capturedPointerElement.setPointerCapture(event.pointerId);
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

    if (event && capturedPointerElement && capturedPointerElement.releasePointerCapture) {
      try {
        capturedPointerElement.releasePointerCapture(event.pointerId);
      } catch (error) {}
    }
    capturedPointerElement = null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    createScrollbar();
    update();

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    mobileMedia.addEventListener("change", requestUpdate);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", requestUpdate);
    }
  });
})();
