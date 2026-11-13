import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const int = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export const config = {
  port: int(process.env.PORT, 4400),
  dataDir: process.env.DATA_DIR ? path.resolve(ROOT, process.env.DATA_DIR) : path.join(ROOT, 'data'),
  get projectsDir() { return path.join(this.dataDir, 'projects'); },
  get buildsDir() { return path.join(this.dataDir, 'builds'); },

  repo: process.env.GITHUB_REPO || 'moha700m/Openmgz',
  token: process.env.GITHUB_TOKEN || '',
  workflow: process.env.GITHUB_WORKFLOW || 'ios-ipa.yml',
  branchPrefix: process.env.BUILD_BRANCH_PREFIX || 'openmgz/build-',

  maxArchiveBytes: int(process.env.MAX_ARCHIVE_BYTES, 120 * 1024 * 1024),
  maxExtractedBytes: int(process.env.MAX_EXTRACTED_BYTES, 600 * 1024 * 1024),
  maxEntries: int(process.env.MAX_ENTRIES, 20_000),

  pollMs: int(process.env.POLL_MS, 8000),
  artifactRetentionDays: int(process.env.ARTIFACT_RETENTION_DAYS, 7),
};

export const hasToken = () => Boolean(config.token);
