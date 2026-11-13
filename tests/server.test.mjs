import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeTar } from './tarfixtures.mjs';

const PORT = 4411;
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omgz-data-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const child = spawn('node', ['server.mjs'], {
  cwd: path.resolve('.'),
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, GITHUB_TOKEN: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let log = '';
child.stdout.on('data', (d) => (log += d));
child.stderr.on('data', (d) => (log += d));

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails++;
};

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch { /* retry */ }
    await sleep(100);
  }
  return false;
}

const j = async (p, opts = {}) => {
  const res = await fetch(BASE + p, {
    method: opts.method || 'GET',
    headers: { 'content-type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

async function main() {
  check('server starts', await waitUp(), log.split('\n')[0]);

  const archive = makeTar([
    { name: 'demo/index.html', data: '<html><body><h1 id="mark">Openmgz demo</h1><script src="app.js"></script></body></html>' },
    { name: 'demo/app.js', data: 'document.title = "demo";' },
    { name: 'demo/styles.css', data: 'body{background:#000}' },
  ]);

  const upload = await fetch(`${BASE}/api/projects?name=mobile-demo`, {
    method: 'POST',
    headers: { 'content-type': 'application/gzip' },
    body: archive,
  });
  const uploaded = await upload.json();
  check('upload returns 201', upload.status === 201, `status=${upload.status}`);
  check('analyzer picks web-wrapper', uploaded.analysis?.strategy === 'web-wrapper', uploaded.analysis?.strategy);
  check('project name applied', uploaded.project?.name === 'Mobile Demo', uploaded.project?.name);

  const id = uploaded.project?.id;
  const detail = await j(`/api/projects/${id}`);
  check('project detail loads', detail.status === 200 && detail.data.project.fileCount === 3, `files=${detail.data.project?.fileCount}`);

  const preview = await fetch(`${BASE}/preview/${id}/index.html`);
  const html = await preview.text();
  check('preview serves the web app', preview.status === 200 && html.includes('Openmgz demo'));

  const generated = await j(`/api/projects/${id}/generate`, { method: 'POST' });
  check('generator runs', generated.data.generated === true, JSON.stringify(generated.data.notes || []).slice(0, 90));
  check('project.yml generated', (generated.data.files || []).some((f) => f.endsWith('project.yml')));
  check('swift shell generated', (generated.data.files || []).some((f) => f.endsWith('.swift')));
  check('static files bundled into app', (generated.data.files || []).some((f) => f.includes('App/www/index.html')));

  const patched = await j(`/api/projects/${id}`, { method: 'PATCH', body: { appName: 'Demo App', bundleId: 'com.acme.demo' } });
  check('settings patch', patched.status === 200 && patched.data.project.settings.bundleId === 'com.acme.demo');

  const build = await j(`/api/projects/${id}/build`, { method: 'POST' });
  check('build refuses without a token', build.status === 400 && /GITHUB_TOKEN/.test(build.data.error), build.data.error?.slice(0, 60));

  const bad = await fetch(`${BASE}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/gzip' }, body: Buffer.from('garbage') });
  check('garbage upload rejected', bad.status === 400);

  const removed = await j(`/api/projects/${id}`, { method: 'DELETE' });
  check('project delete', removed.status === 200);

  const state = await j('/api/state');
  check('state reports repo', state.data.repo === 'moha700m/Openmgz');
  check('state reports no token', state.data.hasToken === false);
  return fails;
}

let code = 1;
try {
  code = await main();
  console.log(code === 0 ? '\nALL SERVER TESTS PASSED' : `\n${code} CHECK(S) FAILED`);
} catch (e) {
  console.log('FATAL', e.message);
  console.log(log.slice(0, 2000));
} finally {
  child.kill('SIGKILL');
  fs.rmSync(dataDir, { recursive: true, force: true });
  setTimeout(() => process.exit(code ? 1 : 0), 120);
}
