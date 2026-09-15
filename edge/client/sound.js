(function () {
  "use strict";

  var STORAGE_KEY = "site_sound_enabled";
  var SAMPLE_GAIN = 0.1;
  var MIN_RELEASE_DELAY = 0.2;
  var audioContext = null;
  var enabled = false;
  var gestureReady = false;
  var sampleData = {};
  var sampleDataPromises = {};
  var decodedBuffers = {};
  var decodePromises = {};
  var failedSamples = {};
  var activePress = null;
  var clickTarget = null;
  var clickFromKeyboard = false;
  var scriptUrl = document.currentScript && document.currentScript.src;

  function soundAsset(filename) {
    if (!scriptUrl) return "/sounds/" + filename;
    return new URL("../sounds/" + filename, scriptUrl).toString();
  }

  var samples = {
    press: { url: soundAsset("button_up.m4a"), rate: 1 },
    release: { url: soundAsset("button_down.m4a"), rate: 1.2 },
  };

  var interactionTargets = [
    "button",
    "a[href]",
    "summary",
    "[role='button']",
    "input[type='checkbox']",
    "input[type='radio']",
    "select",
    "#site-search-input",
    ".guestbook-form input:not(.guestbook-honeypot)",
    ".guestbook-form textarea",
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

  function startSample(context, buffer, sampleName, when) {
    if (!enabled || !buffer || context !== audioContext) return;
    var source = context.createBufferSource();
    var gain = context.createGain();
    source.buffer = buffer;
    source.playbackRate.value = samples[sampleName].rate;
    gain.gain.value = SAMPLE_GAIN;
    source.connect(gain);
    gain.connect(context.destination);
    var startedAt = Math.max(context.currentTime, when || 0);
    source.start(startedAt);
    return { context: context, startedAt: startedAt };
  }

  function play(sampleName, when) {
    var context = activateAudio();
    if (!context || !samples[sampleName]) return Promise.resolve(null);
    if (decodedBuffers[sampleName]) {
      return Promise.resolve(startSample(context, decodedBuffers[sampleName], sampleName, when));
    }
    return decodeSample(sampleName, context).then(function (buffer) {
      return startSample(context, buffer, sampleName, when);
    });
  }

  function releaseSound(press) {
    press.then(function (first) {
      if (first && enabled && first.context === audioContext) {
        play("release", first.startedAt + MIN_RELEASE_DELAY);
      }
    });
  }

  function playPair() {
    releaseSound(play("press"));
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

  function interactionTarget(event) {
    var target = event.target && event.target.closest(interactionTargets);
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return null;
    return target;
  }

  function beginPress(target, key, pointerId) {
    clickTarget = target;
    clickFromKeyboard = key !== null;
    activePress = { target: target, key: key, pointerId: pointerId, sound: play("press") };
  }

  function endPress() {
    if (!activePress) return;
    var target = activePress.target;
    releaseSound(activePress.sound);
    activePress = null;
    if (clickFromKeyboard) {
      setTimeout(function () {
        if (clickTarget === target) clickTarget = null;
      }, 0);
    }
  }

  function stopAudio() {
    activePress = null;
    clickTarget = null;
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
      var target = interactionTarget(event);
      if (enabled && target && target !== toggle && event.button === 0) {
        beginPress(target, null, event.pointerId);
      }
    }, true);

    document.addEventListener("pointerup", function (event) {
      if (event.isTrusted && activePress && activePress.pointerId === event.pointerId) endPress();
    }, true);

    document.addEventListener("pointercancel", function (event) {
      if (activePress && activePress.pointerId === event.pointerId) {
        activePress = null;
        clickTarget = null;
      }
    }, true);

    document.addEventListener("keydown", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      warmSamples();
      var target = interactionTarget(event);
      if (!enabled || !target || target === toggle || event.repeat) return;
      if ((event.key === "Enter" || event.key === " ") && !target.matches("input:not([type='checkbox']):not([type='radio']), textarea, select")) {
        beginPress(target, event.key, null);
      }
    }, true);

    document.addEventListener("keyup", function (event) {
      if (event.isTrusted && activePress && activePress.key === event.key) endPress();
    }, true);

    document.addEventListener("click", function (event) {
      if (!event.isTrusted) return;
      gestureReady = true;
      activateAudio();
      if (!enabled) return;
      var target = interactionTarget(event);
      if (!target || target === toggle) return;
      if (target === clickTarget && (activePress || clickFromKeyboard || event.detail !== 0)) {
        if (!activePress) clickTarget = null;
        return;
      }
      playPair();
    }, true);

    document.addEventListener("focusin", function (event) {
      var target = event.target;
      if (target && (target.id === "site-search-input" || target.matches(".guestbook-form input:not(.guestbook-honeypot), .guestbook-form textarea"))) {
        if (!activePress || activePress.target !== target) playPair();
      }
    });

    document.addEventListener("site-sound", function (event) {
      var tone = event.detail && event.detail.tone;
      if (tone === "navigation" || tone === "searchResults") playPair();
    });

    document.addEventListener("submit", function (event) {
      if (!event.isTrusted || !event.target.matches(".guestbook-form")) return;
      if (!event.submitter) playPair();
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
          playPair();
        }
        else stopAudio();
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
