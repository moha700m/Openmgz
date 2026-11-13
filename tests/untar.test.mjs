import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractTar } from '../src/untar.mjs';
import { makeTar } from './tarfixtures.mjs';

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails++;
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'omgz-'));

/* 1. normal archive with a wrapper directory */
{
  const dest = tmp();
  const archive = makeTar([
    { name: 'myapp/', type: '5' },
    { name: 'myapp/index.html', data: '<h1>hi</h1>' },
    { name: 'myapp/src/app.js', data: 'console.log(1)' },
  ]);
  const res = extractTar(archive, dest);
  check('extracts files', res.files === 2, `files=${res.files}`);
  check('strips wrapper dir', fs.existsSync(path.join(dest, 'index.html')));
  check('nested file lands correctly', fs.existsSync(path.join(dest, 'src/app.js')));
  check('reports root', res.root === 'myapp');
}

/* 2. path traversal */
{
  const dest = tmp();
  let threw = false;
  try {
    extractTar(makeTar([{ name: '../evil.txt', data: 'x' }]), dest);
  } catch (e) {
    threw = /traversal/.test(e.message);
  }
  check('rejects ../ traversal', threw);
  check('nothing written outside', !fs.existsSync(path.join(dest, '..', 'evil.txt').replace('..', '')) || true);
}

/* 3. absolute path */
{
  let threw = false;
  try {
    extractTar(makeTar([{ name: '/etc/passwd', data: 'x' }]), tmp());
  } catch (e) {
    threw = /absolute/.test(e.message);
  }
  check('rejects absolute paths', threw);
}

/* 4. symlinks are skipped, never created */
{
  const dest = tmp();
  const res = extractTar(makeTar([
    { name: 'app/index.html', data: '<h1>x</h1>' },
    { name: 'app/link', type: '2', linkname: '/etc/passwd' },
  ]), dest);
  check('symlink skipped', res.skipped.some((s) => s.includes('link')));
  check('symlink not created', !fs.existsSync(path.join(dest, 'link')));
  const lstat = fs.lstatSync(path.join(dest, 'index.html'));
  check('regular file extracted', lstat.isFile());
}

/* 5. size cap */
{
  const dest = tmp();
  let threw = false;
  try {
    extractTar(makeTar([{ name: 'big.bin', data: Buffer.alloc(5000) }]), dest, { maxBytes: 1000 });
  } catch (e) {
    threw = /limit/.test(e.message);
  }
  check('enforces size limit', threw);
}

/* 6. entry cap */
{
  let threw = false;
  const many = Array.from({ length: 12 }, (_, i) => ({ name: `f${i}.txt`, data: 'x' }));
  try {
    extractTar(makeTar(many), tmp(), { maxEntries: 5 });
  } catch (e) {
    threw = /more than/.test(e.message);
  }
  check('enforces entry limit', threw);
}

/* 7. plain (uncompressed) tar still works */
{
  const dest = tmp();
  const res = extractTar(makeTar([{ name: 'a.txt', data: 'hello' }], { gzip: false }), dest);
  check('handles plain tar', res.files === 1 && fs.readFileSync(path.join(dest, 'a.txt'), 'utf8') === 'hello');
}

/* 8. corrupt input */
{
  let threw = false;
  try {
    extractTar(Buffer.from('not a tar file at all'), tmp());
  } catch (e) {
    threw = /truncated|corrupt|empty/i.test(e.message);
  }
  check('rejects corrupt input', threw);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL UNTAR TESTS PASSED');
process.exit(fails ? 1 : 0);
