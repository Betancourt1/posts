const ARENA_API_BASE = "https://api.are.na/v3";
const DEFAULT_TIMEOUT_MS = 12000;
const PUBLIC_SITE_ORIGIN = "https://fbetancourt.work";

export class ArenaApiError extends Error {
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message);
    this.name = "ArenaApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

export function arenaTokenFromEnv(env = {}) {
  const token = String(env.ARE_NA_API_KEY_RW || env.ARENA_ACCESS_TOKEN || "").trim();

  if (!token) {
    throw new ArenaApiError("La clave de Are.na no esta configurada.");
  }

  return token;
}

function retryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function responseErrorMessage(status, payload) {
  if (status === 401) return "La clave de Are.na no es valida.";
  if (status === 403) return "La clave de Are.na no tiene permiso de escritura para este canal.";
  if (status === 404) return "Are.na no encontro el bloque o canal configurado.";
  if (status === 429) return "Are.na alcanzo su limite temporal de solicitudes. Reintenta en un momento.";

  const detail = payload?.details?.message || payload?.message || payload?.error;
  return detail ? `Are.na: ${detail}` : `Are.na respondio con estado ${status}.`;
}

async function arenaRequest(token, path, {
  method = "GET",
  body,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new ArenaApiError("No hay un cliente HTTP disponible para Are.na.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${ARENA_API_BASE}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {};
      }
    }

    if (!response.ok) {
      throw new ArenaApiError(responseErrorMessage(response.status, payload), {
        status: response.status,
        retryable: retryableStatus(response.status),
      });
    }

    return payload;
  } catch (error) {
    if (error instanceof ArenaApiError) throw error;

    const timedOut = error?.name === "AbortError";
    throw new ArenaApiError(
      timedOut ? "Are.na tardo demasiado en responder." : "No se pudo conectar con Are.na.",
      { retryable: true },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function pageTitle(page) {
  return String(page?.frontMatter?.title || "Sin titulo").trim() || "Sin titulo";
}

function pageLanguage(path) {
  return String(path || "").startsWith("content_en/") ? "en" : "es";
}

function pageMetadata(page) {
  return {
    integration: "fbetancourt_blog",
    blog_path: String(page.path || ""),
    language: pageLanguage(page.path),
  };
}

function publicPageUrl(page, publicOrigin = PUBLIC_SITE_ORIGIN) {
  return new URL(String(page?.url || "/"), String(publicOrigin || PUBLIC_SITE_ORIGIN)).href;
}

function normalizeComparableMarkdown(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function absolutizeRootRelativeLinks(markdown, publicOrigin) {
  const origin = new URL(String(publicOrigin || PUBLIC_SITE_ORIGIN)).origin;

  return String(markdown || "")
    .replace(/(!?\[[^\]]*\]\()\/(?!\/)/g, `$1${origin}/`)
    .replace(/\b(src|href)=(["'])\/(?!\/)/gi, `$1=$2${origin}/`);
}

export function prepareArenaMarkdown(page, publicOrigin = PUBLIC_SITE_ORIGIN) {
  const title = pageTitle(page);
  const body = normalizeComparableMarkdown(page?.body);
  const text = !body || /^https?:\/\/\S+$/i.test(body)
    ? [`# ${title}`, body].filter(Boolean).join("\n\n")
    : body;

  return absolutizeRootRelativeLinks(text, publicOrigin);
}

function channelIdFromPage(page) {
  return String(page?.frontMatter?.arena_channel_id || "").trim();
}

function blockIdFromPage(page) {
  return String(page?.frontMatter?.arena_block_id || "").trim();
}

function connectionIdFromPage(page) {
  return String(page?.frontMatter?.arena_connection_id || "").trim();
}

function apiId(value) {
  const normalized = String(value || "").trim();
  return /^\d+$/.test(normalized) ? Number(normalized) : normalized;
}

function blockUrl(id) {
  return id ? `https://www.are.na/block/${id}` : "";
}

function pageBaseState(page) {
  const channelId = channelIdFromPage(page);
  const blockId = blockIdFromPage(page);
  const connectionId = connectionIdFromPage(page);

  if (page?.frontMatter?.arena_enabled !== true) {
    return { state: "disabled", channelId, blockId, connectionId, blockUrl: blockUrl(blockId) };
  }
  if (page?.frontMatter?.draft === true) {
    return { state: "paused", channelId, blockId, connectionId, blockUrl: blockUrl(blockId) };
  }
  if (!channelId) {
    return {
      state: "error",
      channelId,
      blockId,
      connectionId,
      blockUrl: blockUrl(blockId),
      error: "Elige un canal de Are.na antes de guardar.",
    };
  }

  return null;
}

function assertTextBlock(block) {
  if (!block?.id) {
    throw new ArenaApiError("Are.na no devolvio un identificador de bloque.");
  }
  if (block.type && block.type !== "Text" && block.type !== "PendingBlock") {
    throw new ArenaApiError(`Are.na creo un bloque ${block.type} en vez de un bloque de texto.`);
  }
  if (block.state === "failed") {
    throw new ArenaApiError("Are.na no pudo procesar el bloque de texto.", { retryable: true });
  }
}

async function blockConnections({ token, blockId, fetchImpl }) {
  const payload = await arenaRequest(
    token,
    `/blocks/${encodeURIComponent(blockId)}/connections?filter=OWN&page=1&per=100`,
    { fetchImpl },
  );

  return payload.data || [];
}

async function findBlockInChannel({ token, channelId, blockId, blogPath, fetchImpl }) {
  const payload = await arenaRequest(
    token,
    `/channels/${encodeURIComponent(channelId)}/contents?sort=created_at_desc&page=1&per=100`,
    { fetchImpl },
  );

  return (payload.data || []).find((item) => {
    if (item?.type === "Channel" || item?.base_type === "Channel") return false;
    if (blockId && String(item?.id) === String(blockId)) return true;
    return !blockId &&
      item?.metadata?.integration === "fbetancourt_blog" &&
      String(item?.metadata?.blog_path || "") === String(blogPath || "");
  }) || null;
}

export async function listArenaChannels({ token, fetchImpl } = {}) {
  const me = await arenaRequest(token, "/me", { fetchImpl });
  const slug = String(me.slug || "").trim();

  if (!slug) {
    throw new ArenaApiError("Are.na no devolvio el perfil de la cuenta.");
  }

  const contents = await arenaRequest(
    token,
    `/users/${encodeURIComponent(slug)}/contents?type=Channel&sort=updated_at_desc&page=1&per=100`,
    { fetchImpl },
  );
  const channels = (contents.data || [])
    .filter((item) => item?.type === "Channel")
    .map((item) => ({
      id: String(item.id),
      slug: String(item.slug || ""),
      title: String(item.title || "Sin titulo"),
      visibility: String(item.visibility || "closed"),
    }));

  return {
    profile: {
      id: String(me.id || ""),
      slug,
      name: String(me.name || ""),
      url: `https://www.are.na/${slug}`,
    },
    channels,
  };
}

export async function getArenaStatus({ token, page, publicOrigin = PUBLIC_SITE_ORIGIN, fetchImpl } = {}) {
  const baseState = pageBaseState(page);

  if (baseState) {
    if ((baseState.state === "disabled" || baseState.state === "paused") && baseState.blockId && baseState.channelId) {
      const connections = await blockConnections({ token, blockId: baseState.blockId, fetchImpl });
      const connected = connections.some((channel) => String(channel.id) === String(baseState.channelId));
      if (connected) {
        return {
          ...baseState,
          state: "error",
          error: "La copia sigue conectada al canal. Reintenta para retirarla.",
        };
      }
      return { ...baseState, connectionId: "" };
    }
    return baseState;
  }

  const channelId = channelIdFromPage(page);
  const blockId = blockIdFromPage(page);

  if (!blockId) {
    return { state: "pending", channelId, blockId: "", blockUrl: "" };
  }

  const [block, connections] = await Promise.all([
    arenaRequest(token, `/blocks/${encodeURIComponent(blockId)}`, { fetchImpl }),
    blockConnections({ token, blockId, fetchImpl }),
  ]);
  assertTextBlock(block);

  const expectedContent = normalizeComparableMarkdown(prepareArenaMarkdown(page, publicOrigin));
  const actualContent = normalizeComparableMarkdown(block.content?.markdown);
  const matches = expectedContent === actualContent && pageTitle(page) === String(block.title || "").trim();
  const connected = connections.some((channel) => String(channel.id) === String(channelId));

  return {
    state: matches && connected && block.state === "available" ? "synced" : "pending",
    channelId,
    blockId: String(block.id),
    connectionId: connectionIdFromPage(page),
    blockUrl: blockUrl(block.id),
    lastSyncedAt: String(block.updated_at || ""),
  };
}

async function disconnectBlock({ token, page, fetchImpl }) {
  const blockId = blockIdFromPage(page);
  const channelId = channelIdFromPage(page);
  let connectionId = connectionIdFromPage(page);

  if (!blockId || !channelId) return false;

  const item = await findBlockInChannel({
    token,
    channelId,
    blockId,
    blogPath: page.path,
    fetchImpl,
  });
  connectionId = String(item?.connection?.id || connectionId);

  if (!connectionId) return false;

  await deleteConnection({ token, connectionId, fetchImpl });
  return true;
}

async function deleteConnection({ token, connectionId, fetchImpl }) {
  if (!connectionId) return;
  try {
    await arenaRequest(token, `/connections/${encodeURIComponent(connectionId)}`, {
      method: "DELETE",
      fetchImpl,
    });
  } catch (error) {
    if (!(error instanceof ArenaApiError) || error.status !== 404) throw error;
  }
}

async function ensureBlockConnection({ token, page, blockId, channelId, fetchImpl }) {
  const existingConnectionId = connectionIdFromPage(page);
  const connections = await blockConnections({ token, blockId, fetchImpl });
  const connected = connections.some((channel) => String(channel.id) === String(channelId));

  if (connected) {
    const item = await findBlockInChannel({
      token,
      channelId,
      blockId,
      blogPath: page.path,
      fetchImpl,
    });
    const targetConnectionId = String(item?.connection?.id || existingConnectionId);
    if (existingConnectionId && targetConnectionId && existingConnectionId !== targetConnectionId) {
      await deleteConnection({ token, connectionId: existingConnectionId, fetchImpl });
    }
    return targetConnectionId;
  }

  const result = await arenaRequest(token, "/connections", {
    method: "POST",
    body: {
      connectable_id: Number(blockId),
      connectable_type: "Block",
      channels: [{ id: apiId(channelId), metadata: pageMetadata(page) }],
    },
    fetchImpl,
  });
  const targetConnectionId = String(result.data?.[0]?.id || "");
  if (existingConnectionId && existingConnectionId !== targetConnectionId) {
    await deleteConnection({ token, connectionId: existingConnectionId, fetchImpl });
  }
  return targetConnectionId;
}

export async function syncArenaPage({ token, page, publicOrigin = PUBLIC_SITE_ORIGIN, fetchImpl } = {}) {
  const baseState = pageBaseState(page);

  if (baseState) {
    if ((baseState.state === "disabled" || baseState.state === "paused") && baseState.blockId) {
      await disconnectBlock({ token, page, fetchImpl });
      return { ...baseState, connectionId: "" };
    }
    return baseState;
  }

  const channelId = channelIdFromPage(page);
  let existingBlockId = blockIdFromPage(page);
  const title = pageTitle(page);
  const content = prepareArenaMarkdown(page, publicOrigin);
  const metadata = pageMetadata(page);
  let connectionId = connectionIdFromPage(page);
  let block;

  if (!existingBlockId) {
    const mirroredBlock = await findBlockInChannel({
      token,
      channelId,
      blogPath: page.path,
      fetchImpl,
    });
    existingBlockId = String(mirroredBlock?.id || "");
    connectionId = String(mirroredBlock?.connection?.id || "");
  }

  if (existingBlockId) {
    try {
      block = await arenaRequest(token, `/blocks/${encodeURIComponent(existingBlockId)}`, {
        method: "PUT",
        body: { title, content, metadata },
        fetchImpl,
      });
      assertTextBlock(block);
    } catch (error) {
      if (!(error instanceof ArenaApiError) || error.status !== 404) throw error;
      existingBlockId = "";
      connectionId = "";
    }
  }

  if (!existingBlockId) {
    block = await arenaRequest(token, "/blocks", {
      method: "POST",
      body: {
        value: content,
        title,
        original_source_url: publicPageUrl(page, publicOrigin),
        original_source_title: title,
        metadata,
        channels: [{ id: apiId(channelId), metadata }],
      },
      fetchImpl,
    });
    assertTextBlock(block);
  }

  const pageWithConnection = {
    ...page,
    frontMatter: {
      ...page.frontMatter,
      arena_connection_id: connectionId,
    },
  };
  connectionId = await ensureBlockConnection({
    token,
    page: pageWithConnection,
    blockId: block.id,
    channelId,
    fetchImpl,
  });

  return {
    state: block.state === "available" ? "synced" : "pending",
    channelId,
    blockId: String(block.id),
    connectionId,
    blockUrl: blockUrl(block.id),
    lastSyncedAt: String(block.updated_at || new Date().toISOString()),
  };
}
