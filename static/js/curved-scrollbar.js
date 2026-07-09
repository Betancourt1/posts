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
  var targetProgress = 0;
  var visibleProgress = 0;
  var visualFrameRequested = false;
  var lastVisualFrameTime = 0;
  var hasVisibleProgress = false;
  var elements = null;

  var MIN_SCROLLABLE_DISTANCE = 16;
  var POINTER_SAMPLE_COUNT = 96;
  var SEGMENT_LENGTH_DESKTOP = 70;
  var SEGMENT_LENGTH_MOBILE = 56;
  var CORNER_LEAD_DESKTOP = 30;
  var CORNER_LEAD_MOBILE = 24;
  var EDGE_COMPRESSION_RANGE = 0.22;
  var COMPRESSED_LENGTH_SCALE = 0.42;
  var VISUAL_SETTLE_MS = 360;
  var DIRECT_SETTLE_DISTANCE = 0.002;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function smoothStep(value) {
    var progress = clamp(value, 0, 1);
    return progress * progress * (3 - 2 * progress);
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
    var cornerLead = isMobile ? CORNER_LEAD_MOBILE : CORNER_LEAD_DESKTOP;
    var right = getRightEdge(width, edge);
    var top = edge;
    var bottom = height - edge;
    var startX = Math.max(edge, right - radius - cornerLead);

    startX = Math.min(startX, right - 16);
    radius = clamp(radius, 16, Math.max(16, Math.min(right - startX, bottom - top)));

    return {
      bottom: bottom,
      edge: edge,
      height: height,
      radius: radius,
      right: right,
      cornerLead: cornerLead,
      startX: startX,
      top: top,
      width: width
    };
  }

  function getRightEdge(width, edge) {
    return width - edge;
  }

  function pathFor(geometry) {
    var bottomCurveStart = Math.max(geometry.top + geometry.radius, geometry.bottom - geometry.radius);
    var finishX = Math.max(geometry.edge, geometry.right - geometry.radius - geometry.cornerLead);

    return [
      "M", geometry.startX, geometry.top,
      "L", geometry.right - geometry.radius, geometry.top,
      "Q", geometry.right, geometry.top, geometry.right, geometry.top + geometry.radius,
      "L", geometry.right, bottomCurveStart,
      "Q", geometry.right, geometry.bottom, geometry.right - geometry.radius, geometry.bottom,
      "L", finishX, geometry.bottom
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
      geometry.bottom,
      geometry.radius,
      geometry.cornerLead
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
    var segmentLength = getSegmentLength(0);
    elements.progress.style.strokeDasharray = segmentLength + " " + pathLength;
  }

  function getSegmentLength(progress) {
    var preferredLength = mobileMedia.matches ? SEGMENT_LENGTH_MOBILE : SEGMENT_LENGTH_DESKTOP;
    var baseLength = Math.min(preferredLength, Math.max(24, pathLength * 0.42));
    var startCompression = 1 - smoothStep(progress / EDGE_COMPRESSION_RANGE);
    var endCompression = smoothStep((progress - (1 - EDGE_COMPRESSION_RANGE)) / EDGE_COMPRESSION_RANGE);
    var compression = Math.max(startCompression, endCompression);
    return Math.max(24, baseLength * (1 - (1 - COMPRESSED_LENGTH_SCALE) * compression));
  }

  function updateVisual(progress) {
    if (!pathLength) {
      return;
    }

    var segmentLength = getSegmentLength(progress);
    var travel = Math.max(0, pathLength - segmentLength);
    elements.progress.style.strokeDasharray = segmentLength + " " + pathLength;
    elements.progress.style.strokeDashoffset = String(-travel * progress);
  }

  function requestVisualFrame() {
    if (visualFrameRequested) {
      return;
    }
    visualFrameRequested = true;
    window.requestAnimationFrame(animateVisual);
  }

  function animateVisual(timestamp) {
    visualFrameRequested = false;

    if (!pathLength || !root.classList.contains("curved-scrollbar-active")) {
      lastVisualFrameTime = 0;
      return;
    }

    if (reducedMotion.matches) {
      visibleProgress = targetProgress;
      lastVisualFrameTime = 0;
      updateVisual(visibleProgress);
      return;
    }

    var delta = lastVisualFrameTime ? timestamp - lastVisualFrameTime : 16;
    var settleMs = isDragging ? 120 : VISUAL_SETTLE_MS;
    var easing = 1 - Math.pow(0.001, clamp(delta, 0, 64) / settleMs);
    var distance = targetProgress - visibleProgress;

    lastVisualFrameTime = timestamp;
    visibleProgress += distance * easing;

    if (Math.abs(targetProgress - visibleProgress) < DIRECT_SETTLE_DISTANCE) {
      visibleProgress = targetProgress;
    }

    updateVisual(visibleProgress);

    if (visibleProgress !== targetProgress) {
      requestVisualFrame();
    } else {
      lastVisualFrameTime = 0;
    }
  }

  function setTargetProgress(progress) {
    targetProgress = progress;

    if (!hasVisibleProgress || reducedMotion.matches) {
      visibleProgress = targetProgress;
      hasVisibleProgress = true;
      lastVisualFrameTime = 0;
      updateVisual(visibleProgress);
      return;
    }

    requestVisualFrame();
  }

  function update() {
    frameRequested = false;
    updateGeometry();

    var enabled = shouldEnable();
    root.classList.toggle("curved-scrollbar-active", enabled);

    if (!enabled || !elements) {
      targetProgress = 0;
      visibleProgress = 0;
      hasVisibleProgress = false;
      lastVisualFrameTime = 0;
      return;
    }

    var progress = scrollMax === 0 ? 0 : clamp(window.scrollY / scrollMax, 0, 1);
    setTargetProgress(progress);
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
