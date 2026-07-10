import { arenaTokenFromEnv, getArenaStatus } from "../../_lib/arena.js";
import { readPage } from "../../_lib/content.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    const page = await readPage(env, url.searchParams.get("path"));
    const token = arenaTokenFromEnv(env);
    return jsonResponse(await getArenaStatus({ token, page }));
  } catch (error) {
    return errorResponse(error);
  }
}
