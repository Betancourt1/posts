import { listNotebooks } from "../../_lib/content.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet({ env }) {
  try {
    return jsonResponse({ notebooks: await listNotebooks(env) });
  } catch (error) {
    return errorResponse(error);
  }
}
