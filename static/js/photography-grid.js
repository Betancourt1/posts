(function () {
  "use strict";

  var grid = document.querySelector("[data-photo-grid]");
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll(":scope > .photo-card"));
  var images = cards.map(function (card) {
    return card.querySelector("img");
  }).filter(Boolean);
  var lastWidth = 0;
  var frameRequested = false;

  if (!cards.length) return;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getRatio(card) {
    var image = card.querySelector("img");
    if (!image) return 4 / 3;

    var width = image.naturalWidth || Number(image.getAttribute("width"));
    var height = image.naturalHeight || Number(image.getAttribute("height"));
    return width > 0 && height > 0 ? width / height : 4 / 3;
  }

  function rowCost(height, target, min, max, itemCount, hasMoreRows) {
    var deviation = (height - target) / target;
    var cost = deviation * deviation;

    if (height < min) {
      cost += 25 * Math.pow((min - height) / min, 2);
    }
    if (height > max) {
      cost += 25 * Math.pow((height - max) / max, 2);
    }
    if (itemCount === 1 && hasMoreRows) {
      cost += 0.35;
    }

    return cost;
  }

  function packRows(ratios, width, gap) {
    var mobile = width < 520;
    var target = mobile ? 150 : clamp(width * 0.24, 160, 220);
    var min = mobile ? 96 : 125;
    var max = mobile ? 230 : 285;
    var maxItems = mobile ? 3 : 5;
    var count = ratios.length;
    var plans = new Array(count + 1);
    var index;

    plans[count] = { cost: 0, next: count, height: 0 };

    for (index = count - 1; index >= 0; index -= 1) {
      var ratioSum = 0;
      var best = null;
      var end;

      for (end = index; end < count && end < index + maxItems; end += 1) {
        var itemCount = end - index + 1;
        var availableWidth = width - gap * (itemCount - 1);
        var height;
        var cost;

        ratioSum += ratios[end];
        if (availableWidth <= 0 || !plans[end + 1]) continue;

        height = availableWidth / ratioSum;
        cost = rowCost(height, target, min, max, itemCount, end + 1 < count)
          + plans[end + 1].cost;

        if (!best || cost < best.cost) {
          best = { cost: cost, next: end + 1, height: height };
        }
      }

      plans[index] = best;
    }

    var rows = [];
    index = 0;
    while (index < count) {
      var plan = plans[index];
      rows.push({ start: index, end: plan.next, height: plan.height });
      index = plan.next;
    }
    return rows;
  }

  function renderRows(width) {
    var styles = getComputedStyle(grid);
    var gap = parseFloat(styles.getPropertyValue("--photo-grid-column-gap")) || 14;
    var ratios = cards.map(getRatio);
    var rows = packRows(ratios, width, gap);
    var fragment = document.createDocumentFragment();

    rows.forEach(function (row) {
      var rowElement = document.createElement("div");
      var availableWidth = width - gap * (row.end - row.start - 1);
      var usedWidth = 0;

      rowElement.className = "photo-grid-row";

      cards.slice(row.start, row.end).forEach(function (card, offset) {
        var cardIndex = row.start + offset;
        var isLast = cardIndex === row.end - 1;
        var cardWidth = isLast
          ? availableWidth - usedWidth
          : row.height * ratios[cardIndex];

        card.style.width = cardWidth.toFixed(2) + "px";
        usedWidth += cardWidth;
        rowElement.appendChild(card);
      });

      fragment.appendChild(rowElement);
    });

    grid.replaceChildren(fragment);
    grid.classList.add("is-justified");
  }

  function layout() {
    frameRequested = false;
    var width = Math.round(grid.getBoundingClientRect().width);
    if (width <= 0 || width === lastWidth) return;

    lastWidth = width;
    renderRows(width);
  }

  function scheduleLayout() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(layout);
  }

  images.forEach(function (image) {
    image.loading = "eager";
  });

  Promise.all(images.map(function (image) {
    if (image.complete) return Promise.resolve();
    return new Promise(function (resolve) {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  })).then(function () {
    scheduleLayout();

    if ("ResizeObserver" in window) {
      new ResizeObserver(scheduleLayout).observe(grid);
    } else {
      window.addEventListener("resize", scheduleLayout);
    }
  });
})();
