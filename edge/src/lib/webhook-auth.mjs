function fromHex(value) {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g), (byte) => Number.parseInt(byte, 16));
}

function equalBytes(left, right) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyGitHubSignature(body, signature, secret) {
  const received = fromHex(String(signature || "").replace(/^sha256=/, ""));
  if (!received || !secret) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
  );

  return equalBytes(received, expected);
}

export function acceptsPush(payload, env) {
  const expectedRepository = `${env.GITHUB_OWNER}/${env.GITHUB_REPO}`.toLowerCase();
  const repository = String(payload?.repository?.full_name || "").toLowerCase();
  const expectedRef = `refs/heads/${env.GITHUB_BRANCH}`;

  return repository === expectedRepository && payload?.ref === expectedRef && payload?.deleted !== true;
}
