/** GitHub REST client. The token never leaves the server. */
import { config } from './config.mjs';

const API = 'https://api.github.com';
const REPO = () => config.repo;

export class GithubError extends Error {
  constructor(message, status = 0, detail = '') {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function gh(pathname, { method = 'GET', body, accept = 'application/vnd.github+json' } = {}) {
  if (!config.token) throw new GithubError('GITHUB_TOKEN is not set on the server.', 401);
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      authorization: `Bearer ${config.token}`,
      accept,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'openmgz',
      'content-type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-json */
  }

  if (!res.ok) {
    const msg = json?.message || text.slice(0, 300) || res.statusText;
    throw new GithubError(`GitHub ${res.status}: ${msg}`, res.status, text.slice(0, 1000));
  }
  return json;
}

export async function repoInfo() {
  return gh(`/repos/${REPO()}`);
}

export async function getRefSha(branch) {
  try {
    const ref = await gh(`/repos/${REPO()}/git/ref/heads/${encodeURIComponent(branch)}`);
    return ref.object.sha;
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export async function commitFiles({ branch, base, message, files, concurrency = 5 }) {
  const baseBranch = base || (await repoInfo()).default_branch;
  const headSha = (await getRefSha(branch)) || (await getRefSha(baseBranch));
  if (!headSha) throw new GithubError(`Branch "${baseBranch}" does not exist.`);

  const baseCommit = await gh(`/repos/${REPO()}/git/commits/${headSha}`);

  const tree = [];
  const queue = files.slice();
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    while (queue.length) {
      const file = queue.shift();
      const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(String(file.content), 'utf8');
      const blob = await gh(`/repos/${REPO()}/git/blobs`, {
        method: 'POST',
        body: { content: content.toString('base64'), encoding: 'base64' },
      });
      tree.push({ path: file.path.replace(/^\/+/, ''), mode: '100644', type: 'blob', sha: blob.sha });
    }
  });
  await Promise.all(workers);

  const newTree = await gh(`/repos/${REPO()}/git/trees`, {
    method: 'POST',
    body: { base_tree: baseCommit.tree.sha, tree },
  });

  const commit = await gh(`/repos/${REPO()}/git/commits`, {
    method: 'POST',
    body: { message, tree: newTree.sha, parents: [headSha] },
  });

  if (await getRefSha(branch)) {
    await gh(`/repos/${REPO()}/git/refs/heads/${encodeURIComponent(branch)}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: true },
    });
  } else {
    await gh(`/repos/${REPO()}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${branch}`, sha: commit.sha },
    });
  }

  return { sha: commit.sha, files: files.length };
}

export async function dispatchWorkflow(inputs, ref) {
  const target = ref || (await repoInfo()).default_branch;
  await gh(`/repos/${REPO()}/actions/workflows/${config.workflow}/dispatches`, {
    method: 'POST',
    body: { ref: target, inputs },
  });
  return { ref: target };
}

export async function listRuns(perPage = 30) {
  const data = await gh(`/repos/${REPO()}/actions/runs?per_page=${perPage}&event=workflow_dispatch`);
  return data.workflow_runs || [];
}

export async function findRun(buildId, sinceIso) {
  const runs = await listRuns(30);
  const since = sinceIso ? Date.parse(sinceIso) - 120_000 : 0;
  return (
    runs.find((r) => (r.display_title || '').includes(buildId)) ||
    runs.find((r) => r.name && Date.parse(r.created_at) >= since) ||
    null
  );
}

export async function getRun(runId) {
  return gh(`/repos/${REPO()}/actions/runs/${runId}`);
}

export async function getRunJobs(runId) {
  const data = await gh(`/repos/${REPO()}/actions/runs/${runId}/jobs`);
  return (data.jobs || []).map((j) => ({
    name: j.name,
    status: j.status,
    conclusion: j.conclusion,
    steps: (j.steps || []).map((s) => ({ name: s.name, status: s.status, conclusion: s.conclusion })),
  }));
}

export async function runArtifacts(runId) {
  const data = await gh(`/repos/${REPO()}/actions/runs/${runId}/artifacts`);
  return data.artifacts || [];
}

export async function downloadArtifact(artifact) {
  if (!config.token) throw new GithubError('GITHUB_TOKEN is not set on the server.', 401);
  const res = await fetch(artifact.archive_download_url, {
    headers: { authorization: `Bearer ${config.token}`, 'user-agent': 'openmgz' },
    redirect: 'manual',
    signal: AbortSignal.timeout(120_000),
  });

  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get('location');
    if (!location) throw new GithubError('Artifact redirect had no location');
    const file = await fetch(location, { signal: AbortSignal.timeout(180_000) });
    if (!file.ok) throw new GithubError(`Artifact download failed: ${file.status}`);
    return Buffer.from(await file.arrayBuffer());
  }
  if (!res.ok) throw new GithubError(`Artifact download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function downloadRunLogs(runId) {
  if (!config.token) throw new GithubError('GITHUB_TOKEN is not set on the server.', 401);
  const res = await fetch(`${API}/repos/${REPO()}/actions/runs/${runId}/logs`, {
    headers: { authorization: `Bearer ${config.token}`, 'user-agent': 'openmgz' },
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (!loc) throw new GithubError('Log redirect had no location');
    const file = await fetch(loc);
    if (!file.ok) throw new GithubError(`Log download failed: ${file.status}`);
    return Buffer.from(await file.arrayBuffer());
  }
  if (!res.ok) throw new GithubError(`Log download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function rerunFailed(runId) {
  await gh(`/repos/${REPO()}/actions/runs/${runId}/rerun-failed-jobs`, { method: 'POST' });
}
