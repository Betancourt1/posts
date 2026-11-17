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
    var snail = { element: element, x: x, y: y };
    chooseSnail(element);
    setDirection(snail);
    snails.push(snail);
    element.style.transform = "translate(" + x + "px, " + y + "px)";
  }

  path.addEventListener("click", function (event) {
    var element = event.target.closest(".wandering-snail");
    var original = snails.find(function (snail) { return snail.element === element; });
    if (!original) return;
    var copy = element.cloneNode(true);
    var maxX = Math.max(0, window.innerWidth - 54);
    var x = original.x + 58 <= maxX ? original.x + 58 : Math.max(0, original.x - 58);
    path.appendChild(copy);
    addSnail(copy, x, original.y);
  });

  function move(time) {
    var elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.1) : 0;
    previousTime = time;
    if (!reducedMotion.matches) {
      snails.forEach(function (snail) {
        snail.turnIn -= elapsed;
        if (snail.turnIn <= 0) setDirection(snail);
        var maxX = Math.max(0, window.innerWidth - 54);
        var maxY = Math.max(0, window.innerHeight - 44);
        snail.x += snail.dx * elapsed;
        snail.y += snail.dy * elapsed;
        if (snail.x < 0 || snail.x > maxX) snail.dx *= -1;
        if (snail.y < 0 || snail.y > maxY) snail.dy *= -1;
        snail.x = Math.max(0, Math.min(maxX, snail.x));
        snail.y = Math.max(0, Math.min(maxY, snail.y));
        snail.element.style.transform = "translate(" + snail.x + "px, " + snail.y + "px)";
        snail.element.dataset.direction = snail.dx < 0 ? "left" : "right";
      });
    }
    requestAnimationFrame(move);
  }

  addSnail(first, Math.random() * Math.max(0, window.innerWidth - 54), Math.random() * Math.max(0, window.innerHeight - 44));
  requestAnimationFrame(move);
})();
