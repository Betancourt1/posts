import { jsonResponse } from "../../../functions/_lib/http.js";
import { validCvId } from "./cv-visits.mjs";

export async function listCvAttributions({ env }) {
  try {
    const result = await env.DB.prepare(
      "SELECT cv_id, enabled, expires_at FROM cv_attributions ORDER BY expires_at DESC, cv_id",
    ).all();
    if (!result.success) throw new Error("D1 query failed");
    return jsonResponse({ attributions: result.results });
  } catch {
    return jsonResponse({ error: "storage_unavailable" }, 503);
  }
}

export async function registerCvAttribution({ env, request }) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return jsonResponse({ error: "origin_invalid" }, 403);
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return jsonResponse({ error: "json_required" }, 415);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "id_invalid" }, 400);
  }
  if (!payload || Array.isArray(payload) || Object.keys(payload).length !== 1 || !validCvId(payload.cv_id)) {
    return jsonResponse({ error: "id_invalid" }, 400);
  }
  try {
    const result = await env.DB.prepare(
      "INSERT INTO cv_attributions (cv_id) VALUES (?) ON CONFLICT(cv_id) DO NOTHING",
    ).bind(payload.cv_id).run();
    if (!result.success) throw new Error("D1 insert failed");
    const attribution = await env.DB.prepare(
      "SELECT cv_id, enabled, expires_at FROM cv_attributions WHERE cv_id = ?",
    ).bind(payload.cv_id).first();
    if (!attribution) throw new Error("D1 readback failed");
    const created = result.meta.changes > 0;
    return jsonResponse({ created, attribution }, created ? 201 : 200);
  } catch {
    return jsonResponse({ error: "storage_unavailable" }, 503);
  }
}
