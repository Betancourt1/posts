import { photographyMirrorPath } from "../../../functions/_lib/content.js";
import { readGitHubFile } from "../../../functions/_lib/github.js";

import { projectSource } from "./content-projector.mjs";
import {
  deleteSources,
  finishProjection,
  replaceProjectedSource,
} from "./content-store.mjs";

const PROJECT_ACTIONS = new Set([
  "save-page",
  "create-post",
  "create-notebook",
  "sync-arena",
]);

const DEFAULT_DEPENDENCIES = {
  deleteSources,
  finishProjection,
  projectSource,
  readGitHubFile,
  replaceProjectedSource,
};

function projectionErrorResponse(error, saved = null) {
  return new Response(JSON.stringify({
    error: "GitHub was updated, but the live content projection failed.",
    projectionFailed: true,
    detail: String(error?.message || error),
    saved,
  }), {
    status: 500,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function mutationPayload(response) {
  try {
    return await response.clone().json();
  } catch {
    throw new Error("The successful admin mutation returned invalid JSON.");
  }
}

function requiredPath(payload) {
  const path = String(payload?.path || "").trim();
  if (!path) throw new Error("The successful admin mutation did not return a content path.");
  return path;
}

async function projectCanonicalFile(env, payload, dependencies) {
  const path = requiredPath(payload);
  const targets = [path];
  const mirror = payload.mirrorPath || photographyMirrorPath(path);
  if (mirror && !targets.includes(mirror)) {
    targets.push(mirror);
  }

  for (const targetPath of targets) {
    const file = await dependencies.readGitHubFile(env, targetPath);

    if (!file) {
      if (targetPath === path) {
        throw new Error(`The canonical GitHub file could not be read after saving: ${path}`);
      }
      continue;
    }

    const projection = dependencies.projectSource({
      path: file.path,
      rawMarkdown: file.content,
      blobSha: file.sha,
      commitSha: payload.commitSha || null,
      projectorVersion: String(env.CONTENT_PROJECTOR_VERSION || "1"),
    });

    await dependencies.replaceProjectedSource(env.DB, projection, null);
  }
}

function deletedContentPaths(action, payload) {
  const mirror = payload?.mirrorPath || photographyMirrorPath(payload?.path);
  const candidates = action === "delete-notebook"
    ? payload?.deletedFiles
    : [payload?.path, mirror];
  const paths = [...new Set(
    (Array.isArray(candidates) ? candidates : [])
      .map((path) => String(path || "").trim())
      .filter((path) => /^content_(?:en|es)\/.+\.md$/.test(path)),
  )];

  if (!paths.length) {
    throw new Error("The successful delete mutation did not return any content files.");
  }

  return paths;
}

export async function synchronizeAdminMutation(
  env,
  response,
  action,
  dependencyOverrides = {},
) {
  if (!response.ok) return response;

  const dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencyOverrides };
  let payload = null;

  try {
    payload = await mutationPayload(response);

    if (PROJECT_ACTIONS.has(action)) {
      await projectCanonicalFile(env, payload, dependencies);
    } else if (action === "delete-page" || action === "delete-notebook") {
      await dependencies.deleteSources(env.DB, deletedContentPaths(action, payload));
    } else {
      throw new Error(`Unsupported admin content action: ${action}`);
    }

    await dependencies.finishProjection(env.DB);
    return response;
  } catch (error) {
    return projectionErrorResponse(error, payload);
  }
}

export function withAdminContentSync(handler, action, dependencies = {}) {
  return async (context) => {
    const response = await handler(context);
    return synchronizeAdminMutation(context.env, response, action, dependencies);
  };
}
