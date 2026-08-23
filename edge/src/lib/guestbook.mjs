export const RATE_LIMIT = 3;
export const RATE_WINDOW_SQL = `
  SELECT COUNT(*) AS recent
  FROM guestbook_entries
  WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')
`;

const NAME_MAX = 40;
const SITE_MAX = 100;
const MESSAGE_MAX = 280;

function clean(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateGuestbookInput(raw) {
  const name = clean(raw?.name);
  const message = clean(raw?.message);
  const site = clean(raw?.site);

  if (!name) return { ok: false, error: "name_required" };
  if (name.length > NAME_MAX) return { ok: false, error: "name_too_long" };
  if (!message) return { ok: false, error: "message_required" };
  if (message.length > MESSAGE_MAX) return { ok: false, error: "message_too_long" };
  if (site) {
    if (site.length > SITE_MAX) return { ok: false, error: "site_too_long" };
    if (!/^https?:\/\/[^\s]+$/i.test(site)) return { ok: false, error: "site_invalid" };
  }

  return { ok: true, value: { name, message, site: site || null } };
}

export async function hashIp(ip, salt) {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
