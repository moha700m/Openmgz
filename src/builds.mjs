/** Build orchestration: push project → dispatch workflow → poll → fetch IPA. */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';
import { addBuild, buildDir, data, getBuild, getProject, listProjects, newId, projectDir, save } from './store.mjs';
import { generateIosProject, listFiles, sanitizeSettings } from './generator.mjs';
import {
  GithubError,
  commitFiles,
  downloadArtifact,
  downloadRunLogs,
  dispatchWorkflow,
  findRun,
  getRun,
  getRunJobs,
  repoInfo,
  runArtifacts,
} from './github.mjs';
import { readZip } from './zip.mjs';

const SKIP = new Set(['node_modules', '.git', 'Pods', 'build', 'dist', '.next', '.expo', 'ios/build', 'DerivedData']);
const MAX_FILES = 700;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 90 * 1024 * 1024;

const listeners = new Set();
export function onBuildEvent(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(event) {
  for (const fn of listeners) {
    try { fn(event); } catch { /* ignore */ }
  }
}

export function publicBuild(b) {
  if (!b) return null;
  return {
    id: b.id,
    projectId: b.projectId,
    projectName: b.projectName,
    status: b.status,
    conclusion: b.conclusion ?? null,
    branch: b.branch,
    commit: b.commit,
    runId: b.runId || null,
    runUrl: b.runId ? `https://github.com/${config.repo}/actions/runs/${b.runId}` : null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    finishedAt: b.finishedAt || null,
    error: b.error || null,
    ipa: b.ipa || null,
    steps: b.steps || [],
    strategy: b.strategy,
    appName: b.appName,
  };
}

function collectSource(dir, prefix, acc = [], depth = 0, totals = { bytes: 0 }) {
  if (depth > 12) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name) || entry.name === '.git') continue;
    const abs = path.join(dir, entry.name);
    const stat = fs.statSync(abs);
    if (entry.isDirectory()) {
      collectSource(abs, `${prefix}/${entry.name}`, acc, depth + 1, totals);
    } else if (entry.isFile()) {
      if (stat.size > MAX_FILE_BYTES) continue;
      totals.bytes += stat.size;
      if (totals.bytes > MAX_TOTAL_BYTES) throw new Error('Project is too large to push (90 MB limit). Use a private repo and push manually.');
      acc.push({ path: `${prefix}/${entry.name}`, content: fs.readFileSync(abs) });
      if (acc.length > MAX_FILES) throw new Error(`Project has more than ${MAX_FILES} files to push.`);
    }
  }
  return acc;
}

export async function startBuild(project, options = {}) {
  if (!config.token) {
    throw Object.assign(new Error('GITHUB_TOKEN is not configured on the server. Add it to .env and restart.'), { status: 400 });
  }
  const analysis = project.analysis;
  if (!analysis?.supported) {
    throw Object.assign(new Error(analysis?.reason || 'This project has no supported build strategy.'), { status: 400 });
  }

  const info = await repoInfo().catch((err) => {
    throw Object.assign(new Error(`Cannot reach repository ${config.repo}: ${err.message}`), { status: 400 });
  });

  const allowPublic = project.settings?.allowPublicPush === true;
  if (!info.private && !allowPublic) {
    throw Object.assign(
      new Error(
        `Repository ${config.repo} is public. Building pushes your project source into it, which would publish your code. ` +
          'Point GITHUB_REPO at a private repository, or enable "allow public push" for this project if the code is safe to publish.',
      ),
      { status: 409, code: 'public_repo' },
    );
  }

  const buildId = newId('bld_');
  const settings = sanitizeSettings(project.settings, analysis);
  const branch = `${config.branchPrefix}${project.id}`;
  const buildPath = `builds/${buildId}`;

  const dir = buildDir(buildId);
  fs.mkdirSync(dir, { recursive: true });

  // 1. Generate (or locate) the iOS project.
  let generated = { generated: false, dir: null, files: [], notes: [] };
  if (analysis.strategy === 'web-wrapper') {
    generated = generateIosProject({
      srcDir: path.join(projectDir(project.id), 'src'),
      analysis,
      settings,
      outDir: dir,
    });
  }

  // 2. Assemble repo files.
  const files = [];
  let projectPath;
  if (generated.generated) {
    projectPath = `${buildPath}/ios`;
    // generated.files are relative to the build directory and already start
    // with "ios/", so they are pushed under builds/<id>/ and the Xcode project
    // lives at builds/<id>/ios.
    for (const rel of generated.files) {
      files.push({ path: `${buildPath}/${rel}`, content: fs.readFileSync(path.join(dir, rel)) });
    }
  } else {
    projectPath = `${buildPath}/src`;
    collectSource(path.join(projectDir(project.id), 'src'), projectPath, files);
  }

  const manifest = {
    buildId,
    projectId: project.id,
    strategy: analysis.strategy,
    projectType: analysis.projectType,
    settings,
    hints: analysis.bundleHints,
    createdAt: new Date().toISOString(),
  };
  files.push({ path: `${buildPath}/manifest.json`, content: JSON.stringify(manifest, null, 2) });

  // 3. Push and dispatch.
  const { sha } = await commitFiles({
    branch,
    message: `openmgz: build ${buildId} for ${project.name}`,
    files,
  });

  const inputs = {
    build_id: buildId,
    project_path: projectPath,
    strategy: analysis.strategy,
    app_name: settings.appName,
    bundle_id: settings.bundleId,
    version: settings.version,
    scheme: settings.scheme || '',
    build_command: settings.buildCommand || '',
    output_dir: settings.outputDir || '',
    manifest_path: `${buildPath}/manifest.json`,
    branch,
  };

  await dispatchWorkflow(inputs, info.default_branch);

  const build = {
    id: buildId,
    projectId: project.id,
    projectName: project.name,
    strategy: analysis.strategy,
    appName: settings.appName,
    bundleId: settings.bundleId,
    branch,
    commit: sha,
    runId: null,
    status: 'queued',
    conclusion: null,
    steps: [],
    error: null,
    ipa: null,
    notes: generated.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  addBuild(build);
  project.status = 'building';
  save();
  setTimeout(() => tick().catch(() => {}), 4000);
  emit({ type: 'build', build: publicBuild(build) });
  return build;
}

/* ------------------------------ polling ------------------------------ */

let ticking = false;

export async function tick() {
  if (ticking || !config.token) return;
  ticking = true;
  try {
    const active = data.builds.filter((b) => ['queued', 'in_progress'].includes(b.status));
    for (const build of active) {
      try {
        await advance(build);
      } catch (err) {
        if (err instanceof GithubError && err.status === 404) continue;
        build.error = err.message;
        build.updatedAt = new Date().toISOString();
      }
    }
    if (active.length) save();
  } finally {
    ticking = false;
  }
}

async function advance(build) {
  if (!build.runId) {
    const run = await findRun(build.id, build.createdAt);
    if (!run) {
      if (Date.now() - Date.parse(build.createdAt) > 180_000) {
        build.status = 'failed';
        build.error = 'Workflow run was never created. Check that .github/workflows/ios-ipa.yml exists on the default branch and has workflow_dispatch.';
      }
      return;
    }
    build.runId = run.id;
    build.runUrl = run.html_url;
    build.status = 'in_progress';
    build.updatedAt = new Date().toISOString();
    emit({ type: 'build', build: publicBuild(build) });
    return;
  }

  const run = await getRun(build.runId);
  build.status = run.status;
  build.conclusion = run.conclusion;
  build.updatedAt = new Date().toISOString();

  if (run.status !== 'completed') {
    const jobs = await getRunJobs(build.runId).catch(() => []);
    build.steps = jobs.flatMap((j) => j.steps.map((s) => ({ job: j.name, ...s })));
    emit({ type: 'build', build: publicBuild(build) });
    return;
  }

  const dir = buildDir(build.id);
  fs.mkdirSync(dir, { recursive: true });

  if (run.conclusion === 'success') {
    const artifacts = await runArtifacts(build.runId);
    const artifact = artifacts.find((a) => a.name.startsWith('ipa-')) || artifacts[0];
    if (!artifact) {
      build.status = 'failed';
      build.error = 'Workflow succeeded but produced no artifact.';
    } else {
      const zip = await downloadArtifact(artifact);
      const entries = readZip(zip);
      const ipa = entries.find((e) => e.name.endsWith('.ipa'));
      if (!ipa) {
        build.status = 'failed';
        build.error = 'Artifact did not contain an .ipa file.';
      } else {
        const file = path.join(dir, 'app.ipa');
        fs.writeFileSync(file, ipa.data);
        build.ipa = {
          name: path.basename(ipa.name),
          size: ipa.data.length,
          artifact: artifact.name,
          downloadedAt: new Date().toISOString(),
          path: file,
        };
        build.status = 'completed';
        build.error = null;
      }
    }
  } else {
    build.status = 'failed';
    build.error = `Workflow concluded: ${run.conclusion}`;
    try {
      const logsZip = await downloadRunLogs(build.runId);
      const entries = readZip(logsZip);
      const text = entries
        .map((e) => `===== ${e.name} =====\n${e.data.toString('utf8')}`)
        .join('\n\n')
        .slice(0, 400_000);
      fs.writeFileSync(path.join(dir, 'build.log'), text);
    } catch {
      /* logs are best effort */
    }
  }

  build.finishedAt = new Date().toISOString();
  const project = getProject(build.projectId);
  if (project) project.status = build.status === 'completed' ? 'built' : 'failed';
  save();
  emit({ type: 'build', build: publicBuild(build) });
}

export function buildLogs(build) {
  const file = path.join(buildDir(build.id), 'build.log');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return '';
}

export function ipaPath(build) {
  const file = path.join(buildDir(build.id), 'app.ipa');
  return fs.existsSync(file) ? file : null;
}

export function startPoller() {
  setInterval(() => tick().catch(() => {}), config.pollMs);
  // Resume anything still running after a restart.
  setTimeout(() => tick().catch(() => {}), 2000);
}
