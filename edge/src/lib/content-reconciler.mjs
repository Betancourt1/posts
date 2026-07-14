import { projectSource } from "./content-projector.mjs";
import {
  contentStats,
  deleteSources,
  finishProjection,
  replaceProjectedSource,
  sourceStates,
} from "./content-store.mjs";
import { readBlob, readContentTree } from "./github-content.mjs";

const MAX_BLOB_REQUESTS = 35;
const MAX_CHANGED_SOURCES = 3;
const MAX_HEAD_PASSES = 3;

async function startRun(db, { deliveryId, commitSha, trigger }) {
  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO sync_runs (delivery_id, commit_sha, trigger, status)
    VALUES (?, ?, ?, 'running')
  `).bind(deliveryId || null, commitSha || null, trigger).run();

  if (inserted.meta?.changes) {
    return { id: inserted.meta.last_row_id, duplicate: false };
  }

  const existing = await db
    .prepare(`
      SELECT id, status,
        unixepoch('now') - unixepoch(started_at) AS age_seconds
      FROM sync_runs WHERE delivery_id = ?
    `)
    .bind(deliveryId)
    .first();

  const stale = existing?.status === "running" && Number(existing.age_seconds) >= 300;
  if (!existing || (existing.status !== "failed" && !stale)) {
    return { id: existing?.id, duplicate: true };
  }

  await db.prepare(`
    UPDATE sync_runs
    SET status = 'running', error = NULL, started_at = CURRENT_TIMESTAMP, finished_at = NULL
    WHERE id = ?
  `).bind(existing.id).run();

  return { id: existing.id, duplicate: false };
}

async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

export async function reconcileContent(env, options = {}) {
  const projectorVersion = String(env.CONTENT_PROJECTOR_VERSION || "1");
  const run = await startRun(env.DB, {
    deliveryId: options.deliveryId,
    commitSha: options.commitSha,
    trigger: options.trigger || "webhook",
  });

  if (run.duplicate) {
    return { duplicate: true, stats: await contentStats(env.DB) };
  }

  try {
    let tree = await readContentTree(env);
    let blobRequests = 0;
    let changed = 0;
    let deleted = 0;

    for (let pass = 1; pass <= MAX_HEAD_PASSES; pass += 1) {
      const existing = await sourceStates(env.DB);
      const currentPaths = new Set(tree.entries.map((entry) => entry.path));
      const changedEntries = tree.entries.filter((entry) => {
        const state = existing.get(entry.path);
        return !state || state.blob_sha !== entry.sha || state.projector_version !== projectorVersion;
      });

      if (changed + changedEntries.length > MAX_CHANGED_SOURCES) {
        throw new Error(
          `Projection requires ${changedEntries.length} source updates; run the D1 seed CLI for a bulk rebuild.`,
        );
      }
      if (blobRequests + changedEntries.length > MAX_BLOB_REQUESTS) {
        throw new Error(
          `Projection requires ${changedEntries.length} blob fetches; run the D1 seed CLI for a full rebuild.`,
        );
      }

      const projectedSources = await mapConcurrent(changedEntries, 6, async (entry) => {
        const rawMarkdown = await readBlob(env, entry.sha);
        return projectSource({
          path: entry.path,
          rawMarkdown,
          blobSha: entry.sha,
          commitSha: tree.commitSha,
          projectorVersion,
        });
      });
      blobRequests += changedEntries.length;

      for (const source of projectedSources) {
        await replaceProjectedSource(env.DB, source, run.id);
      }

      const deletedPaths = [...existing.keys()].filter((path) => !currentPaths.has(path));
      await deleteSources(env.DB, deletedPaths);
      await finishProjection(env.DB);
      changed += projectedSources.length;
      deleted += deletedPaths.length;

      const latestTree = await readContentTree(env);
      if (latestTree.commitSha === tree.commitSha) break;
      if (pass === MAX_HEAD_PASSES) {
        throw new Error("Repository HEAD kept changing during content reconciliation.");
      }
      tree = latestTree;
    }

    const stats = await contentStats(env.DB);
    await env.DB.prepare(`
      UPDATE sync_runs
      SET commit_sha = ?, status = 'complete', finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(tree.commitSha, run.id).run();

    return {
      duplicate: false,
      changed,
      deleted,
      commitSha: tree.commitSha,
      stats,
    };
  } catch (error) {
    await env.DB.prepare(`
      UPDATE sync_runs
      SET status = 'failed', error = ?, finished_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(String(error?.message || error).slice(0, 4000), run.id).run();
    throw error;
  }
}
