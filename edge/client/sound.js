(function () {
  "use strict";

  var STORAGE_KEY = "site_sound_enabled";
  var SAMPLE_GAIN = 1;
  var audioContext = null;
  var enabled = false;
  var gestureReady = false;
  var sampleData = {};
  var sampleDataPromises = {};
  var decodedBuffers = {};
  var decodePromises = {};
  var failedSamples = {};
  var scriptUrl = document.currentScript && document.currentScript.src;

  function soundAsset(filename) {
    if (!scriptUrl) return "/sounds/" + filename;
    return new URL("../sounds/" + filename, scriptUrl).toString();
  }

  var samples = {
    default: { url: soundAsset("interaction-default.wav") },
    navigation: { url: soundAsset("interaction-navigation.wav") },
    subcontrol: { url: soundAsset("interaction-subcontrol.wav") },
  };

  var interactionTargets = [
    "button",
    "a[href]",
    "summary",
    "[role='button']",
    "input[type='checkbox']",
    "input[type='radio']",
    "select",
  ].join(", ");
  var navigationTargets = [
    "a[href]",
    ".back-button",
    "#back",
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
  var destructiveTargets = [
    ".author-action-button--danger",
    ".author-danger-button",
    ".danger-button",
    ".image-delete-button",
    ".draft-restore-discard",
    "[data-author-action='delete-post']",
    "[data-author-action='delete-notebook']",
    "#delete-page",
    "#delete-image",
    "#remove-image",
  ].join(", ");
  var subcontrolTargets = [
    ".typo-dropdown button",
    ".author-more-actions > summary",
    ".author-more-menu button",
    ".author-more-menu a[href]",
    ".settings button",
    ".arena-details button",
    ".inspector button",
  ].join(", ");

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

  function fetchSampleData(sampleName) {
    if (!enabled || failedSamples[sampleName]) return Promise.resolve(null);
    if (sampleData[sampleName]) return Promise.resolve(sampleData[sampleName]);
    if (sampleDataPromises[sampleName]) return sampleDataPromises[sampleName];

    var sample = samples[sampleName];
    sampleDataPromises[sampleName] = fetch(sample.url, { cache: "force-cache" })
      .then(function (response) {
        if (!response.ok) throw new Error("Unable to load interaction sound");
        return response.arrayBuffer();
      })
      .then(function (data) {
        sampleData[sampleName] = data;
        return data;
      })
      .catch(function () {
        failedSamples[sampleName] = true;
        return null;
      });
    return sampleDataPromises[sampleName];
  }

  function decodeSample(sampleName, context) {
    if (!context || failedSamples[sampleName]) return Promise.resolve(null);
    if (decodedBuffers[sampleName]) return Promise.resolve(decodedBuffers[sampleName]);
    if (decodePromises[sampleName]) return decodePromises[sampleName];

    decodePromises[sampleName] = fetchSampleData(sampleName)
      .then(function (data) {
        if (!data || context !== audioContext) return null;
        return context.decodeAudioData(data.slice(0));
      })
      .then(function (buffer) {
        if (buffer && context === audioContext) decodedBuffers[sampleName] = buffer;
        return buffer;
      })
      .catch(function () {
        failedSamples[sampleName] = true;
        return null;
      });
    return decodePromises[sampleName];
  }

  function startSample(context, buffer) {
    if (!enabled || !buffer || context !== audioContext) return;
    var source = context.createBufferSource();
    var gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = SAMPLE_GAIN;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
  }

  function play(sampleName) {
    var context = activateAudio();
    if (!context || !samples[sampleName]) return;
    if (decodedBuffers[sampleName]) {
      startSample(context, decodedBuffers[sampleName]);
      return;
    }
    decodeSample(sampleName, context).then(function (buffer) {
      startSample(context, buffer);
    });
  }

  function warmSamples() {
    if (!enabled) return;
    Object.keys(samples).forEach(function (sampleName) {
      fetchSampleData(sampleName);
    });
    var context = activateAudio();
    if (!context) return;
    Object.keys(samples).forEach(function (sampleName) {
      decodeSample(sampleName, context);
    });
  }

  function sampleForTarget(target) {
    if (target.matches(destructiveTargets) || target.matches(navigationTargets)) return "navigation";
    if (target.matches(subcontrolTargets)) return "subcontrol";
    return "default";
  }

  function stopAudio() {
    if (!audioContext) return;
    audioContext.close().catch(function () {});
    audioContext = null;
    decodedBuffers = {};
    decodePromises = {};
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

    enabled = storedPreference();
    syncToggle(toggle);
    warmSamples();

    document.addEventListener("pointerdown", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      warmSamples();
    }, true);

    document.addEventListener("keydown", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      warmSamples();
    }, true);

    document.addEventListener("click", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      if (!enabled) return;
      var target = event.target.closest(interactionTargets);
      if (!target || target === toggle) return;
      play(sampleForTarget(target));
    }, true);

    document.addEventListener("focusin", function (event) {
      var target = event.target;
      if (target && (target.id === "site-search-input" || target.matches(".guestbook-form input:not(.guestbook-honeypot), .guestbook-form textarea"))) {
        play("default");
      }
    });

    document.addEventListener("site-sound", function (event) {
      var tone = event.detail && event.detail.tone;
      if (tone === "navigation") play("navigation");
      else if (tone === "searchResults") play("default");
    });

    document.addEventListener("submit", function (event) {
      if (!event.isTrusted || !event.target.matches(".guestbook-form")) return;
      if (!event.submitter) play("default");
    }, true);

    if (toggle) {
      toggle.addEventListener("click", function (event) {
        enabled = !enabled;
        savePreference(enabled);
        syncToggle(toggle);
        if (enabled && event.isTrusted) {
          gestureReady = true;
          activateAudio();
          warmSamples();
          play("default");
        }
        else stopAudio();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
