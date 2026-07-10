import { arenaTokenFromEnv, syncArenaPage } from "../../_lib/arena.js";
import { deletePage, readPage } from "../../_lib/content.js";
import { errorResponse, jsonResponse, readJson } from "../../_lib/http.js";

export async function onRequestPost({ env, request }) {
  try {
    const payload = await readJson(request);
    const page = await readPage(env, payload.path);
    const shouldDisconnect = page.frontMatter.arena_block_id &&
      (page.frontMatter.arena_enabled === true || page.frontMatter.arena_connection_id);

    if (shouldDisconnect) {
      await syncArenaPage({
        token: arenaTokenFromEnv(env),
        page: {
          ...page,
          frontMatter: { ...page.frontMatter, arena_enabled: false },
        },
        publicOrigin: env.PUBLIC_SITE_ORIGIN || "https://fbetancourt.work",
      });
    }

    return jsonResponse(await deletePage(env, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
