import assert from "node:assert/strict";
import test from "node:test";
import {
  ArenaApiError,
  arenaMappingPatch,
  createArenaChannel,
  getArenaStatus,
  listArenaChannels,
  prepareArenaMarkdown,
  syncArenaPage,
} from "./arena.js";
import { notebookEditorHtml } from "./notebook-editor-template.js";
import { postEditorHtml } from "./post-editor-template.js";

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function photoPage(overrides = {}) {
  return page({
    path: "content_es/fotografia/flor-en-la-manana.md",
    url: "/es/fotografia/flor-en-la-manana/",
    body: "",
    frontMatter: {
      title: "Flor en la mañana",
      arena_enabled: true,
      arena_channel_id: "123",
      image: "/uploads/flor-1.jpg",
      image_alt: "Flor amarilla",
      caption: "Después de la lluvia",
    },
    ...overrides,
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
    "# Prueba\n\nhttps://example.com\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/posts/2026/enero/prueba/)",
  );
});

test("prepareArenaMarkdown makes root-relative destinations portable", () => {
  assert.equal(
    prepareArenaMarkdown(page({ body: "[Texto](/es/about/)\n\n![Foto](/uploads/foto.jpg)" })),
    "[Texto](https://fbetancourt.work/es/about/)\n\n![Foto](https://fbetancourt.work/uploads/foto.jpg)\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/posts/2026/enero/prueba/)",
  );
});

test("syncArenaPage publishes a draft Text block when Are.na is enabled", async () => {
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

  const draft = page();
  draft.frontMatter.draft = true;
  const result = await syncArenaPage({ token: "secret", page: draft, fetchImpl });

  const createRequest = requests.find((request) => request.url === "https://api.are.na/v3/blocks");
  assert.equal(createRequest.options.method, "POST");
  assert.equal(createRequest.body.value, "Texto completo con **Markdown**.\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/posts/2026/enero/prueba/)");
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
  assert.equal(requests[0].body.content, "Texto completo con **Markdown**.\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/posts/2026/enero/prueba/)");
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
    content: { markdown: "Texto completo con **Markdown**.\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/posts/2026/enero/prueba/)" },
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

test("disabled pages without a mapped block never call Are.na", async () => {
  const fetchImpl = async () => {
    throw new Error("fetch should not run");
  };
  const disabled = page({ frontMatter: { title: "Prueba", arena_channel_id: "123" } });

  assert.equal((await syncArenaPage({ token: "secret", page: disabled, fetchImpl })).state, "disabled");
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

test("syncArenaPage publishes draft Image blocks when Are.na is enabled", async () => {
  const requests = [];
  let nextBlockId = 500;
  let nextConnectionId = 800;
  const fetchImpl = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, method: options.method, body });

    if (url.includes("/channels/123/contents")) return jsonResponse(200, { data: [] });
    if (url === "https://api.are.na/v3/blocks" && options.method === "POST") {
      nextBlockId += 1;
      return jsonResponse(201, {
        id: nextBlockId,
        type: "Image",
        state: "available",
        updated_at: "2026-07-10T03:00:00Z",
      });
    }
    if (url.includes("/connections?") || url.match(/\/blocks\/\d+\/connections/)) {
      return jsonResponse(200, { data: [] });
    }
    if (url === "https://api.are.na/v3/connections" && options.method === "POST") {
      nextConnectionId += 1;
      return jsonResponse(201, { data: [{ id: nextConnectionId }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };
  const gallery = photoPage({
    frontMatter: {
      title: "Flor en la mañana",
      draft: true,
      arena_enabled: true,
      arena_channel_id: "123",
      image: "/uploads/flor-1.jpg",
      image_alt: "Flor amarilla",
      images: [
        { src: "/uploads/flor-1.jpg", alt: "Flor amarilla", caption: "Después de la lluvia" },
        { src: "/uploads/flor-2.jpg", alt: "Flor naranja", caption: "Detalle del pétalo" },
      ],
    },
  });

  const result = await syncArenaPage({
    token: "secret",
    page: gallery,
    publicOrigin: "https://blog.example",
    imageOrigin: "https://raw.example/static",
    fetchImpl,
  });

  const creates = requests.filter((request) => request.url === "https://api.are.na/v3/blocks");
  assert.equal(creates.length, 2);
  assert.equal(creates[0].body.value, "https://raw.example/static/uploads/flor-1.jpg");
  assert.equal(creates[0].body.title, "Flor en la mañana · 1/2");
  assert.equal(creates[0].body.alt_text, "Flor amarilla");
  assert.equal(creates[0].body.description, "Después de la lluvia\n\n[Publicado originalmente en el blog](https://blog.example/es/fotografia/flor-en-la-manana/)");
  assert.equal(creates[0].body.original_source_url, "https://blog.example/es/fotografia/flor-en-la-manana/");
  assert.equal(creates[0].body.metadata.image_path, "/uploads/flor-1.jpg");
  assert.equal(creates[1].body.value, "https://raw.example/static/uploads/flor-2.jpg");
  assert.equal(result.kind, "images");
  assert.equal(result.state, "synced");
  assert.deepEqual(result.blocks.map((block) => block.blockId), ["501", "502"]);
});

test("syncArenaPage updates Image metadata without creating a Link or a second block", async () => {
  const requests = [];
  const existing = photoPage({
    frontMatter: {
      title: "Flor actualizada",
      arena_enabled: true,
      arena_channel_id: "123",
      image: "/uploads/flor-1.jpg",
      image_alt: "Nueva descripción",
      caption: "Nuevo pie",
      arena_blocks: [{ src: "/uploads/flor-1.jpg", block_id: "501", connection_id: "801" }],
    },
  });
  const fetchImpl = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    requests.push({ url, method: options.method, body });
    if (url.endsWith("/blocks/501") && options.method === "PUT") {
      return jsonResponse(200, { id: 501, type: "Image", state: "available" });
    }
    if (url.includes("/blocks/501/connections")) {
      return jsonResponse(200, { data: [{ id: 123, type: "Channel" }] });
    }
    if (url.includes("/channels/123/contents")) {
      return jsonResponse(200, { data: [{ id: 501, type: "Image", connection: { id: 801 } }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: existing, fetchImpl });

  assert.equal(requests[0].method, "PUT");
  assert.deepEqual(requests[0].body, {
    title: "Flor actualizada",
    description: "Nuevo pie\n\n[Publicado originalmente en el blog](https://fbetancourt.work/es/fotografia/flor-en-la-manana/)",
    alt_text: "Nueva descripción",
    metadata: {
      integration: "fbetancourt_blog",
      blog_path: existing.path,
      language: "es",
      image_path: "/uploads/flor-1.jpg",
      image_index: 0,
    },
  });
  assert.equal(requests.some((request) => request.url === "https://api.are.na/v3/blocks"), false);
  assert.equal(result.blocks[0].blockId, "501");
});

test("createArenaChannel creates a closed channel with notebook metadata", async () => {
  const requests = [];
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method, body: JSON.parse(options.body) });
    return jsonResponse(201, {
      id: 987,
      slug: "fotografia",
      title: "Fotografía",
      visibility: "closed",
      owner: { slug: "fernando" },
    });
  };

  const result = await createArenaChannel({
    token: "secret",
    title: "Fotografía",
    description: "Notebook del blog",
    metadata: { integration: "fbetancourt_blog" },
    fetchImpl,
  });

  assert.deepEqual(requests[0], {
    url: "https://api.are.na/v3/channels",
    method: "POST",
    body: {
      title: "Fotografía",
      visibility: "closed",
      description: "Notebook del blog",
      metadata: { integration: "fbetancourt_blog" },
    },
  });
  assert.deepEqual(result, {
    id: "987",
    slug: "fotografia",
    title: "Fotografía",
    visibility: "closed",
    url: "https://www.are.na/fernando/fotografia",
  });
});

test("syncArenaPage disconnects a replaced image before creating its new Image block", async () => {
  const requests = [];
  const replaced = photoPage({
    frontMatter: {
      title: "Flor reemplazada",
      arena_enabled: true,
      arena_channel_id: "123",
      image: "/uploads/flor-nueva.jpg",
      image_alt: "Flor nueva",
      arena_blocks: [{ src: "/uploads/flor-vieja.jpg", block_id: "501", connection_id: "801" }],
    },
  });
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (url.includes("/channels/123/contents") && url.includes("sort=")) {
      const oldLookup = requests.filter((request) => request.url.includes("/channels/123/contents")).length === 1;
      return jsonResponse(200, oldLookup
        ? { data: [{ id: 501, type: "Image", connection: { id: 801 } }] }
        : { data: [] });
    }
    if (url.endsWith("/connections/801") && options.method === "DELETE") return emptyResponse();
    if (url === "https://api.are.na/v3/blocks" && options.method === "POST") {
      return jsonResponse(201, { id: 502, type: "Image", state: "available" });
    }
    if (url.includes("/blocks/502/connections")) return jsonResponse(200, { data: [] });
    if (url === "https://api.are.na/v3/connections" && options.method === "POST") {
      return jsonResponse(201, { data: [{ id: 802 }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: replaced, fetchImpl });

  assert.equal(requests.some((request) => request.url.endsWith("/connections/801") && request.method === "DELETE"), true);
  assert.equal(requests.find((request) => request.url === "https://api.are.na/v3/blocks").body.value, "https://fbetancourt.work/uploads/flor-nueva.jpg");
  assert.equal(result.blocks[0].blockId, "502");
});

test("disabled image mirroring disconnects every gallery block", async () => {
  const requests = [];
  const disabled = photoPage({
    frontMatter: {
      title: "Galería",
      arena_enabled: false,
      arena_channel_id: "123",
      image: "/uploads/uno.jpg",
      images: [
        { src: "/uploads/uno.jpg", alt: "Uno" },
        { src: "/uploads/dos.jpg", alt: "Dos" },
      ],
      arena_blocks: [
        { src: "/uploads/uno.jpg", block_id: "501", connection_id: "801" },
        { src: "/uploads/dos.jpg", block_id: "502", connection_id: "802" },
      ],
    },
  });
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method });
    if (url.includes("/channels/123/contents")) {
      const id = url.includes("unused") ? 0 : requests.filter((request) => request.url.includes("/channels/123/contents")).length;
      return jsonResponse(200, { data: [{ id: 500 + id, type: "Image", connection: { id: 800 + id } }] });
    }
    if (url.includes("/connections/") && options.method === "DELETE") return emptyResponse();
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: disabled, fetchImpl });

  assert.equal(result.state, "disabled");
  assert.deepEqual(result.blocks.map((block) => block.connectionId), ["", ""]);
  assert.equal(requests.filter((request) => request.method === "DELETE").length, 2);
});

test("arenaMappingPatch stores one mapping per image", () => {
  const target = photoPage();
  const patch = arenaMappingPatch(target, {
    kind: "images",
    blocks: [
      { src: "/uploads/flor-1.jpg", blockId: "501", connectionId: "801" },
      { src: "/uploads/flor-2.jpg", blockId: "502", connectionId: "802" },
    ],
  });

  assert.deepEqual(patch, {
    arena_blocks: [
      { src: "/uploads/flor-1.jpg", block_id: "501", connection_id: "801" },
      { src: "/uploads/flor-2.jpg", block_id: "502", connection_id: "802" },
    ],
  });
});

test("image-only posts outside Fotografía are mirrored as Image blocks", async () => {
  const requests = [];
  const imagePost = photoPage({
    path: "content_es/posts/2026/julio/imagen-suelta.md",
    url: "/es/posts/2026/julio/imagen-suelta/",
    body: "",
  });
  const fetchImpl = async (url, options) => {
    requests.push({ url, method: options.method, body: options.body ? JSON.parse(options.body) : null });
    if (url.includes("/channels/123/contents")) return jsonResponse(200, { data: [] });
    if (url === "https://api.are.na/v3/blocks" && options.method === "POST") {
      return jsonResponse(201, { id: 601, type: "Image", state: "available" });
    }
    if (url.includes("/blocks/601/connections")) return jsonResponse(200, { data: [] });
    if (url === "https://api.are.na/v3/connections" && options.method === "POST") {
      return jsonResponse(201, { data: [{ id: 901 }] });
    }
    throw new Error(`Unexpected request: ${options.method} ${url}`);
  };

  const result = await syncArenaPage({ token: "secret", page: imagePost, fetchImpl });

  assert.equal(result.kind, "images");
  assert.equal(requests.find((request) => request.url === "https://api.are.na/v3/blocks").body.value, "https://fbetancourt.work/uploads/flor-1.jpg");
});

test("the author editor offers Are.na to every post and excludes only notebooks", () => {
  const postHtml = postEditorHtml();
  const notebookHtml = notebookEditorHtml();

  assert.match(postHtml, /"arenaEligible":true/);
  assert.match(notebookHtml, /"arenaEligible":false/);
  assert.doesNotMatch(postHtml, /kind === "notebook"/);
  assert.doesNotMatch(notebookHtml, /kind !== "notebook"/);
});
