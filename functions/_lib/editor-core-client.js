export const editorCoreClientScript = String.raw`(function (global) {
  "use strict";

  function cleanBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function requestPath(apiBase, path) {
    var base = cleanBase(apiBase);
    var target = String(path || "");
    if (base && (target === base || target.indexOf(base + "/") === 0)) {
      return target;
    }
    if (target.indexOf("/api/") === 0 && /\/api$/.test(base)) {
      return base + target.slice(4);
    }
    return base + (target.charAt(0) === "/" ? target : "/" + target);
  }

  function publicSiteOrigin(siteOrigin) {
    return cleanBase(siteOrigin).replace(/\/admin$/, "");
  }

  function notebookPathForContent(path) {
    var parts = String(path || "").split("/");
    if (parts[1] === "posts") return parts.slice(0, 2).join("/");
    return parts.slice(0, -1).join("/");
  }

  function adminNotebookUrl(siteOrigin, notebookPath) {
    var base = cleanBase(siteOrigin);
    if (!/\/admin$/.test(base)) base += "/admin";
    var path = String(notebookPath || "")
      .replace(/^content_es/, "/es")
      .replace(/^content_en/, "");
    return base + "/" + path.replace(/^\/+|\/+$/g, "") + "/";
  }

  function publicContentUrl(siteOrigin, contentUrl) {
    if (!contentUrl) return "";
    return publicSiteOrigin(siteOrigin) + (contentUrl.charAt(0) === "/" ? contentUrl : "/" + contentUrl);
  }

  function verificationUrl(url, attempt) {
    var separator = String(url || "").indexOf("?") === -1 ? "?" : "&";
    return String(url || "") + separator + "author_verify=" + Date.now() + "-" + attempt;
  }

  function fetchPublicState(url, attempt) {
    var options = {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Cache-Control": "no-cache" },
      redirect: "follow",
    };
    return Promise.all([
      fetch(url, options),
      fetch(verificationUrl(url, attempt), options),
    ]).then(function (responses) {
      return {
        canonical: responses[0],
        uncached: responses[1],
      };
    });
  }

  function waitForPublicState(url, options) {
    var target = String(url || "");
    var settings = options || {};
    var expectsExists = settings.exists !== false;
    var timeoutMs = Number(settings.timeoutMs || 120000);
    var intervalMs = Number(settings.intervalMs === undefined ? 2000 : settings.intervalMs);
    var startedAt = Date.now();
    var attempt = 0;

    if (!target) {
      return Promise.reject(new Error("No hay una URL publica que verificar."));
    }

    function retry() {
      if (intervalMs <= 0) return Promise.resolve().then(check);
      return new Promise(function (resolve) {
        setTimeout(resolve, intervalMs);
      }).then(check);
    }

    function check() {
      attempt += 1;
      return fetchPublicState(target, attempt).then(function (state) {
        var canonicalMatches = expectsExists ? state.canonical.ok : state.canonical.status === 404;
        var uncachedMatches = expectsExists ? state.uncached.ok : state.uncached.status === 404;

        if (canonicalMatches && uncachedMatches) {
          return {
            url: target,
            exists: expectsExists,
            attempts: attempt,
            canonicalStatus: state.canonical.status,
            uncachedStatus: state.uncached.status,
          };
        }
        if (Date.now() - startedAt >= timeoutMs) {
          var expected = expectsExists ? "estar disponible" : "responder 404";
          throw new Error("GitHub ya guardo el cambio, pero la URL publica aun no termina de " + expected + ".");
        }
        return retry();
      }).catch(function (error) {
        if (Date.now() - startedAt >= timeoutMs || /GitHub ya guardo/.test(String(error && error.message || ""))) {
          throw error;
        }
        return retry();
      });
    }

    return check();
  }

  function splitTags(value) {
    return String(value || "")
      .split(/[,\s]+/)
      .map(function (tag) { return tag.trim().replace(/^#/, ""); })
      .filter(Boolean);
  }

  function slugify(value, separator) {
    var joiner = separator || "-";
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, joiner)
      .replace(new RegExp("^" + joiner + "+|" + joiner + "+$", "g"), "");
  }

  function today() {
    var parts = new Intl.DateTimeFormat("en", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) {
      values[part.type] = part.value;
    });
    return values.year + "-" + values.month + "-" + values.day;
  }

  function create(options) {
    var apiBase = cleanBase(options && options.apiBase);
    var siteOrigin = cleanBase(options && options.siteOrigin);

    function request(path, requestOptions) {
      return fetch(requestPath(apiBase, path), requestOptions || {}).then(function (response) {
        return response.json().catch(function () {
          return {};
        }).then(function (payload) {
          if (!response.ok || payload.error) {
            throw new Error(payload.error || "Author API error.");
          }
          return payload;
        });
      });
    }

    function postJson(path, payload) {
      return request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    return Object.freeze({
      adminNotebookUrl: function (path) { return adminNotebookUrl(siteOrigin, path); },
      notebookPathForContent: notebookPathForContent,
      postJson: postJson,
      publicContentUrl: function (url) { return publicContentUrl(siteOrigin, url); },
      publicSiteOrigin: function () { return publicSiteOrigin(siteOrigin); },
      request: request,
      slugify: slugify,
      splitTags: splitTags,
      today: today,
      waitForPublicState: waitForPublicState,
    });
  }

  global.EditorCore = Object.freeze({
    adminNotebookUrl: adminNotebookUrl,
    create: create,
    notebookPathForContent: notebookPathForContent,
    publicContentUrl: publicContentUrl,
    publicSiteOrigin: publicSiteOrigin,
    requestPath: requestPath,
    slugify: slugify,
    splitTags: splitTags,
    today: today,
    waitForPublicState: waitForPublicState,
  });
})(window);`;
