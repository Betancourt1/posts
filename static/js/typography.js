(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var toggleBtn = document.getElementById("typo-toggle");
    var dropdown = document.getElementById("typo-dropdown");
    if (!toggleBtn || !dropdown) return;

    // Toggle dropdown visibility
    toggleBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("is-active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target) && e.target !== toggleBtn) {
        dropdown.classList.remove("is-active");
      }
    });

    // Font Size Logic
    var currentSize = parseInt(localStorage.getItem("site_font_size")) || 100;
    var sizeMin = 76;
    var sizeMax = 140;
    var sizeStep = 8;

    var updateFontSize = function (newSize) {
      currentSize = Math.max(sizeMin, Math.min(sizeMax, newSize));
      document.documentElement.style.setProperty("--site-font-size", currentSize + "%");
      localStorage.setItem("site_font_size", currentSize);
      var resetBtn = document.getElementById("font-size-reset");
      if (resetBtn) {
        resetBtn.textContent = currentSize + "%";
      }
    };

    var decBtn = document.getElementById("font-size-dec");
    var resetBtn = document.getElementById("font-size-reset");
    var incBtn = document.getElementById("font-size-inc");

    if (decBtn) {
      decBtn.addEventListener("click", function () {
        updateFontSize(currentSize - sizeStep);
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        updateFontSize(100);
      });
      resetBtn.textContent = currentSize + "%";
    }
    if (incBtn) {
      incBtn.addEventListener("click", function () {
        updateFontSize(currentSize + sizeStep);
      });
    }

    // Font Type Logic
    var fontChoices = dropdown.querySelectorAll(".typo-btn-choice");
    var currentFont = localStorage.getItem("site_font_type") || "mono";

    var updateFontType = function (fontType) {
      var fontStack = "";
      if (fontType === "mono") {
        fontStack = '"JetBrains Mono", "IBM Plex Mono", monospace';
      } else if (fontType === "sans") {
        fontStack = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      } else if (fontType === "serif") {
        fontStack = 'Georgia, Cambria, "Times New Roman", Times, serif';
      }

      if (fontStack) {
        document.documentElement.style.setProperty("--article-font-family", fontStack);
        localStorage.setItem("site_font_type", fontType);
        currentFont = fontType;

        fontChoices.forEach(function (btn) {
          if (btn.getAttribute("data-font") === fontType) {
            btn.classList.add("is-active");
          } else {
            btn.classList.remove("is-active");
          }
        });
      }
    };

    fontChoices.forEach(function (btn) {
      var fontType = btn.getAttribute("data-font");
      // Set initial active state
      if (fontType === currentFont) {
        btn.classList.add("is-active");
      }
      btn.addEventListener("click", function () {
        updateFontType(fontType);
      });
    });
  });
})();
