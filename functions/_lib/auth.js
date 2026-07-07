function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function asciiBytes(value) {
  return Uint8Array.from(value, (char) => char.charCodeAt(0));
}

function exactAudienceMatch(payloadAudience, expectedAudience) {
  const audiences = Array.isArray(payloadAudience) ? payloadAudience : [payloadAudience];
  return audiences.includes(expectedAudience);
}

function normalizeAccessDomain(domain) {
  const value = String(domain || "").replace(/\/+$/, "");

  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(value)) {
    throw new Error("CF_ACCESS_DOMAIN invalido.");
  }

  return value;
}

async function validateAccessJwt(request, env) {
  const domain = normalizeAccessDomain(env.CF_ACCESS_DOMAIN);
  const aud = String(env.CF_ACCESS_AUD || "").trim();
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");

  if (!aud) {
    throw new Error("CF_ACCESS_AUD no esta configurado.");
  }

  if (!jwt) {
    throw new Error("No hay JWT de Cloudflare Access.");
  }

  const parts = jwt.split(".");

  if (parts.length !== 3) {
    throw new Error("JWT invalido.");
  }

  const [header, payload, signature] = parts;
  const decoder = new TextDecoder();
  const headerPayload = JSON.parse(decoder.decode(base64UrlDecode(header)));
  const payloadObject = JSON.parse(decoder.decode(base64UrlDecode(payload)));

  if (headerPayload.alg !== "RS256") {
    throw new Error("Algoritmo JWT invalido.");
  }

  const certsUrl = `${domain}/cdn-cgi/access/certs`;
  const certsResponse = await fetch(certsUrl);

  if (!certsResponse.ok) {
    throw new Error("No se pudieron leer las llaves de Cloudflare Access.");
  }

  const certs = await certsResponse.json();
  const jwk = (certs.keys || []).find((key) => key.kid === headerPayload.kid);

  if (!jwk) {
    throw new Error("No se encontro la llave JWT.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlDecode(signature),
    asciiBytes(`${header}.${payload}`),
  );

  if (!verified) {
    throw new Error("JWT no verificable.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (payloadObject.iss !== domain) {
    throw new Error("Issuer JWT invalido.");
  }
  if (!exactAudienceMatch(payloadObject.aud, aud)) {
    throw new Error("Audience JWT invalido.");
  }
  if (payloadObject.exp && now >= payloadObject.exp) {
    throw new Error("JWT expirado.");
  }
  if (payloadObject.nbf && now < payloadObject.nbf) {
    throw new Error("JWT aun no valido.");
  }

  return payloadObject;
}

export async function requireAuthor(context) {
  const payload = await validateAccessJwt(context.request, context.env);
  const expectedEmail = String(context.env.AUTHOR_EMAIL || "").trim().toLowerCase();
  const actualEmail = String(payload.email || "").trim().toLowerCase();

  if (!expectedEmail) {
    throw new Error("AUTHOR_EMAIL no esta configurado.");
  }
  if (!actualEmail || actualEmail !== expectedEmail) {
    throw new Error("Usuario no autorizado.");
  }

  return { email: actualEmail, payload };
}
