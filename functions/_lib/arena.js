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

function isImagePage(page) {
  const hasImages = imageItemsFromPage(page).length > 0;
  const isPhotographySection = /^content_(es|en)\/fotografia\/.+\.md$/.test(String(page?.path || ""));
  const hasWrittenBody = Boolean(String(page?.body || "").trim());
  return hasImages && (isPhotographySection || !hasWrittenBody);
}

function imageItemsFromPage(page) {
  const frontMatter = page?.frontMatter || {};
  const gallery = Array.isArray(frontMatter.images) && frontMatter.images.length
    ? frontMatter.images
    : frontMatter.image
      ? [{
          src: frontMatter.image,
          alt: frontMatter.image_alt,
          caption: frontMatter.caption,
        }]
      : [];

  return gallery
    .map((item, index) => ({
      src: String(item?.src || item?.image || item?.url || "").trim(),
      alt: String(item?.alt || item?.image_alt || (index === 0 ? frontMatter.image_alt : "") || pageTitle(page)).trim(),
      caption: String(item?.caption || (index === 0 ? frontMatter.caption : "") || "").trim(),
      index,
    }))
    .filter((item) => item.src);
}

function imageMappingsFromPage(page) {
  if (!Array.isArray(page?.frontMatter?.arena_blocks)) return [];

  return page.frontMatter.arena_blocks
    .map((item) => ({
      src: String(item?.src || "").trim(),
      blockId: String(item?.block_id || item?.blockId || "").trim(),
      connectionId: String(item?.connection_id || item?.connectionId || "").trim(),
    }))
    .filter((item) => item.blockId);
}

function imageMetadata(page, item) {
  return {
    ...pageMetadata(page),
    image_path: item.src,
    image_index: item.index,
  };
}

function imageBlockTitle(page, item, count) {
  const title = pageTitle(page);
  return count > 1 ? `${title} · ${item.index + 1}/${count}` : title;
}

function publicImageUrl(src, publicOrigin, imageOrigin) {
  const value = String(src || "").trim();
  if (/^https?:\/\//i.test(value)) return value;

  const base = String(imageOrigin || publicOrigin || PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  return `${base}/${value.replace(/^\/+/, "")}`;
}

export function arenaImageOriginFromEnv(env = {}, publicOrigin = PUBLIC_SITE_ORIGIN) {
  const configured = String(env.ARENA_ASSET_ORIGIN || "").trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (env.MEDIA) {
    return String(publicOrigin || PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
  }

  const owner = String(env.GITHUB_OWNER || "").trim();
  const repo = String(env.GITHUB_REPO || "").trim();
  const branch = String(env.GITHUB_BRANCH || "").trim();
  if (owner && repo && branch) {
    return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/static`;
  }

  return String(publicOrigin || PUBLIC_SITE_ORIGIN).replace(/\/+$/, "");
}

function publicPageUrl(page, publicOrigin = PUBLIC_SITE_ORIGIN) {
  return new URL(String(page?.url || "/"), String(publicOrigin || PUBLIC_SITE_ORIGIN)).href;
}

function sourceLinkMarkdown(page, publicOrigin) {
  return `[Publicado originalmente en el blog](${publicPageUrl(page, publicOrigin)})`;
}

function withSourceLink(value, page, publicOrigin) {
  const text = normalizeComparableMarkdown(value);
  const url = publicPageUrl(page, publicOrigin);
  if (text.includes(url)) return text;
  return [text, sourceLinkMarkdown(page, publicOrigin)].filter(Boolean).join("\n\n");
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

  return absolutizeRootRelativeLinks(withSourceLink(text, page, publicOrigin), publicOrigin);
}

export function prepareArenaImageDescription(page, item, publicOrigin = PUBLIC_SITE_ORIGIN) {
  return withSourceLink(item?.caption, page, publicOrigin);
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

function assertImageBlock(block) {
  if (!block?.id) {
    throw new ArenaApiError("Are.na no devolvio un identificador para la imagen.");
  }
  if (block.type && block.type !== "Image" && block.type !== "PendingBlock") {
    throw new ArenaApiError(`Are.na creo un bloque ${block.type} en vez de una imagen.`);
  }
  if (block.state === "failed") {
    throw new ArenaApiError("Are.na no pudo procesar la imagen.", { retryable: true });
  }
}

function imageBlockNeedsReplacement(block) {
  const type = String(block?.type || "");
  return block?.state === "failed" || (type && type !== "Image" && type !== "PendingBlock");
}

async function blockConnections({ token, blockId, fetchImpl }) {
  const payload = await arenaRequest(
    token,
    `/blocks/${encodeURIComponent(blockId)}/connections?filter=OWN&page=1&per=100`,
    { fetchImpl },
  );

  return payload.data || [];
}

async function findBlockInChannel({ token, channelId, blockId, blogPath, imageSrc = "", fetchImpl }) {
  const payload = await arenaRequest(
    token,
    `/channels/${encodeURIComponent(channelId)}/contents?sort=created_at_desc&page=1&per=100`,
    { fetchImpl },
  );

  return (payload.data || []).find((item) => {
    if (item?.type === "Channel" || item?.base_type === "Channel") return false;
    if (blockId && String(item?.id) === String(blockId)) return true;
    if (blockId) return false;
    if (item?.metadata?.integration !== "fbetancourt_blog") return false;
    if (String(item?.metadata?.blog_path || "") !== String(blogPath || "")) return false;
    return !imageSrc || String(item?.metadata?.image_path || "") === String(imageSrc);
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

export async function createArenaChannel({
  token,
  title,
  description = "",
  visibility = "closed",
  metadata = {},
  fetchImpl,
} = {}) {
  const channel = await arenaRequest(token, "/channels", {
    method: "POST",
    body: {
      title: String(title || "").trim(),
      visibility,
      description: String(description || "").trim(),
      metadata,
    },
    fetchImpl,
  });

  if (!channel?.id || !channel?.slug) {
    throw new ArenaApiError("Are.na no devolvio un canal valido.");
  }

  const ownerSlug = String(channel.owner?.slug || "").trim();
  const slug = String(channel.slug);
  return {
    id: String(channel.id),
    slug,
    title: String(channel.title || title || "Sin titulo"),
    visibility: String(channel.visibility || visibility),
    url: ownerSlug ? `https://www.are.na/${ownerSlug}/${slug}` : `https://www.are.na/channel/${slug}`,
  };
}

export async function getArenaStatus({
  token,
  page,
  publicOrigin = PUBLIC_SITE_ORIGIN,
  imageOrigin = publicOrigin,
  fetchImpl,
} = {}) {
  if (isImagePage(page)) {
    return getArenaImageStatus({ token, page, publicOrigin, imageOrigin, fetchImpl });
  }

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

async function getArenaImageStatus({ token, page, publicOrigin, imageOrigin, fetchImpl }) {
  const channelId = channelIdFromPage(page);
  const items = imageItemsFromPage(page);
  const mappings = imageMappingsFromPage(page);
  const base = {
    kind: "images",
    channelId,
    blockId: mappings[0]?.blockId || "",
    blockUrl: blockUrl(mappings[0]?.blockId),
    blocks: mappings.map((mapping) => ({
      ...mapping,
      blockUrl: blockUrl(mapping.blockId),
    })),
  };

  if (page?.frontMatter?.arena_enabled !== true) {
    const state = "disabled";
    if (!channelId || !mappings.length) return { ...base, state };

    const connectionSets = await Promise.all(mappings.map((mapping) => (
      blockConnections({ token, blockId: mapping.blockId, fetchImpl })
    )));
    const connected = connectionSets.some((connections) => (
      connections.some((channel) => String(channel.id) === String(channelId))
    ));
    return connected
      ? { ...base, state: "error", error: "Una o mas imagenes siguen conectadas al canal. Reintenta para retirarlas." }
      : {
          ...base,
          state,
          blocks: base.blocks.map((mapping) => ({ ...mapping, connectionId: "" })),
        };
  }

  if (!channelId) {
    return { ...base, state: "error", error: "Elige un canal de Are.na antes de guardar." };
  }
  if (!items.length) {
    return { ...base, state: "error", error: "La publicacion no contiene imagenes para copiar." };
  }
  if (!mappings.length) return { ...base, state: "pending" };

  const mappingBySource = new Map(mappings.map((mapping) => [mapping.src, mapping]));
  const currentMappings = items.map((item) => mappingBySource.get(item.src)).filter(Boolean);
  if (currentMappings.length !== items.length || mappings.length !== items.length) {
    return { ...base, state: "pending" };
  }

  const checks = await Promise.all(items.map(async (item) => {
    const mapping = mappingBySource.get(item.src);
    const [block, connections] = await Promise.all([
      arenaRequest(token, `/blocks/${encodeURIComponent(mapping.blockId)}`, { fetchImpl }),
      blockConnections({ token, blockId: mapping.blockId, fetchImpl }),
    ]);
    assertImageBlock(block);

    const expectedTitle = imageBlockTitle(page, item, items.length);
    const actualDescription = typeof block.description === "object"
      ? block.description?.markdown
      : block.description;
    const matches = expectedTitle === String(block.title || "").trim() &&
      prepareArenaImageDescription(page, item, publicOrigin) === String(actualDescription || "").trim() &&
      item.alt === String(block.image?.alt_text || block.alt_text || "").trim();
    const connected = connections.some((channel) => String(channel.id) === String(channelId));
    return {
      ...mapping,
      blockUrl: blockUrl(block.id),
      state: matches && connected && block.state === "available" ? "synced" : "pending",
      lastSyncedAt: String(block.updated_at || ""),
      sourceUrl: publicImageUrl(item.src, publicOrigin, imageOrigin),
    };
  }));

  return {
    ...base,
    state: checks.every((item) => item.state === "synced") ? "synced" : "pending",
    blocks: checks,
    lastSyncedAt: checks.map((item) => item.lastSyncedAt).filter(Boolean).sort().at(-1) || "",
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

async function ensureBlockConnection({
  token,
  page,
  blockId,
  channelId,
  existingConnectionId = "",
  metadata = pageMetadata(page),
  imageSrc = "",
  fetchImpl,
}) {
  const connections = await blockConnections({ token, blockId, fetchImpl });
  const connected = connections.some((channel) => String(channel.id) === String(channelId));

  if (connected) {
    const item = await findBlockInChannel({
      token,
      channelId,
      blockId,
      blogPath: page.path,
      imageSrc,
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
      channels: [{ id: apiId(channelId), metadata }],
    },
    fetchImpl,
  });
  const targetConnectionId = String(result.data?.[0]?.id || "");
  if (existingConnectionId && existingConnectionId !== targetConnectionId) {
    await deleteConnection({ token, connectionId: existingConnectionId, fetchImpl });
  }
  return targetConnectionId;
}

export async function syncArenaPage({
  token,
  page,
  publicOrigin = PUBLIC_SITE_ORIGIN,
  imageOrigin = publicOrigin,
  fetchImpl,
} = {}) {
  if (isImagePage(page)) {
    return syncArenaImages({ token, page, publicOrigin, imageOrigin, fetchImpl });
  }

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
    existingConnectionId: connectionId,
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

async function disconnectImageMapping({ token, page, mapping, channelId, fetchImpl }) {
  const mirrored = await findBlockInChannel({
    token,
    channelId,
    blockId: mapping.blockId,
    blogPath: page.path,
    imageSrc: mapping.src,
    fetchImpl,
  });
  const connectionId = String(mirrored?.connection?.id || mapping.connectionId || "");
  if (connectionId) {
    await deleteConnection({ token, connectionId, fetchImpl });
  }
}

async function syncArenaImage({
  token,
  page,
  item,
  itemCount,
  mapping,
  channelId,
  publicOrigin,
  imageOrigin,
  fetchImpl,
}) {
  const title = imageBlockTitle(page, item, itemCount);
  const metadata = imageMetadata(page, item);
  let blockId = String(mapping?.blockId || "");
  let connectionId = String(mapping?.connectionId || "");
  let block;

  if (!blockId) {
    const mirrored = await findBlockInChannel({
      token,
      channelId,
      blogPath: page.path,
      imageSrc: item.src,
      fetchImpl,
    });
    blockId = String(mirrored?.id || "");
    connectionId = String(mirrored?.connection?.id || "");
  }

  if (blockId) {
    try {
      block = await arenaRequest(token, `/blocks/${encodeURIComponent(blockId)}`, {
        method: "PUT",
        body: {
          title,
          description: prepareArenaImageDescription(page, item, publicOrigin),
          alt_text: item.alt,
          metadata,
        },
        fetchImpl,
      });
      if (imageBlockNeedsReplacement(block)) {
        await disconnectImageMapping({
          token,
          page,
          mapping: { src: item.src, blockId, connectionId },
          channelId,
          fetchImpl,
        });
        blockId = "";
        connectionId = "";
      } else {
        assertImageBlock(block);
      }
    } catch (error) {
      if (!(error instanceof ArenaApiError) || error.status !== 404) throw error;
      blockId = "";
      connectionId = "";
    }
  }

  if (!blockId) {
    block = await arenaRequest(token, "/blocks", {
      method: "POST",
      body: {
        value: publicImageUrl(item.src, publicOrigin, imageOrigin),
        title,
        description: prepareArenaImageDescription(page, item, publicOrigin),
        alt_text: item.alt,
        original_source_url: publicPageUrl(page, publicOrigin),
        original_source_title: pageTitle(page),
        metadata,
        channels: [{ id: apiId(channelId), metadata }],
      },
      fetchImpl,
    });
    assertImageBlock(block);
    blockId = String(block.id);
  }

  connectionId = await ensureBlockConnection({
    token,
    page,
    blockId,
    channelId,
    existingConnectionId: connectionId,
    metadata,
    imageSrc: item.src,
    fetchImpl,
  });

  return {
    src: item.src,
    blockId,
    connectionId,
    blockUrl: blockUrl(blockId),
    state: block.state === "available" ? "synced" : "pending",
    lastSyncedAt: String(block.updated_at || new Date().toISOString()),
  };
}

async function syncArenaImages({ token, page, publicOrigin, imageOrigin, fetchImpl }) {
  const channelId = channelIdFromPage(page);
  const items = imageItemsFromPage(page);
  const mappings = imageMappingsFromPage(page);
  const disabled = page?.frontMatter?.arena_enabled !== true;
  if (disabled) {
    if (channelId) {
      await Promise.all(mappings.map((mapping) => (
        disconnectImageMapping({ token, page, mapping, channelId, fetchImpl })
      )));
    }
    const blocks = mappings.map((mapping) => ({
      ...mapping,
      connectionId: "",
      blockUrl: blockUrl(mapping.blockId),
    }));
    return {
      kind: "images",
      state: "disabled",
      channelId,
      blockId: blocks[0]?.blockId || "",
      blockUrl: blocks[0]?.blockUrl || "",
      blocks,
    };
  }

  if (!channelId) {
    return { kind: "images", state: "error", channelId, blocks: [], error: "Elige un canal de Are.na antes de guardar." };
  }
  if (!items.length) {
    return { kind: "images", state: "error", channelId, blocks: [], error: "La publicacion no contiene imagenes para copiar." };
  }

  const mappingBySource = new Map(mappings.map((mapping) => [mapping.src, mapping]));
  const currentSources = new Set(items.map((item) => item.src));
  const staleMappings = mappings.filter((mapping) => !currentSources.has(mapping.src));
  await Promise.all(staleMappings.map((mapping) => (
    disconnectImageMapping({ token, page, mapping, channelId, fetchImpl })
  )));

  const blocks = [];
  const queue = items.slice();
  const workerCount = Math.min(2, queue.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const block = await syncArenaImage({
        token,
        page,
        item,
        itemCount: items.length,
        mapping: mappingBySource.get(item.src),
        channelId,
        publicOrigin,
        imageOrigin,
        fetchImpl,
      });
      blocks[item.index] = block;
    }
  }));

  return {
    kind: "images",
    state: blocks.every((block) => block.state === "synced") ? "synced" : "pending",
    channelId,
    blockId: blocks[0]?.blockId || "",
    blockUrl: blocks[0]?.blockUrl || "",
    blocks,
    lastSyncedAt: blocks.map((block) => block.lastSyncedAt).filter(Boolean).sort().at(-1) || "",
  };
}

export function arenaMappingPatch(page, arena) {
  if (arena?.kind === "images") {
    const blocks = (arena.blocks || []).map((block) => ({
      src: String(block.src || ""),
      block_id: String(block.blockId || ""),
      ...(block.connectionId ? { connection_id: String(block.connectionId) } : {}),
    }));
    const current = Array.isArray(page?.frontMatter?.arena_blocks) ? page.frontMatter.arena_blocks : [];
    return JSON.stringify(current) === JSON.stringify(blocks)
      ? {}
      : { arena_blocks: blocks.length ? blocks : null };
  }

  const patch = {};
  if (arena?.blockId && arena.blockId !== String(page?.frontMatter?.arena_block_id || "")) {
    patch.arena_block_id = arena.blockId;
  }
  if (String(arena?.connectionId || "") !== String(page?.frontMatter?.arena_connection_id || "")) {
    patch.arena_connection_id = arena?.connectionId || null;
  }
  return patch;
}

export function pageHasArenaMapping(page) {
  return Boolean(blockIdFromPage(page) || imageMappingsFromPage(page).length);
}
