import { deleteNotebook } from "../../_lib/content.js";
import { errorResponse, jsonResponse, readJson } from "../../_lib/http.js";

export async function onRequestPost({ env, request }) {
  try {
    return jsonResponse(await deleteNotebook(env, await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
