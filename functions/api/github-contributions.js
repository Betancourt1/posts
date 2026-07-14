import { fetchGitHubContributions } from "../_lib/github-contributions.js";

function json(payload, status, cacheControl) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": cacheControl,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export async function onRequestGet({ env }) {
  try {
    const contributions = await fetchGitHubContributions(env);
    return json(
      contributions,
      200,
      "public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400",
    );
  } catch (error) {
    return json(
      { error: error.message || "GitHub contribution data is unavailable." },
      Number(error.status || 502),
      "no-store",
    );
  }
}
