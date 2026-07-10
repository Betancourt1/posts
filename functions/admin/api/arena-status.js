import { arenaImageOriginFromEnv, arenaTokenFromEnv, getArenaStatus } from "../../_lib/arena.js";
import { readPage } from "../../_lib/content.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const page = await readPage(env, url.searchParams.get("path"));
    const token = arenaTokenFromEnv(env);
    const publicOrigin = env.PUBLIC_SITE_ORIGIN || "https://fbetancourt.work";
    return jsonResponse(await getArenaStatus({
      token,
      page,
      publicOrigin,
      imageOrigin: arenaImageOriginFromEnv(env, publicOrigin),
    }));
  } catch (error) {
    return errorResponse(error);
  }
}
