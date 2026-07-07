import { readPage } from "../../_lib/content.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url);
    return jsonResponse(await readPage(env, url.searchParams.get("path")));
  } catch (error) {
    return errorResponse(error);
  }
}
