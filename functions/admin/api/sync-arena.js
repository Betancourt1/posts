import { arenaTokenFromEnv, syncArenaPage } from "../../_lib/arena.js";
import { readPage, savePageFrontMatter } from "../../_lib/content.js";
import { errorResponse, jsonResponse, readJson } from "../../_lib/http.js";

export async function onRequestPost({ env, request }) {
  try {
    const payload = await readJson(request);
    let page = await readPage(env, payload.path);
    const token = arenaTokenFromEnv(env);
    let arena = await syncArenaPage({
      token,
      page,
      publicOrigin: env.PUBLIC_SITE_ORIGIN || "https://fbetancourt.work",
    });

    const latestPage = await readPage(env, page.path);
    const configKey = (value) => JSON.stringify({
      enabled: value.frontMatter.arena_enabled === true,
      draft: value.frontMatter.draft === true,
      channelId: String(value.frontMatter.arena_channel_id || ""),
    });
    if (configKey(latestPage) !== configKey(page)) {
      page = latestPage;
      arena = await syncArenaPage({
        token,
        page,
        publicOrigin: env.PUBLIC_SITE_ORIGIN || "https://fbetancourt.work",
      });
    }

    const mappingPatch = {};
    if (arena.blockId && arena.blockId !== String(page.frontMatter.arena_block_id || "")) {
      mappingPatch.arena_block_id = arena.blockId;
    }
    if (String(arena.connectionId || "") !== String(page.frontMatter.arena_connection_id || "")) {
      mappingPatch.arena_connection_id = arena.connectionId || null;
    }
    if (Object.keys(mappingPatch).length) {
      await savePageFrontMatter(env, page.path, mappingPatch);
    }

    return jsonResponse({ path: page.path, arena });
  } catch (error) {
    return errorResponse(error);
  }
}
