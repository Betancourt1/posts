import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

import { readJson } from "../../../../functions/_lib/http.js";
import { RATE_LIMIT, RATE_WINDOW_SQL, hashIp, validateGuestbookInput } from "../../lib/guestbook.mjs";

export const prerender = false;

type GuestbookValue = { name: string; message: string; site: string | null };
type GuestbookValidation = { ok: true; value: GuestbookValue } | { ok: false; error: string };

function envSecret(key: string) {
  const runtimeEnv = env as unknown as Record<string, unknown>;
  const value = runtimeEnv[key];
  return typeof value === "string" && value ? value : null;
}

async function verifyTurnstile(secret: string, token: string, ip: string) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const result = await response.json() as { success?: boolean };
    return Boolean(result.success);
  } catch {
    return false;
  }
}

export const GET: APIRoute = () => Response.json(
  { siteKey: envSecret("TURNSTILE_SITE_KEY") },
  { headers: { "cache-control": "no-store" } },
);

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await readJson(request);

    if (String(payload?.website_confirm || "").trim()) {
      return Response.json({ ok: true, entry: null }, { headers: { "cache-control": "no-store" } });
    }

    const validated = validateGuestbookInput(payload) as GuestbookValidation;
    if (!validated.ok) {
      return Response.json({ ok: false, error: validated.error }, { status: 400 });
    }

    const ip = request.headers.get("cf-connecting-ip") || "";
    const turnstileSecret = envSecret("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      const verified = await verifyTurnstile(turnstileSecret, String(payload?.turnstile_token || ""), ip);
      if (!verified) {
        return Response.json({ ok: false, error: "verification" }, { status: 400 });
      }
    }

    const salt = envSecret("GUESTBOOK_HASH_SALT") || "guestbook-salt";
    const ipHash = await hashIp(ip || "unknown", salt);

    const rate = await env.DB.prepare(RATE_WINDOW_SQL).bind(ipHash).first<{ recent: number }>();
    if (rate && Number(rate.recent) >= RATE_LIMIT) {
      return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const inserted = await env.DB.prepare(
      "INSERT INTO guestbook_entries (name, site, message, ip_hash) VALUES (?1, ?2, ?3, ?4) RETURNING id, name, site, message, created_at",
    )
      .bind(validated.value.name, validated.value.site, validated.value.message, ipHash)
      .first<{ id: number; name: string; site: string | null; message: string; created_at: string }>();

    return Response.json({ ok: true, entry: inserted }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "default" }, { status: 500 });
  }
};
