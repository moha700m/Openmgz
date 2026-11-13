const NODE_MAJOR = Number(process.versions.node.split('.')[0]);
if (NODE_MAJOR < 20) {
  console.error(`Openmgz needs Node.js 20 or newer. You are running ${process.version}.`);
  console.error('Download it from https://nodejs.org and run start.command / start.bat again.');
  process.exit(1);
}

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config, hasToken, ROOT } from './src/config.mjs';
import {
  addProject,
  buildDir,
  data,
  getProject,
  listBuilds,
  listProjects,
  newId,
  projectDir,
  removeProject,
  save,
} from './src/store.mjs';
import { extractArchive } from './src/untar.mjs';
import { analyzeProject, publicAnalysis } from './src/analyzer.mjs';
import { generateIosProject, listFiles, sanitizeSettings } from './src/generator.mjs';
import { buildLogs, ipaPath, onBuildEvent, publicBuild, startBuild, startPoller, tick } from './src/builds.mjs';
import { repoInfo } from './src/github.mjs';

const PUBLIC_DIR = path.join(ROOT, 'public');
const STATIC = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
};

const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'app';

function titleCase(name) {
  return String(name || 'App')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 40) || 'App';
}

async function readJsonBody(req, limit = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
  }
}

async function saveUpload(req, dest) {
  let size = 0;
  const out = fs.createWriteStream(dest);
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > config.maxArchiveBytes) {
        throw Object.assign(new Error(`Archive exceeds ${Math.round(config.maxArchiveBytes / 1e6)} MB`), { status: 413 });
      }
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    }
  } finally {
    out.end();
    await new Promise((r) => out.once('close', r));
  }
  return size;
}

function sendFile(res, file, type, download = null) {
  const stat = fs.statSync(file);
  const headers = {
    'content-type': type,
    'content-length': stat.size,
    'cache-control': 'no-cache',
  };
  if (download) headers['content-disposition'] = `attachment; filename="${download}"`;
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

function serveStatic(req, res, urlPath) {
  const name = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  if (name.includes('..') || name.includes('/')) return false;
  const file = path.join(PUBLIC_DIR, name);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  sendFile(res, file, STATIC[path.extname(file)] || 'application/octet-stream');
  return true;
}

/** Serve a project's web build for the in-app iPhone preview. */
function servePreview(res, project, rest) {
  const src = path.join(projectDir(project.id), 'src');
  const hints = project.analysis?.bundleHints || {};
  const roots = [hints.outputDir, hints.entry, ''].filter((v) => v !== null && v !== undefined);
  for (const root of roots) {
    const base = path.resolve(src, root || '.');
    const target = path.resolve(base, rest || 'index.html');
    if (!target.startsWith(base + path.sep) && target !== base) continue;
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      sendFile(res, target, STATIC[path.extname(target)] || 'application/octet-stream');
      return true;
    }
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  const method = req.method || 'GET';

  try {
    if (method === 'GET' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/preview/')) {
      if (serveStatic(req, res, url.pathname)) return;
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, { ok: true, repo: config.repo, hasToken: hasToken(), workflow: config.workflow });
    }

    if (method === 'GET' && url.pathname === '/api/state') {
      const builds = listBuilds(30);
      return json(res, 200, {
        repo: config.repo,
        hasToken: hasToken(),
        workflow: config.workflow,
        sandbox: 'local',
        limits: {
          maxArchiveMB: Math.round(config.maxArchiveBytes / 1e6),
          maxExtractedMB: Math.round(config.maxExtractedBytes / 1e6),
        },
        stats: {
          projects: data.projects.length,
          builds: data.builds.length,
          succeeded: data.builds.filter((b) => b.status === 'completed').length,
          failed: data.builds.filter((b) => b.status === 'failed').length,
          running: data.builds.filter((b) => ['queued', 'in_progress'].includes(b.status)).length,
        },
        builds: builds.map(publicBuild),
      });
    }

    if (method === 'GET' && url.pathname === '/api/repo') {
      try {
        const info = await repoInfo();
        return json(res, 200, {
          fullName: info.full_name,
          private: info.private,
          defaultBranch: info.default_branch,
          permissions: info.permissions,
        });
      } catch (err) {
        return json(res, 200, { error: err.message, fullName: config.repo, private: null });
      }
    }

    /* ---------------- projects ---------------- */
    if (parts[0] === 'api' && parts[1] === 'projects') {
      if (parts.length === 2 && method === 'GET') {
        return json(res, 200, { projects: listProjects() });
      }

      if (parts.length === 2 && method === 'POST') {
        const id = newId('prj_');
        const dir = projectDir(id);
        fs.mkdirSync(dir, { recursive: true });
        const archive = path.join(dir, 'archive.tar.gz');
        const size = await saveUpload(req, archive);
        if (!size) {
          fs.rmSync(dir, { recursive: true, force: true });
          return json(res, 400, { error: 'Empty upload. Send the .tar.gz or .zip as the raw request body.' });
        }

        const srcDir = path.join(dir, 'src');
        let extraction;
        try {
          extraction = extractArchive(fs.readFileSync(archive), srcDir);
        } catch (err) {
          fs.rmSync(dir, { recursive: true, force: true });
          return json(res, 400, { error: `Could not extract archive: ${err.message}` });
        }
        fs.rmSync(archive, { force: true });

        const analysis = analyzeProject(srcDir);
        const rawName = url.searchParams.get('name') || extraction.root || 'app';
        const name = titleCase(rawName);
        const settings = sanitizeSettings({ appName: name }, analysis);

        const project = {
          id,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'analyzed',
          settings,
          analysis,
          archive: { bytes: size, files: extraction.files, skipped: extraction.skipped },
        };
        addProject(project);
        return json(res, 201, { project: withFiles(project), analysis: publicAnalysis(analysis) });
      }

      if (parts.length === 3 && method === 'GET') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        return json(res, 200, { project: withFiles(project), analysis: publicAnalysis(project.analysis) });
      }

      if (parts.length === 3 && method === 'PATCH') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        const body = await readJsonBody(req);
        project.settings = sanitizeSettings({ ...project.settings, ...body }, project.analysis);
        if (typeof body.name === 'string' && body.name.trim()) project.name = titleCase(body.name);
        if (typeof body.allowPublicPush === 'boolean') project.settings.allowPublicPush = body.allowPublicPush;
        project.updatedAt = new Date().toISOString();
        save();
        return json(res, 200, { project: withFiles(project) });
      }

      if (parts.length === 3 && method === 'DELETE') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        removeProject(project.id);
        fs.rmSync(projectDir(project.id), { recursive: true, force: true });
        return json(res, 200, { ok: true });
      }

      // re-run analysis
      if (parts.length === 4 && parts[3] === 'analyze' && method === 'POST') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        project.analysis = analyzeProject(path.join(projectDir(project.id), 'src'));
        project.settings = sanitizeSettings(project.settings, project.analysis);
        project.updatedAt = new Date().toISOString();
        save();
        return json(res, 200, { analysis: publicAnalysis(project.analysis) });
      }

      // generate the iOS project locally (no push)
      if (parts.length === 4 && parts[3] === 'generate' && method === 'POST') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        const out = generateIosProject({
          srcDir: path.join(projectDir(project.id), 'src'),
          analysis: project.analysis,
          settings: sanitizeSettings(project.settings, project.analysis),
          outDir: projectDir(project.id),
        });
        return json(res, 200, { generated: out.generated, notes: out.notes, files: out.files.slice(0, 200) });
      }

      if (parts.length === 4 && parts[3] === 'files' && method === 'GET') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        const src = path.join(projectDir(project.id), 'src');
        const files = listFiles(src)
          .filter((f) => !/(^|\/)(node_modules|\.git|Pods)\//.test(f) && !/\.(lock|log)$/.test(f))
          .slice(0, 600)
          .map((f) => ({ path: f, size: fs.statSync(path.join(src, f)).size }));
        return json(res, 200, { files, total: files.length });
      }

      // build
      if (parts.length === 4 && parts[3] === 'build' && method === 'POST') {
        const project = getProject(parts[2]);
        if (!project) return json(res, 404, { error: 'Project not found' });
        try {
          const build = await startBuild(project);
          return json(res, 202, { build: publicBuild(build) });
        } catch (err) {
          return json(res, err.status || 500, { error: err.message, code: err.code });
        }
      }
    }

    /* ---------------- builds ---------------- */
    if (parts[0] === 'api' && parts[1] === 'builds') {
      if (parts.length === 2 && method === 'GET') {
        return json(res, 200, { builds: listBuilds(100).map(publicBuild) });
      }
      if (parts.length === 3 && method === 'GET') {
        const build = data.builds.find((b) => b.id === parts[2]);
        if (!build) return json(res, 404, { error: 'Build not found' });
        return json(res, 200, { build: publicBuild(build) });
      }
      if (parts.length === 4 && parts[3] === 'logs' && method === 'GET') {
        const build = data.builds.find((b) => b.id === parts[2]);
        if (!build) return json(res, 404, { error: 'Build not found' });
        return json(res, 200, { logs: buildLogs(build).slice(-120_000) });
      }
      if (parts.length === 4 && parts[3] === 'ipa' && method === 'GET') {
        const build = data.builds.find((b) => b.id === parts[2]);
        if (!build) return json(res, 404, { error: 'Build not found' });
        const file = ipaPath(build);
        if (!file) return json(res, 404, { error: 'No IPA for this build yet' });
        return sendFile(res, file, 'application/octet-stream', `${slug(build.appName || 'app')}-${build.id}.ipa`);
      }
    }

    /* ---------------- preview + events ---------------- */
    if (parts[0] === 'preview' && parts[1]) {
      const project = getProject(parts[1]);
      if (!project) return json(res, 404, { error: 'Project not found' });
      const rest = parts.slice(2).join('/') || 'index.html';
      if (servePreview(res, project, rest)) return;
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('No preview available for this build output.');
    }

    if (method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      res.write('retry: 3000\n\n');
      const send = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
      const off = onBuildEvent(send);
      const timer = setInterval(() => res.write(': ping\n\n'), 20_000);
      req.on('close', () => {
        clearInterval(timer);
        off();
      });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) {
    if (!res.headersSent) json(res, err.status || 500, { error: err.message || 'Internal error' });
    else res.end();
  }
});

function withFiles(project) {
  const src = path.join(projectDir(project.id), 'src');
  let count = 0;
  try {
    count = listFiles(src).length;
  } catch {
    /* ignore */
  }
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    status: project.status,
    settings: project.settings,
    archive: project.archive,
    fileCount: count,
    analysis: publicAnalysis(project.analysis),
    previewAvailable: Boolean(project.analysis && ['web-wrapper'].includes(project.analysis.strategy)),
  };
}

server.listen(config.port, () => {
  console.log(`\n  Openmgz  →  http://localhost:${config.port}`);
  console.log(`  repo: ${config.repo}   token: ${hasToken() ? 'ok' : 'missing'}\n`);
  startPoller();
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    save();
    process.exit(0);
  });
}
