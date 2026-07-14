import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { reconcileContent } from "../../lib/content-reconciler.mjs";
import { acceptsPush, verifyGitHubSignature } from "../../lib/webhook-auth.mjs";

export const prerender = false;

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!await verifyGitHubSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)) {
    return response({ ok: false, error: "Invalid webhook signature." }, 401);
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") {
    return response({ ok: true, event: "ping" });
  }
  if (event !== "push") {
    return response({ ok: true, ignored: true, event }, 202);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  if (!acceptsPush(payload, env)) {
    return response({ ok: true, ignored: true, reason: "repository-or-branch" }, 202);
  }

  const deliveryId = request.headers.get("x-github-delivery");
  if (!deliveryId) {
    return response({ ok: false, error: "Missing GitHub delivery id." }, 400);
  }

  try {
    const result = await reconcileContent(env, {
      deliveryId,
      commitSha: payload.after,
      trigger: "webhook",
    });
    return response({ ok: true, ...result });
  } catch (error) {
    console.error("Content reconciliation failed", error);
    return response({ ok: false, error: "Content reconciliation failed." }, 500);
  }
};
