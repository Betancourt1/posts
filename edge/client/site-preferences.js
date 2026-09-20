(function () {
  var preferences = document.getElementById("site-preferences");
  if (!preferences) return;
  var mobile = window.matchMedia("(max-width: 1000px)");
  function syncLayout() { preferences.open = !mobile.matches; }
  mobile.addEventListener("change", syncLayout);
  syncLayout();
  document.addEventListener("click", function (event) {
    if (mobile.matches && preferences.open && !preferences.contains(event.target)) preferences.open = false;
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && mobile.matches && preferences.open) {
      preferences.open = false;
      preferences.querySelector("summary").focus();
    }
  });
})();
