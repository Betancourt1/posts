function requireEnv(env, name) {
  const value = String(env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} no esta configurado.`);
  }

  return value;
}

function githubConfig(env) {
  return {
    owner: requireEnv(env, "GITHUB_OWNER"),
    repo: requireEnv(env, "GITHUB_REPO"),
    branch: requireEnv(env, "GITHUB_BRANCH"),
    token: requireEnv(env, "GITHUB_TOKEN"),
  };
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value || "").replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function githubRequest(env, path, options = {}) {
  const config = githubConfig(env);
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "posts-author-editor",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message = payload.message || `GitHub API error ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

function repoPath(env, suffix) {
  const { owner, repo } = githubConfig(env);
  return `/repos/${owner}/${repo}${suffix}`;
}

export async function readGitHubFile(env, filePath) {
  const { branch } = githubConfig(env);
  const encodedPath = filePath.split("/").map(encodeURIComponent).join("/");

  try {
    const payload = await githubRequest(
      env,
      repoPath(env, `/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`),
    );

    if (Array.isArray(payload) || payload.type !== "file") {
      throw new Error("La ruta no apunta a un archivo.");
    }

    return {
      path: payload.path,
      sha: payload.sha,
      content: decodeBase64Utf8(payload.content),
    };
  } catch (error) {
    if (String(error.message || "").includes("Not Found")) {
      return null;
    }

    throw error;
  }
}

export async function writeGitHubFile(env, { path, content, message, sha }) {
  return writeGitHubFileBase64(env, {
    path,
    contentBase64: encodeBase64Utf8(content),
    message,
    sha,
  });
}

export async function writeGitHubFileBase64(env, { path, contentBase64, message, sha }) {
  const { branch } = githubConfig(env);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const body = {
    message,
    content: contentBase64,
    branch,
  };

  if (sha) {
    body.sha = sha;
  }

  return githubRequest(env, repoPath(env, `/contents/${encodedPath}`), {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteGitHubFile(env, { path, message, sha }) {
  const { branch } = githubConfig(env);
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  return githubRequest(env, repoPath(env, `/contents/${encodedPath}`), {
    method: "DELETE",
    body: JSON.stringify({
      message,
      sha,
      branch,
    }),
  });
}

export async function readRepositoryTree(env) {
  const { branch } = githubConfig(env);
  const ref = await githubRequest(env, repoPath(env, `/git/ref/heads/${encodeURIComponent(branch)}`));
  const commit = await githubRequest(env, repoPath(env, `/git/commits/${ref.object.sha}`));
  const tree = await githubRequest(env, repoPath(env, `/git/trees/${commit.tree.sha}?recursive=1`));

  return tree.tree || [];
}
