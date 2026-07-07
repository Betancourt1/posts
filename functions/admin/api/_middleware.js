import { requireAuthor } from "../../_lib/auth.js";

export async function onRequest(context) {
  try {
    context.data.author = await requireAuthor(context);
    return context.next();
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "No autorizado." }), {
      status: 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
