(function () {
  var path = document.querySelector(".snail-path");
  var first = path && path.querySelector(".wandering-snail");
  if (!first) return;

  // Common to rare: 1, 2, 3, 4, 6, 8, 7.
  var designs = [
    { id: 1, weight: 28, colors: ["#3d2116", "#f1c18d", "#a65e32", "#e2a45c", "#663819", "#e58e86"] },
    { id: 2, weight: 23, colors: ["#354319", "#d5dd98", "#70872b", "#a6b647", "#43551d", "#e69b8e"] },
    { id: 3, weight: 18, colors: ["#57261e", "#f2bb9b", "#b9553c", "#e58260", "#803927", "#eb8f83"] },
    { id: 4, weight: 14, colors: ["#263445", "#b8c6d3", "#627e98", "#94adc0", "#3c5268", "#e6a2a2"] },
    { id: 6, weight: 9, colors: ["#783c4b", "#f6d9d5", "#eaa1ac", "#ffd5d6", "#ba7180", "#ec9a9f"] },
    { id: 8, weight: 6, colors: ["#382849", "#c0a3c6", "#654778", "#9773a6", "#4c345d", "#dc91a8"] },
    { id: 7, weight: 2, colors: ["#222222", "#ffffff", "#eeeeee", "#ffffff", "#444444", "#777777"] },
  ];
  var properties = ["--snail-outline", "--snail-body", "--snail-shell", "--snail-highlight", "--snail-spiral", "--snail-cheek"];
  var snails = [];
  var previousTime = 0;
  var lastBounds = "";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var header = document.querySelector(".site-header");
  var pointer = null;
  var activeSnail = null;
  var lang = document.documentElement.lang.startsWith("es") ? "es" : "en";
  var quotes = fetch("/api/snail-quotes?lang=" + lang)
    .then(function (response) { return response.ok ? response.json() : { quotes: [] }; })
    .then(function (data) { return Array.isArray(data.quotes) ? data.quotes : []; })
    .catch(function () { return []; });

  window.addEventListener("pointermove", function (event) {
    if (event.pointerType !== "touch") pointer = { x: event.clientX, y: event.clientY };
  });
  document.addEventListener("pointerleave", function () { pointer = null; });

  function bounds() {
    var bottom = Math.max(0, window.innerHeight - 44);
    return {
      maxX: Math.max(0, window.innerWidth - 54),
      minY: Math.min(bottom, header ? Math.max(0, header.getBoundingClientRect().bottom) : 0),
      maxY: bottom,
    };
  }

  function isFree(x, y, others) {
    return others.every(function (other) {
      return Math.abs(x - other.x) >= 58 || Math.abs(y - other.y) >= 48;
    });
  }

  function findSpace(x, y, area, others) {
    function valid(left, top) {
      return left >= 0 && left <= area.maxX && top >= area.minY && top <= area.maxY && isFree(left, top, others);
    }
    var offsets = [[0, 0], [58, 0], [-58, 0], [0, 48], [0, -48], [58, 48], [-58, 48], [58, -48], [-58, -48]];
    for (var i = 0; i < offsets.length; i++) {
      var left = x + offsets[i][0];
      var top = y + offsets[i][1];
      if (valid(left, top)) return { x: left, y: top };
    }
    var columns = [0, area.maxX, x];
    var rows = [area.minY, area.maxY, y];
    others.forEach(function (other) {
      columns.push(other.x - 58, other.x + 58);
      rows.push(other.y - 48, other.y + 48);
    });
    for (var row of rows) {
      for (var column of columns) {
        if (valid(column, row)) return { x: column, y: row };
      }
    }
    return null;
  }

  function fitSnails(area) {
    var placed = [];
    var ordered = activeSnail ? [activeSnail].concat(snails.filter(function (snail) { return snail !== activeSnail; })) : snails;
    ordered.forEach(function (snail) {
      var x = Math.max(0, Math.min(area.maxX, snail.x));
      var y = Math.max(area.minY, Math.min(area.maxY, snail.y));
      var space = findSpace(x, y, area, placed);
      snail.element.hidden = !space;
      if (!space) {
        snail.bubble.hidden = true;
        delete snail.element.dataset.reading;
        return;
      }
      snail.x = space.x;
      snail.y = space.y;
      placed.push(snail);
    });
  }

  function placeBubble(snail) {
    var bubble = snail.bubble;
    var area = bounds();
    var bubbleWidth = bubble.offsetWidth;
    var bubbleHeight = bubble.offsetHeight;
    var x = Math.max(0, Math.min(window.innerWidth - bubbleWidth, snail.x));
    var below = snail.y + 44;
    var y = below + bubbleHeight <= window.innerHeight ? below : snail.y - bubbleHeight;
    bubble.style.transform = "translate(" + x + "px, " + Math.max(area.minY, y) + "px)";
  }

  function giveQuote(snail) {
    quotes.then(function (available) {
      if (!available.length || activeSnail !== snail) return;
      var quote = snail.quote || available[Math.floor(Math.random() * available.length)];
      snail.quote = quote;
      var text = document.createElement("span");
      var author = document.createElement("span");
      text.textContent = '“' + quote.text + '”';
      author.textContent = "— " + quote.author;
      author.className = "snail-quote-author";
      snail.bubble.replaceChildren(text, author);
      snail.bubble.hidden = false;
      snail.element.dataset.reading = "true";
      placeBubble(snail);
    });
  }

  function chooseSnail(snail) {
    var total = designs.reduce(function (sum, design) { return sum + design.weight; }, 0);
    var draw = Math.random() * total;
    var chosen = designs.find(function (design) { draw -= design.weight; return draw < 0; }) || designs[designs.length - 1];
    snail.dataset.design = chosen.id;
    properties.forEach(function (property, index) { snail.style.setProperty(property, chosen.colors[index]); });
  }

  function setDirection(snail) {
    var angle = Math.random() * Math.PI * 2;
    snail.dx = Math.cos(angle) * 14;
    if (snail.element && snail.element.dataset.direction) {
      snail.dx = Math.abs(snail.dx) * (snail.element.dataset.direction === "left" ? -1 : 1);
    }
    snail.dy = Math.sin(angle) * 14;
    snail.turnIn = 3 + Math.random() * 5;
  }

  function turnAside(snail, others, area) {
    var choices = [
      { dx: -snail.dy, dy: snail.dx },
      { dx: snail.dy, dy: -snail.dx },
      { dx: -snail.dx, dy: -snail.dy },
    ];
    var direction = choices.find(function (choice) {
      var x = snail.x + choice.dx * 0.25;
      var y = snail.y + choice.dy * 0.25;
      return x >= 0 && x <= area.maxX && y >= area.minY && y <= area.maxY && isFree(x, y, others);
    });
    if (direction) {
      snail.dx = direction.dx;
      snail.dy = direction.dy;
    } else {
      setDirection(snail);
    }
    snail.avoidFor = 1.5;
    snail.turnIn = 1.5;
  }

  function addSnail(element, x, y) {
    var bubble = document.createElement("div");
    bubble.className = "snail-quote";
    bubble.hidden = true;
    path.appendChild(bubble);
    var area = bounds();
    var snail = { element: element, bubble: bubble, x: Math.min(area.maxX, x), y: Math.max(area.minY, Math.min(area.maxY, y)) };
    chooseSnail(element);
    delete element.dataset.direction;
    setDirection(snail);
    element.dataset.direction = snail.dx < 0 ? "left" : "right";
    snails.push(snail);
    element.style.transform = "translate(" + snail.x + "px, " + snail.y + "px)";
  }

  path.addEventListener("click", function (event) {
    var element = event.target.closest(".wandering-snail");
    var original = snails.find(function (snail) { return snail.element === element; });
    if (!original) return;
    snails.forEach(function (snail) {
      snail.bubble.hidden = true;
      delete snail.element.dataset.reading;
    });
    activeSnail = original;
    giveQuote(original);
    var copy = element.cloneNode(true);
    delete copy.dataset.reading;
    var area = bounds();
    var space = findSpace(original.x, original.y, area, snails.filter(function (snail) { return !snail.element.hidden; }));
    if (!space) return;
    path.appendChild(copy);
    addSnail(copy, space.x, space.y);
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest(".wandering-snail, .snail-quote")) return;
    activeSnail = null;
    snails.forEach(function (snail) {
      snail.bubble.hidden = true;
      delete snail.element.dataset.reading;
    });
  });

  function move(time) {
    var elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
    previousTime = time;
    var area = bounds();
    var boundsKey = [area.maxX, area.minY, area.maxY].join(":");
    if (boundsKey !== lastBounds) {
      fitSnails(area);
      lastBounds = boundsKey;
    }
    snails.forEach(function (snail) {
      if (snail.element.hidden) return;
      if (!reducedMotion.matches && snail.bubble.hidden && snail.turningFor > 0) {
        snail.turningFor = Math.max(0, snail.turningFor - elapsed);
      } else if (!reducedMotion.matches && snail.bubble.hidden) {
        var dx = pointer && pointer.x - (snail.x + 27);
        var dy = pointer && pointer.y - (snail.y + 22);
        var distance = pointer && Math.hypot(dx, dy);
        snail.avoidFor = Math.max(0, (snail.avoidFor || 0) - elapsed);
        if (distance && distance < 180 && !snail.avoidFor) {
          var speed = distance > 32 ? 18 : 0;
          var facing = snail.element.dataset.direction === "left" ? -1 : 1;
          snail.dx = dx * facing > 0 ? dx / distance * speed : 0;
          snail.dy = dy / distance * speed;
          snail.turnIn = 0;
        } else {
          snail.turnIn -= elapsed;
          if (snail.turnIn <= 0) setDirection(snail);
        }
        var proposedX = snail.x + snail.dx * elapsed;
        var proposedY = snail.y + snail.dy * elapsed;
        var hitX = (proposedX <= 0 && snail.dx < 0) || (proposedX >= area.maxX && snail.dx > 0);
        var hitY = (proposedY <= area.minY && snail.dy < 0) || (proposedY >= area.maxY && snail.dy > 0);
        var nextX = Math.max(0, Math.min(area.maxX, proposedX));
        var nextY = Math.max(area.minY, Math.min(area.maxY, proposedY));
        if (hitX) {
          nextX = snail.x;
          snail.dx *= -1;
        }
        if (hitY) snail.dy *= -1;
        var collided = hitX || hitY;
        if (collided) {
          snail.avoidFor = 1.5;
          snail.turnIn = 1.5;
        }
        var others = snails.filter(function (other) { return other !== snail && !other.element.hidden; });
        if (isFree(nextX, nextY, others)) {
          snail.x = nextX;
          snail.y = nextY;
        } else {
          turnAside(snail, others, area);
          collided = true;
        }
        if (collided && snail.dx) {
          var direction = snail.dx < 0 ? "left" : "right";
          if (direction !== snail.element.dataset.direction) {
            snail.element.dataset.direction = direction;
            snail.turningFor = 0.6;
          }
        }
      }
      snail.x = Math.max(0, Math.min(area.maxX, snail.x));
      snail.y = Math.max(area.minY, Math.min(area.maxY, snail.y));
      snail.element.style.transform = "translate(" + snail.x + "px, " + snail.y + "px)";
      if (!snail.bubble.hidden) placeBubble(snail);
    });
    requestAnimationFrame(move);
  }

  var area = bounds();
  addSnail(first, Math.random() * area.maxX, area.minY + Math.random() * (area.maxY - area.minY));
  requestAnimationFrame(move);
})();
