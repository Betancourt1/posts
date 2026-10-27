export const MAX_BODY_BYTES = 128;
export const MAX_VISITS_PER_DAY = 100;
export const MAX_VISITS_PER_ID = 1000;

export function validCvId(value) {
  return typeof value === "string"
    && value.length >= 16 && value.length <= 64
    && !/[^A-Za-z0-9_-]/u.test(value);
}

// One atomic statement: concurrent requests cannot bypass either storage cap.
const INSERT_VISIT = `
  INSERT INTO cv_visit_events (cv_id)
  SELECT cv_id FROM cv_attributions
  WHERE cv_id = ?1 AND enabled = 1 AND expires_at > unixepoch()
    AND (SELECT COUNT(*) FROM cv_visit_events WHERE cv_id = ?1) < ?2
    AND (SELECT COUNT(*) FROM cv_visit_events
         WHERE cv_id = ?1 AND visited_at >= unixepoch() - 86400) < ?3
`;

function response(status) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(status === 405 ? { Allow: "POST" } : {}),
    },
  });
}

async function readPayload(request) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && !/^\d+$/u.test(declaredLength)) return { status: 400 };
  if (declaredLength !== null && Number(declaredLength) > MAX_BODY_BYTES) return { status: 413 };
  if (!request.body) return { status: 400 };

  const reader = request.body.getReader();
  const bytes = new Uint8Array(MAX_BODY_BYTES);
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (length + value.byteLength > MAX_BODY_BYTES) {
        await reader.cancel();
        return { status: 413 };
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    const payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, length)));
    if (!payload || Array.isArray(payload) || typeof payload !== "object"
      || Object.keys(payload).length !== 1 || !validCvId(payload.cv_id)) {
      return { status: 400 };
    }
    return { cvId: payload.cv_id };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

export async function receiveCvVisit(request, db) {
  if (request.method !== "POST") return response(405);
  const url = new URL(request.url);
  const fetchSite = request.headers.get("sec-fetch-site");
  if (request.headers.get("origin") !== url.origin
    || (fetchSite !== null && fetchSite !== "same-origin")) return response(403);
  if (url.search) return response(400);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json"
    || ![null, "identity"].includes(request.headers.get("content-encoding"))) return response(415);

  const payload = await readPayload(request);
  if (payload.status) return response(payload.status);
  try {
    const result = await db.prepare(INSERT_VISIT)
      .bind(payload.cvId, MAX_VISITS_PER_ID, MAX_VISITS_PER_DAY).run();
    if (!result.success) return response(503);
    // Never reveal whether the ID exists, is disabled/expired, or reached a cap.
    return response(204);
  } catch {
    // Do not log IDs, request bodies, headers, or database errors.
    return response(503);
  }
}
