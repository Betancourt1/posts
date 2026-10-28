import { jsonResponse } from "../../../functions/_lib/http.js";
import { validCvId } from "./cv-visits.mjs";

const ATTRIBUTIONS = `
  SELECT a.cv_id, a.vacancy, a.enabled, a.expires_at,
    COUNT(v.id) AS visits, MAX(v.visited_at) AS last_visited_at
  FROM cv_attributions a LEFT JOIN cv_visit_events v ON v.cv_id = a.cv_id
`;

export async function listCvAttributions({ env }) {
  try {
    const result = await env.DB.prepare(
      `${ATTRIBUTIONS} GROUP BY a.cv_id ORDER BY a.expires_at DESC, a.cv_id`,
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
  if (!payload || Array.isArray(payload) || !validCvId(payload.cv_id)
    || Object.keys(payload).some((key) => key !== "cv_id" && key !== "vacancy")) {
    return jsonResponse({ error: "id_invalid" }, 400);
  }
  if (payload.vacancy !== undefined && (typeof payload.vacancy !== "string" || payload.vacancy.trim().length > 200)) {
    return jsonResponse({ error: "vacancy_invalid" }, 400);
  }
  const vacancy = payload.vacancy?.trim() || "";
  try {
    const result = await env.DB.prepare(
      "INSERT INTO cv_attributions (cv_id, vacancy) VALUES (?, ?) ON CONFLICT(cv_id) DO NOTHING",
    ).bind(payload.cv_id, vacancy).run();
    if (!result.success) throw new Error("D1 insert failed");
    const attribution = await env.DB.prepare(
      `${ATTRIBUTIONS} WHERE a.cv_id = ? GROUP BY a.cv_id`,
    ).bind(payload.cv_id).first();
    if (!attribution) throw new Error("D1 readback failed");
    const created = result.meta.changes > 0;
    return jsonResponse({ created, attribution }, created ? 201 : 200);
  } catch {
    return jsonResponse({ error: "storage_unavailable" }, 503);
  }
}
