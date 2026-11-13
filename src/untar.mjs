/**
 * Dependency-free tar / tar.gz / zip extractor with hard safety limits.
 * Rejects absolute paths, `..` segments, symlinks, hardlinks and devices,
 * caps entry count and total bytes, and strips a single wrapper directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { config } from './config.mjs';
import { readZip } from './zip.mjs';

const BLOCK = 512;

const cstr = (buf, start, len) => {
  let end = start;
  const stop = start + len;
  while (end < stop && buf[end] !== 0) end++;
  return buf.subarray(start, end).toString('utf8');
};

const octal = (buf, start, len) => {
  const raw = cstr(buf, start, len).trim();
  if (!raw) return 0;
  const n = parseInt(raw, 8);
  return Number.isFinite(n) ? n : 0;
};

const isGzip = (buf) => buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b;
const isZip = (buf) => buf.length > 4 && buf[0] === 0x50 && buf[1] === 0x4b;

function checksumOk(header) {
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) {
    sum += i >= 148 && i < 156 ? 32 : header[i];
  }
  return sum === octal(header, 148, 8);
}

function parsePax(data) {
  const out = {};
  let i = 0;
  while (i < data.length) {
    const space = data.indexOf(0x20, i);
    if (space === -1) break;
    const len = parseInt(data.subarray(i, space).toString('utf8'), 10);
    if (!Number.isFinite(len) || len <= 0) break;
    const record = data.subarray(space + 1, i + len - 1).toString('utf8');
    const eq = record.indexOf('=');
    if (eq > 0) out[record.slice(0, eq)] = record.slice(eq + 1);
    i += len;
  }
  return out;
}

function safeName(raw) {
  const name = String(raw).replace(/\\/g, '/').replace(/^\.\//, '');
  if (!name || name === '.') return null;
  if (name.startsWith('/') || /^[a-zA-Z]:\//.test(name)) {
    throw new Error(`Archive contains an absolute path: ${name}`);
  }
  const segments = name.split('/').filter(Boolean);
  if (segments.some((s) => s === '..')) {
    throw new Error(`Archive contains a path traversal: ${name}`);
  }
  return segments.join('/');
}

/** Write parsed entries with identical safety rules for tar and zip. */
function writeEntries(entries, dest, maxBytes) {
  const firsts = new Set(entries.map((e) => e.name.split('/')[0]));
  let root = null;
  if (firsts.size === 1) {
    const only = [...firsts][0];
    const allNested = entries.every((e) => e.name === only || e.name.startsWith(`${only}/`));
    const hasChildren = entries.some((e) => e.name.startsWith(`${only}/`));
    if (allNested && hasChildren) root = only;
  }

  fs.mkdirSync(dest, { recursive: true });
  const destResolved = path.resolve(dest);
  let files = 0;
  let written = 0;

  for (const entry of entries) {
    let rel = entry.name;
    if (root) rel = rel.slice(root.length).replace(/^\//, '');
    if (!rel) continue;

    const resolved = path.resolve(dest, rel);
    if (resolved !== destResolved && !resolved.startsWith(destResolved + path.sep)) {
      throw new Error(`Refusing to write outside the project directory: ${rel}`);
    }
    if (written + (entry.size || 0) > maxBytes) {
      throw new Error(`Archive expands beyond the ${Math.round(maxBytes / 1e6)} MB limit.`);
    }

    if (entry.dir) {
      fs.mkdirSync(resolved, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, entry.data);
    files++;
    written += entry.size || 0;
  }

  return { files, bytes: written, root };
}

/**
 * @param {Buffer} buffer - raw .tar.gz or .tar contents
 * @param {string} dest - directory to extract into
 * @returns {{files:number, bytes:number, skipped:string[], root:string|null}}
 */
export function extractTar(buffer, dest, options = {}) {
  const maxEntries = options.maxEntries || config.maxEntries;
  const maxBytes = options.maxBytes || config.maxExtractedBytes;

  let tar = buffer;
  if (isGzip(buffer)) {
    tar = zlib.gunzipSync(buffer, { maxOutputLength: maxBytes + 64 * 1024 * 1024 });
  }
  if (tar.length < BLOCK) throw new Error('Archive is empty or not a tar file.');

  const entries = [];
  const skipped = [];
  let offset = 0;
  let total = 0;
  let pax = {};

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    if (header.every((b) => b === 0)) {
      offset += BLOCK;
      if (offset + BLOCK > tar.length) break;
      const next = tar.subarray(offset, offset + BLOCK);
      if (next.every((b) => b === 0)) break;
      continue;
    }
    if (!checksumOk(header)) {
      throw new Error(`Corrupt tar header at byte ${offset} (checksum mismatch).`);
    }

    const type = String.fromCharCode(header[156] || 0x30);
    const size = octal(header, 124, 12);
    const prefix = cstr(header, 345, 155);
    let name = cstr(header, 0, 100);
    if (prefix) name = `${prefix}/${name}`;
    if (pax.path) name = pax.path;

    const dataStart = offset + BLOCK;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) throw new Error('Archive is truncated.');

    if (type === 'x') {
      pax = { ...pax, ...parsePax(tar.subarray(dataStart, dataEnd)) };
      offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
      continue;
    }
    if (type === 'g') {
      pax = {};
      offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
      continue;
    }

    if (type === '2' || type === '1') {
      skipped.push(`${name} (link entries are not extracted)`);
      offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
      pax = {};
      continue;
    }
    if (type !== '0' && type !== '\0' && type !== '5') {
      skipped.push(`${name} (unsupported entry type ${JSON.stringify(type)})`);
      offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
      pax = {};
      continue;
    }

    const clean = safeName(name);
    if (clean) {
      total += size;
      if (total > maxBytes) throw new Error(`Archive expands beyond the ${Math.round(maxBytes / 1e6)} MB limit.`);
      if (entries.length >= maxEntries) throw new Error(`Archive has more than ${maxEntries} entries.`);
      entries.push({ name: clean, dir: type === '5', data: type === '5' ? null : tar.subarray(dataStart, dataEnd), size });
    }

    offset = dataStart + Math.ceil(size / BLOCK) * BLOCK;
    pax = {};
  }

  if (!entries.length) throw new Error('Archive has no files.');
  return { ...writeEntries(entries, dest, maxBytes), skipped };
}

/** ZIP archives (macOS "Compress", GitHub downloads, most upload tools). */
export function extractZip(buffer, dest, options = {}) {
  const maxEntries = options.maxEntries || config.maxEntries;
  const maxBytes = options.maxBytes || config.maxExtractedBytes;

  const raw = readZip(buffer);
  if (!raw.length) throw new Error('Archive is empty.');

  const entries = [];
  const skipped = [];
  let total = 0;

  for (const entry of raw) {
    if (entry.name.startsWith('__MACOSX/')) {
      skipped.push(`${entry.name} (macOS metadata)`);
      continue;
    }
    if (entry.name.includes('\u0000')) continue;

    const clean = safeName(entry.name);
    if (!clean) continue;
    if (!entry.dir && clean.endsWith('.DS_Store')) continue;

    total += entry.size || 0;
    if (total > maxBytes) throw new Error(`Archive expands beyond the ${Math.round(maxBytes / 1e6)} MB limit.`);
    if (entries.length >= maxEntries) throw new Error(`Archive has more than ${maxEntries} entries.`);

    entries.push({ name: clean, dir: entry.dir, data: entry.data, size: entry.size });
  }

  if (!entries.length) throw new Error('Archive has no files.');
  return { ...writeEntries(entries, dest, maxBytes), skipped };
}

/** Detect by magic bytes: PK = zip, 1f 8b = gzip, else assume tar. */
export function extractArchive(buffer, dest, options = {}) {
  return isZip(buffer) ? extractZip(buffer, dest, options) : extractTar(buffer, dest, options);
}

export function readArchive(file) {
  const stat = fs.statSync(file);
  if (stat.size > config.maxArchiveBytes) {
    throw new Error(`Archive is larger than the ${Math.round(config.maxArchiveBytes / 1e6)} MB limit.`);
  }
  return fs.readFileSync(file);
}
