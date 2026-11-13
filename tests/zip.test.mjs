import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractZip, extractArchive } from '../src/untar.mjs';
import { makeZip } from './zipfixtures.mjs';
import { makeTar } from './tarfixtures.mjs';

let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  — ' + e : ''}`); if (!c) fails++; };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'omgz-zip-'));

{
  const dest = tmp();
  const zip = makeZip([
    { name: 'demo/', data: '' },
    { name: 'demo/index.html', data: '<h1>zip app</h1>' },
    { name: 'demo/assets/app.js', data: 'console.log(1)' },
    { name: '__MACOSX/demo/._index.html', data: 'junk' },
    { name: 'demo/.DS_Store', data: 'junk' },
  ]);
  const res = extractZip(zip, dest);
  check('zip extracts files', res.files === 2, `files=${res.files}`);
  check('zip strips wrapper dir', fs.existsSync(path.join(dest, 'index.html')));
  check('zip keeps nested path', fs.existsSync(path.join(dest, 'assets/app.js')));
  check('__MACOSX ignored', !fs.existsSync(path.join(dest, '__MACOSX')));
  check('.DS_Store ignored', !fs.existsSync(path.join(dest, '.DS_Store')));
}

{
  let threw = false;
  try { extractZip(makeZip([{ name: '../evil.txt', data: 'x' }]), tmp()); } catch (e) { threw = /traversal/.test(e.message); }
  check('zip rejects ../ traversal', threw);
}

{
  let threw = false;
  try { extractZip(makeZip([{ name: '/etc/passwd', data: 'x' }]), tmp()); } catch (e) { threw = /absolute/.test(e.message); }
  check('zip rejects absolute paths', threw);
}

{
  let threw = false;
  try { extractZip(makeZip([{ name: 'big.bin', data: 'x'.repeat(4000) }]), tmp(), { maxBytes: 1000 }); } catch (e) { threw = /limit/.test(e.message); }
  check('zip enforces size limit', threw);
}

{
  const dest = tmp();
  const res = extractArchive(makeZip([{ name: 'a.txt', data: 'hello' }]), dest);
  check('extractArchive detects zip', res.files === 1 && fs.readFileSync(path.join(dest, 'a.txt'), 'utf8') === 'hello');
}

{
  const dest = tmp();
  const res = extractArchive(makeTar([{ name: 'b.txt', data: 'tar' }]), dest);
  check('extractArchive detects tar.gz', res.files === 1 && fs.readFileSync(path.join(dest, 'b.txt'), 'utf8') === 'tar');
}

console.log(fails ? `\n${fails} FAILED` : '\nALL ZIP TESTS PASSED');
process.exit(fails ? 1 : 0);
