import {
  arenaImageOriginFromEnv,
  arenaMappingPatch,
  arenaTokenFromEnv,
  createArenaChannel,
  syncArenaPage,
} from "../../_lib/arena.js";
import { isNotebookIndex, projectionSourcePath } from "../../_lib/content-storage.js";
import { readPage, savePageFrontMatter } from "../../_lib/content.js";
import { readRepositoryTree } from "../../_lib/github.js";
import { errorResponse, jsonResponse, readJson } from "../../_lib/http.js";

function notebookPathFromIndex(path) {
  const value = String(path || "").trim();
  if (!/^content(?:_es|_en)?\/[^/]+\/_index\.md$/.test(projectionSourcePath(value))) {
    throw new Error("Ruta de notebook invalida.");
  }
  return value.slice(0, value.lastIndexOf("/"));
}

function publicPageUrl(page, publicOrigin) {
  return new URL(String(page.url || "/"), publicOrigin).href;
}

function channelUrl(channel, fallback = "") {
  if (channel?.url) return channel.url;
  return String(fallback || "");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function onRequestPost({ env, request }) {
  try {
    const payload = await readJson(request);
    const indexPath = String(payload.path || "");
    const notebook = await readPage(env, indexPath);
    const notebookPath = notebookPathFromIndex(notebook.path);
    const token = arenaTokenFromEnv(env);
    const publicOrigin = String(env.PUBLIC_SITE_ORIGIN || "https://fbetancourt.work").replace(/\/+$/, "");
    const imageOrigin = arenaImageOriginFromEnv(env, publicOrigin);
    let channel = null;
    let channelId = String(notebook.frontMatter.arena_channel_id || "");

    if (!channelId) {
      channel = await createArenaChannel({
        token,
        title: notebook.frontMatter.title || notebookPath.split("/").at(-1),
        description: [
          String(notebook.frontMatter.description || "").trim(),
          `[Originally published on the blog](${publicPageUrl(notebook, publicOrigin)})`,
        ].filter(Boolean).join("\n\n"),
        visibility: "closed",
        metadata: {
          integration: "fbetancourt_blog",
          notebook_path: notebookPath,
        },
      });
      channelId = channel.id;
      await savePageFrontMatter(env, indexPath, {
        arena_channel_id: channelId,
        arena_channel_slug: channel.slug,
        arena_channel_url: channel.url,
      });
    }

    const tree = await readRepositoryTree(env);
    const paths = tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path)
      .filter((path) => path.startsWith(`${notebookPath}/`) && path.endsWith(".md") && !isNotebookIndex(path));
    const pages = await Promise.all(paths.map((path) => readPage(env, path)));
    const publishable = pages.filter((page) => page.frontMatter.draft !== true && page.frontMatter.hidden !== true);
    const results = [];

    for (let index = 0; index < publishable.length; index += 1) {
      const page = publishable[index];
      if (index > 0) await delay(250);

      try {
        const configuredPage = {
          ...page,
          frontMatter: {
            ...page.frontMatter,
            arena_enabled: true,
            arena_channel_id: channelId,
          },
        };
        const arena = await syncArenaPage({
          token,
          page: configuredPage,
          publicOrigin,
          imageOrigin,
        });
        await savePageFrontMatter(env, page.path, {
          arena_enabled: true,
          arena_channel_id: channelId,
          ...arenaMappingPatch(configuredPage, arena),
        });
        results.push({ path: page.path, state: arena.state });
      } catch (error) {
        results.push({ path: page.path, state: "error", error: error.message });
      }
    }

    const failures = results.filter((result) => result.state === "error");
    return jsonResponse({
      channel: {
        id: channelId,
        slug: channel?.slug || String(notebook.frontMatter.arena_channel_slug || ""),
        title: channel?.title || String(notebook.frontMatter.title || "Notebook"),
        url: channelUrl(channel, notebook.frontMatter.arena_channel_url),
      },
      total: publishable.length,
      synced: results.length - failures.length,
      failures,
      results,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
