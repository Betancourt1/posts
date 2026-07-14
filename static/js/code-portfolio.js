(function () {
  var grid = document.querySelector("[data-github-grid]");
  var months = document.querySelector("[data-github-months]");
  var snapshot = document.querySelector("[data-github-snapshot]");
  var portfolio = document.querySelector("[data-code-portfolio]");
  var chart = document.querySelector(".code-github-chart");

  if (!grid || !months || !portfolio || !chart) return;

  var language = portfolio.dataset.language === "es" ? "es-MX" : "en-US";
  var monthFormatter = new Intl.DateTimeFormat(language, {
    month: "short",
    timeZone: "UTC",
  });
  var dateFormatter = new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  function renderDays(days) {
    var fragment = document.createDocumentFragment();

    days.forEach(function (day) {
      var cell = document.createElement("span");
      cell.className = "code-github-day code-github-day--" + day.level;
      cell.title = day.date + ": " + day.count;
      fragment.appendChild(cell);
    });

    grid.replaceChildren(fragment);
  }

  function renderMonths(items) {
    var fragment = document.createDocumentFragment();

    items.forEach(function (month) {
      var label = document.createElement("span");
      label.style.gridColumn = String(month.column);
      label.textContent = monthFormatter.format(new Date(month.firstDay + "T00:00:00Z"));
      fragment.appendChild(label);
    });

    months.replaceChildren(fragment);
  }

  fetch("/api/github-contributions", {
    headers: { Accept: "application/json" },
  })
    .then(function (response) {
      if (!response.ok) throw new Error("Contribution data unavailable");
      return response.json();
    })
    .then(function (payload) {
      if (!Array.isArray(payload.days) || !payload.days.length) return;
      renderDays(payload.days);
      renderMonths(payload.months || []);
      chart.style.setProperty(
        "--github-week-count",
        String(payload.weekCount || Math.ceil(payload.days.length / 7)),
      );
      if (snapshot && payload.endDate) {
        snapshot.textContent = dateFormatter.format(new Date(payload.endDate + "T00:00:00Z"));
      }
      portfolio.dataset.githubSource = "live";
    })
    .catch(function () {
      portfolio.dataset.githubSource = "snapshot";
    });
})();
