(function () {
  "use strict";

  var STORAGE_KEY = "site_sound_enabled";
  var audioContext = null;
  var enabled = false;
  var gestureReady = false;

  var tones = {
    navigation: { start: 1320, end: 1080, duration: 0.032, gain: 0.014, type: "triangle" },
    searchFocus: { start: 520, end: 760, duration: 0.068, gain: 0.018, type: "sine" },
    searchResults: { start: 620, end: 920, duration: 0.078, gain: 0.02, type: "sine" },
    control: { start: 390, end: 540, duration: 0.052, gain: 0.016, type: "triangle" },
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
    var gain = context.createGain();
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(tone.end, now + tone.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(tone.gain, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.duration + 0.01);
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
      var target = event.target.closest(".site-header-actions button, .site-header-actions a, .nav-list a");
      if (!target || target === toggle) return;
      play(target.classList.contains("lang-toggle") || target.closest(".site-header-actions") ? "control" : "navigation");
    }, true);

    document.addEventListener("focusin", function (event) {
      if (event.target && event.target.id === "site-search-input") play("searchFocus");
    });

    document.addEventListener("site-sound", function (event) {
      var tone = event.detail && event.detail.tone;
      if (tone === "navigation" || tone === "searchResults") play(tone);
    });

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
