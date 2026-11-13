/**
 * Development smoke test for the real pipeline (needs GITHUB_TOKEN).
 *   node scripts/smoke-build.mjs start [samplePath]
 *   node scripts/smoke-build.mjs poll <buildId> [ms]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/config.mjs';
import { analyzeProject } from '../src/analyzer.mjs';
import { sanitizeSettings } from '../src/generator.mjs';
import { addProject, getBuild, newId, projectDir, save } from '../src/store.mjs';
import { publicBuild, startBuild, tick } from '../src/builds.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

const cmd = process.argv[2] || 'start';

if (cmd === 'start') {
  const sample = process.argv[3] || 'samples/web-demo';
  const id = newId('prj_');
  const dir = projectDir(id);
  fs.mkdirSync(dir, { recursive: true });
  copyDir(path.join(ROOT, sample), path.join(dir, 'src'));

  const analysis = analyzeProject(path.join(dir, 'src'));
  const settings = sanitizeSettings({ appName: 'Habit Demo', bundleId: 'com.openmgz.habitdemo' }, analysis);
  settings.allowPublicPush = true;

  const now = new Date().toISOString();
  const project = {
    id,
    name: 'Habit Demo',
    createdAt: now,
    updatedAt: now,
    status: 'analyzed',
    settings,
    analysis,
    archive: { bytes: 0, files: 0, skipped: [] },
  };
  addProject(project);
  save();

  console.log('strategy:', analysis.strategy, '| supported:', analysis.supported);
  const build = await startBuild(project);
  console.log(JSON.stringify({ buildId: build.id, projectId: id, branch: build.branch, commit: build.commit }));
  process.exit(0);
}

if (cmd === 'poll') {
  const id = process.argv[3];
  const budget = Number(process.argv[4] || 90_000);
  const deadline = Date.now() + budget;
  let last = '';

  while (Date.now() < deadline) {
    await tick();
    const b = getBuild(id);
    if (!b) {
      console.log('build not found');
      process.exit(3);
    }
    const line = `${b.status} ${b.conclusion || ''} steps=${(b.steps || []).length} ${b.error || ''}`;
    if (line !== last) {
      console.log(new Date().toISOString().slice(11, 19), line);
      last = line;
    }
    if (['completed', 'failed'].includes(b.status)) {
      console.log(JSON.stringify(publicBuild(b), null, 2));
      process.exit(b.status === 'completed' ? 0 : 1);
    }
    await sleep(8000);
  }
  const b = getBuild(id);
  console.log('still running:', b?.status, 'runId:', b?.runId || 'not resolved yet');
  process.exit(2);
}
