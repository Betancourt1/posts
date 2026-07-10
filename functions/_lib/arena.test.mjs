import assert from "node:assert/strict";
import test from "node:test";
import {
  ArenaApiError,
  getArenaStatus,
  listArenaChannels,
  prepareArenaMarkdown,
  syncArenaPage,
} from "./arena.js";

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, { status });
}

function page(overrides = {}) {
  return {
    path: "content_es/posts/2026/enero/prueba.md",
    url: "/es/posts/2026/enero/prueba/",
    body: "Texto completo con **Markdown**.",
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
    },
    ...overrides,
  };
}

test("prepareArenaMarkdown forces URL-only content to remain a Text block", () => {
  assert.equal(
    prepareArenaMarkdown(page({ body: "https://example.com" })),
    "# Prueba\n\nhttps://example.com",
  );
});

test("prepareArenaMarkdown makes root-relative destinations portable", () => {
  assert.equal(
    prepareArenaMarkdown(page({ body: "[Texto](/es/about/)\n\n![Foto](/uploads/foto.jpg)" })),
    "[Texto](https://fbetancourt.work/es/about/)\n\n![Foto](https://fbetancourt.work/uploads/foto.jpg)",
  );
});

test("syncArenaPage creates a Text block from the complete Markdown", async () => {
  const requests = [];
  let created = false;
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, body: options.body ? JSON.parse(options.body) : null });

    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, {
        data: created ? [{ id: 456, type: "Text", connection: { id: 789 } }] : [],
      });
    }
    if (url === "https://api.are.na/v3/blocks" && options.method === "POST") {
      created = true;
      return jsonResponse(201, {
        id: 456,
        type: "Text",
        state: "available",
        updated_at: "2026-07-10T01:00:00Z",
        content: { markdown: "Texto completo con **Markdown**." },
      });
    }
    if (url.includes("/blocks/456/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: page(), fetchImpl });

  const createRequest = requests.find((request) => request.url === "https://api.are.na/v3/blocks");
  assert.equal(createRequest.options.method, "POST");
  assert.equal(createRequest.body.value, "Texto completo con **Markdown**.");
  assert.equal(createRequest.body.title, "Prueba");
  assert.equal(createRequest.body.original_source_url, "https://fbetancourt.work/es/posts/2026/enero/prueba/");
  assert.deepEqual(createRequest.body.channels.map((item) => item.id), [123]);
  assert.equal(result.blockId, "456");
  assert.equal(result.connectionId, "789");
  assert.equal(result.state, "synced");
});

test("syncArenaPage updates the mapped block without creating another", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, method: options.method, body });

    if (url.endsWith("/blocks/456") && options.method === "PUT") {
      return jsonResponse(200, {
        id: 456,
        type: "Text",
        state: "available",
        updated_at: "2026-07-10T02:00:00Z",
        content: { markdown: "Texto completo con **Markdown**." },
      });
    }
    if (url.includes("/blocks/456/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, { data: [{ id: 456, type: "Text", connection: { id: 789 } }] });
    }

    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const existing = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
      arena_block_id: "456",
      arena_connection_id: "789",
    },
  });

  const result = await syncArenaPage({ token: "secret", page: existing, fetchImpl });

  assert.equal(requests[0].method, "PUT");
  assert.equal(requests[0].body.content, existing.body);
  assert.equal(requests.some((request) => request.url === "https://api.are.na/v3/blocks"), false);
  assert.equal(result.blockId, "456");
});

test("syncArenaPage replaces a stale stored connection with the target channel connection", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method });
    if (url.endsWith("/blocks/456") && options.method === "PUT") {
      return jsonResponse(200, { id: 456, type: "Text", state: "available" });
    }
    if (url.includes("/blocks/456/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, { data: [{ id: 456, type: "Text", connection: { id: 789 } }] });
    }
    if (url.endsWith("/connections/700") && options.method === "DELETE") return emptyResponse();
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const existing = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
      arena_block_id: "456",
      arena_connection_id: "700",
    },
  });

  const result = await syncArenaPage({ token: "secret", page: existing, fetchImpl });

  assert.equal(result.connectionId, "789");
  assert.equal(requests.some((request) => request.url.endsWith("/connections/700") && request.method === "DELETE"), true);
});

test("syncArenaPage recreates a mapped block that was deleted in Are.na", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method });
    if (url.endsWith("/blocks/456") && options.method === "PUT") {
      return jsonResponse(404, { error: "Not found" });
    }
    if (url === "https://api.are.na/v3/blocks" && options.method === "POST") {
      return jsonResponse(201, { id: 457, type: "Text", state: "available" });
    }
    if (url.includes("/blocks/457/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, { data: [{ id: 457, type: "Text", connection: { id: 790 } }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const existing = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
      arena_block_id: "456",
      arena_connection_id: "789",
    },
  });

  const result = await syncArenaPage({ token: "secret", page: existing, fetchImpl });

  assert.equal(result.blockId, "457");
  assert.equal(result.connectionId, "790");
  assert.equal(requests.filter((request) => request.url === "https://api.are.na/v3/blocks").length, 1);
});

test("syncArenaPage recovers an existing mirrored block when its local mapping is missing", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method });
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, {
        data: [{
          id: 456,
          type: "Text",
          metadata: { integration: "fbetancourt_blog", blog_path: page().path },
          connection: { id: 789 },
        }],
      });
    }
    if (url.endsWith("/blocks/456") && options.method === "PUT") {
      return jsonResponse(200, { id: 456, type: "Text", state: "available" });
    }
    if (url.includes("/blocks/456/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: page(), fetchImpl });

  assert.equal(result.blockId, "456");
  assert.equal(result.connectionId, "789");
  assert.equal(requests.some((request) => request.url === "https://api.are.na/v3/blocks"), false);
});

test("getArenaStatus distinguishes matching, disconnected, and changed Markdown", async () => {
  const blockPayload = {
    id: 456,
    type: "Text",
    state: "available",
    title: "Prueba",
    updated_at: "2026-07-10T02:00:00Z",
    content: { markdown: "Texto completo con **Markdown**." },
  };
  const matchingFetch = async (url) => url.includes("/connections")
    ? jsonResponse(200, { data: [{ id: 123, type: "Channel" }] })
    : jsonResponse(200, blockPayload);
  const existing = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
      arena_block_id: "456",
    },
  });

  assert.equal((await getArenaStatus({ token: "secret", page: existing, fetchImpl: matchingFetch })).state, "synced");

  const disconnectedFetch = async (url) => url.includes("/connections")
    ? jsonResponse(200, { data: [] })
    : jsonResponse(200, blockPayload);
  assert.equal((await getArenaStatus({ token: "secret", page: existing, fetchImpl: disconnectedFetch })).state, "pending");

  const changedFetch = async (url) => url.includes("/connections")
    ? jsonResponse(200, { data: [{ id: 123, type: "Channel" }] })
    : jsonResponse(200, { ...blockPayload, content: { markdown: "Contenido anterior" } });
  assert.equal((await getArenaStatus({ token: "secret", page: existing, fetchImpl: changedFetch })).state, "pending");
});

test("disabled and draft pages without a mapped block never call Are.na", async () => {
  const fetchImpl = async () => {
    throw new Error("fetch should not run");
  };
  const disabled = page({ frontMatter: { title: "Prueba", arena_channel_id: "123" } });
  const draft = page({ frontMatter: { title: "Prueba", arena_enabled: true, arena_channel_id: "123", draft: true } });

  assert.equal((await syncArenaPage({ token: "secret", page: disabled, fetchImpl })).state, "disabled");
  assert.equal((await syncArenaPage({ token: "secret", page: draft, fetchImpl })).state, "paused");
});

test("getArenaStatus exposes a residual connection after mirroring is disabled", async () => {
  const disabled = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: false,
      arena_channel_id: "123",
      arena_block_id: "456",
    },
  });
  const connectedFetch = async () => jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
  const disconnectedFetch = async () => jsonResponse(200, { data: [] });

  const residual = await getArenaStatus({ token: "secret", page: disabled, fetchImpl: connectedFetch });
  assert.equal(residual.state, "error");
  assert.match(residual.error, /sigue conectada/);
  assert.equal((await getArenaStatus({ token: "secret", page: disabled, fetchImpl: disconnectedFetch })).state, "disabled");
});

test("disabling a mapped mirror removes its channel connection but keeps the block", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method });
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, { data: [{ id: 456, type: "Text", connection: { id: 789 } }] });
    }
    if (url.endsWith("/connections/789") && options.method === "DELETE") return emptyResponse();
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const disabled = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: false,
      arena_channel_id: "123",
      arena_block_id: "456",
      arena_connection_id: "700",
    },
  });

  const result = await syncArenaPage({ token: "secret", page: disabled, fetchImpl });

  assert.equal(result.state, "disabled");
  assert.equal(result.blockId, "456");
  assert.equal(result.connectionId, "");
  assert.deepEqual(requests, [
    { url: "https://api.are.na/v3/channels/123/contents?sort=created_at_desc&page=1&per=100", method: "GET" },
    { url: "https://api.are.na/v3/connections/789", method: "DELETE" },
  ]);
});

test("failed Are.na blocks are never reported as synchronized", async () => {
  const existing = page({
    frontMatter: {
      title: "Prueba",
      arena_enabled: true,
      arena_channel_id: "123",
      arena_block_id: "456",
    },
  });
  const fetchImpl = async (url) => url.includes("/connections")
    ? jsonResponse(200, { data: [{ id: 123, type: "Channel" }] })
    : jsonResponse(200, { id: 456, type: "Text", state: "failed" });

  await assert.rejects(
    () => getArenaStatus({ token: "secret", page: existing, fetchImpl }),
    (error) => error instanceof ArenaApiError && error.retryable === true,
  );
});

test("listArenaChannels exposes profile and owned channels without account email", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/me")) {
      return jsonResponse(200, { id: 1, slug: "fernando", name: "Fernando", email: "private@example.com" });
    }
    return jsonResponse(200, {
      data: [{ id: 123, type: "Channel", slug: "desde-mi-blog", title: "Desde mi blog", visibility: "closed" }],
    });
  };

  const result = await listArenaChannels({ token: "secret", fetchImpl });
  assert.deepEqual(result.profile, {
    id: "1",
    slug: "fernando",
    name: "Fernando",
    url: "https://www.are.na/fernando",
  });
  assert.deepEqual(result.channels, [{ id: "123", slug: "desde-mi-blog", title: "Desde mi blog", visibility: "closed" }]);
  assert.equal("email" in result.profile, false);
});

test("API errors never include the token", async () => {
  const fetchImpl = async () => jsonResponse(401, { error: "Unauthorized" });

  await assert.rejects(
    () => listArenaChannels({ token: "do-not-leak", fetchImpl }),
    (error) => error instanceof ArenaApiError && !error.message.includes("do-not-leak") && error.status === 401,
  );
});
