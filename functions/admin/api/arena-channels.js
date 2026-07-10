import { arenaTokenFromEnv, listArenaChannels } from "../../_lib/arena.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    const token = arenaTokenFromEnv(env);
    return jsonResponse(await listArenaChannels({ token }));
  } catch (error) {
    return errorResponse(error);
  }
}
