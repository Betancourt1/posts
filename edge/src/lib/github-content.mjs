function required(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function config(env) {
  return {
    owner: required(env, "GITHUB_OWNER"),
    repo: required(env, "GITHUB_REPO"),
    branch: required(env, "GITHUB_BRANCH"),
    token: required(env, "GITHUB_TOKEN"),
  };
}

async function request(env, path) {
  const { token } = config(env);
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "posts-edge-projector",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function repositoryPath(env, suffix) {
  const { owner, repo } = config(env);
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}${suffix}`;
}

function decodeBase64(value) {
  const binary = atob(String(value || "").replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function readContentTree(env) {
  const { branch } = config(env);
  const ref = await request(
    env,
    repositoryPath(env, `/git/ref/heads/${encodeURIComponent(branch)}`),
  );
  const commitSha = ref.object.sha;
  const commit = await request(env, repositoryPath(env, `/git/commits/${commitSha}`));
  const tree = await request(
    env,
    repositoryPath(env, `/git/trees/${commit.tree.sha}?recursive=1`),
  );

  if (tree.truncated) {
    throw new Error("GitHub returned a truncated repository tree.");
  }

  return {
    commitSha,
    entries: (tree.tree || []).filter(
      (entry) => entry.type === "blob" && /^content_(?:en|es)\/.+\.md$/.test(entry.path),
    ),
  };
}

export async function readBlob(env, sha) {
  const blob = await request(env, repositoryPath(env, `/git/blobs/${encodeURIComponent(sha)}`));
  if (blob.encoding !== "base64") {
    throw new Error(`Unsupported GitHub blob encoding: ${blob.encoding}`);
  }
  return decodeBase64(blob.content);
}
