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
      var quote = available[Math.floor(Math.random() * available.length)];
      var text = document.createElement("span");
      var author = document.createElement("span");
      text.textContent = '“' + quote.text + '”';
      author.textContent = "— " + quote.author;
      author.className = "snail-quote-author";
      snail.bubble.replaceChildren(text, author);
      snail.bubble.hidden = false;
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
    snail.dx = Math.cos(angle) * 28;
    snail.dy = Math.sin(angle) * 28;
    snail.turnIn = 3 + Math.random() * 5;
  }

  function addSnail(element, x, y) {
    var bubble = document.createElement("div");
    bubble.className = "snail-quote";
    bubble.hidden = true;
    path.appendChild(bubble);
    var area = bounds();
    var snail = { element: element, bubble: bubble, x: Math.min(area.maxX, x), y: Math.max(area.minY, Math.min(area.maxY, y)) };
    chooseSnail(element);
    setDirection(snail);
    snails.push(snail);
    element.style.transform = "translate(" + snail.x + "px, " + snail.y + "px)";
  }

  path.addEventListener("click", function (event) {
    var element = event.target.closest(".wandering-snail");
    var original = snails.find(function (snail) { return snail.element === element; });
    if (!original) return;
    snails.forEach(function (snail) { snail.bubble.hidden = true; });
    activeSnail = original;
    giveQuote(original);
    var copy = element.cloneNode(true);
    var maxX = bounds().maxX;
    var x = original.x + 58 <= maxX ? original.x + 58 : Math.max(0, original.x - 58);
    path.appendChild(copy);
    addSnail(copy, x, original.y);
  });

  document.addEventListener("click", function (event) {
    if (event.target.closest(".wandering-snail, .snail-quote")) return;
    activeSnail = null;
    snails.forEach(function (snail) { snail.bubble.hidden = true; });
  });

  function move(time) {
    var elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
    previousTime = time;
    var area = bounds();
    snails.forEach(function (snail) {
      if (!reducedMotion.matches) {
        var dx = pointer && pointer.x - (snail.x + 27);
        var dy = pointer && pointer.y - (snail.y + 22);
        var distance = pointer && Math.hypot(dx, dy);
        if (distance && distance < 180) {
          var speed = distance > 32 ? 36 : 0;
          snail.dx = dx / distance * speed;
          snail.dy = dy / distance * speed;
          snail.turnIn = 0;
        } else {
          snail.turnIn -= elapsed;
          if (snail.turnIn <= 0) setDirection(snail);
        }
        snail.x += snail.dx * elapsed;
        snail.y += snail.dy * elapsed;
        if (snail.x < 0 || snail.x > area.maxX) snail.dx *= -1;
        if (snail.y < area.minY || snail.y > area.maxY) snail.dy *= -1;
      }
      snail.x = Math.max(0, Math.min(area.maxX, snail.x));
      snail.y = Math.max(area.minY, Math.min(area.maxY, snail.y));
      snail.element.style.transform = "translate(" + snail.x + "px, " + snail.y + "px)";
      snail.element.dataset.direction = snail.dx < 0 ? "left" : "right";
      if (!snail.bubble.hidden) placeBubble(snail);
    });
    requestAnimationFrame(move);
  }

  var area = bounds();
  addSnail(first, Math.random() * area.maxX, area.minY + Math.random() * (area.maxY - area.minY));
  requestAnimationFrame(move);
})();
