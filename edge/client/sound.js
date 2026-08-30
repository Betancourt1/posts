(function () {
  "use strict";

  var STORAGE_KEY = "site_sound_enabled";
  var audioContext = null;
  var enabled = false;
  var gestureReady = false;
  var navigationTargets = [
    ".nav-list a",
    ".sidebar-column a[href]",
    ".archive-list .archive-item > a",
    ".post-card a[href]",
    ".writing-index-row a[href]",
    ".book-shelf-row a[href]",
    ".photo-card a[href]",
    ".quote-index-entry a[href]",
    ".tag[href]",
    ".search-ui__result-link",
  ].join(", ");
  var controlTargets = [
    ".site-header-actions button",
    ".site-header-actions a",
    ".filter-btn",
    ".zen-toggle-btn",
  ].join(", ");

  var tones = {
    navigation: { start: 2400, end: 1300, secondaryStart: 3570, secondaryEnd: 1930, duration: 0.018, gain: 0.008 },
    searchFocus: { start: 1450, end: 880, secondaryStart: 2320, secondaryEnd: 1410, duration: 0.026, gain: 0.009 },
    searchResults: { start: 1900, end: 1180, secondaryStart: 3070, secondaryEnd: 1910, duration: 0.034, gain: 0.01 },
    control: { start: 1750, end: 980, secondaryStart: 2740, secondaryEnd: 1530, duration: 0.022, gain: 0.009 },
  };

  function storedPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function savePreference(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    } catch (error) {}
  }

  function activateAudio() {
    if (!enabled || !gestureReady) return null;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!audioContext) audioContext = new AudioContext();
    if (audioContext.state === "suspended") audioContext.resume().catch(function () {});
    return audioContext;
  }

  function play(toneName) {
    var tone = tones[toneName];
    var context = tone && enabled && gestureReady ? audioContext : null;
    if (!context) return;

    var now = context.currentTime;
    var oscillator = context.createOscillator();
    var secondary = context.createOscillator();
    var gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(tone.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(tone.end, now + tone.duration);
    secondary.type = "square";
    secondary.frequency.setValueAtTime(tone.secondaryStart, now);
    secondary.frequency.exponentialRampToValueAtTime(tone.secondaryEnd, now + tone.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tone.gain, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    secondary.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    secondary.start(now);
    oscillator.stop(now + tone.duration + 0.004);
    secondary.stop(now + tone.duration + 0.004);
  }

  function stopAudio() {
    if (!audioContext) return;
    audioContext.close().catch(function () {});
    audioContext = null;
  }

  function syncToggle(toggle) {
    if (!toggle) return;
    var label = enabled ? toggle.dataset.labelDisable : toggle.dataset.labelEnable;
    toggle.classList.toggle("is-active", enabled);
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  }

  function init() {
    var toggle = document.getElementById("sound-toggle");
    if (!toggle) return;

    enabled = storedPreference();
    syncToggle(toggle);

    document.addEventListener("pointerdown", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
    }, true);

    document.addEventListener("keydown", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
    }, true);

    document.addEventListener("click", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      if (!enabled) return;
      var target = event.target.closest(controlTargets + ", " + navigationTargets);
      if (!target || target === toggle) return;
      play(target.matches(controlTargets) ? "control" : "navigation");
    }, true);

    document.addEventListener("focusin", function (event) {
      var target = event.target;
      if (target && (target.id === "site-search-input" || target.matches(".guestbook-form input:not(.guestbook-honeypot), .guestbook-form textarea"))) {
        play("searchFocus");
      }
    });

    document.addEventListener("site-sound", function (event) {
      var tone = event.detail && event.detail.tone;
      if (tone === "navigation" || tone === "searchResults") play(tone);
    });

    document.addEventListener("submit", function (event) {
      if (!event.isTrusted || !event.target.matches(".guestbook-form")) return;
      play("control");
    }, true);

    toggle.addEventListener("click", function (event) {
      enabled = !enabled;
      savePreference(enabled);
      syncToggle(toggle);
      if (enabled && event.isTrusted) {
        gestureReady = true;
        activateAudio();
        play("control");
      }
      else stopAudio();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
