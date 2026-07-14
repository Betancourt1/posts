import { requireAuthor } from "../../../functions/_lib/auth.js";

function unauthorizedResponse(error) {
  return new Response(JSON.stringify({ error: error.message || "No autorizado." }), {
    status: 401,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function invokePagesFunction(handler, { env, request }) {
  return handler({ env, request, data: {} });
}

export async function invokeAuthorPagesFunction(handler, { env, request }) {
  const startedAt = performance.now();
  let authDuration = 0;
  const context = { env, request, data: {} };

  try {
    const authStartedAt = performance.now();
    context.data.author = await requireAuthor(context);
    authDuration = performance.now() - authStartedAt;
    const response = await handler(context);
    const headers = new Headers(response.headers);
    headers.set(
      "Server-Timing",
      `auth;dur=${authDuration.toFixed(1)}, total;dur=${(performance.now() - startedAt).toFixed(1)}`,
    );
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return unauthorizedResponse(error);
  }
}
