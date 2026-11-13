import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config.mjs';

const DB_FILE = path.join(config.dataDir, 'db.json');

fs.mkdirSync(config.projectsDir, { recursive: true });
fs.mkdirSync(config.buildsDir, { recursive: true });

const empty = () => ({ projects: [], builds: [] });
let db = empty();
if (fs.existsSync(DB_FILE)) {
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch {
    fs.copyFileSync(DB_FILE, `${DB_FILE}.corrupt-${Date.now()}`);
  }
}

export const data = db;
export const newId = (p = '') => p + crypto.randomBytes(8).toString('base64url');

let timer = null;
export function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, 40);
}
export function flush() {
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
process.on('exit', () => {
  try { flush(); } catch { /* ignore */ }
});

export const projectDir = (id) => path.join(config.projectsDir, id);
export const buildDir = (id) => path.join(config.buildsDir, id);

export function getProject(id) {
  return db.projects.find((p) => p.id === id);
}
export function listProjects() {
  return db.projects
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      projectType: p.analysis?.projectType || 'unknown',
      strategy: p.analysis?.strategy || null,
      supported: p.analysis?.supported ?? null,
      status: p.status || 'analyzed',
      lastBuild: db.builds.filter((b) => b.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null,
    }));
}
export function addProject(p) {
  db.projects.push(p);
  save();
  return p;
}
export function removeProject(id) {
  db.projects = db.projects.filter((p) => p.id !== id);
  db.builds = db.builds.filter((b) => b.projectId !== id);
  save();
}

export function getBuild(id) {
  return db.builds.find((b) => b.id === id);
}
export function listBuilds(limit = 50) {
  return db.builds
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
export function addBuild(b) {
  db.builds.push(b);
  save();
  return b;
}
