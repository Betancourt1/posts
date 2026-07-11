(function (global) {
  "use strict";

  function cleanBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function requestPath(apiBase, path) {
    var base = cleanBase(apiBase);
    var target = String(path || "");
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
  });
})(window);
