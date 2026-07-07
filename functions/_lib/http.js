export function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function htmlResponse(html) {
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("JSON invalido.");
  }
}

export function errorResponse(error) {
  return jsonResponse({ error: error.message || "Error del editor." }, 400);
}
