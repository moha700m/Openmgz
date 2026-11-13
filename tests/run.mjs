import { spawnSync } from 'node:child_process';

const files = ['tests/untar.test.mjs', 'tests/zip.test.mjs', 'tests/analyzer.test.mjs', 'tests/generator.test.mjs', 'tests/server.test.mjs'];
let failed = 0;

for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const res = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (res.status !== 0) failed++;
}

console.log(`\n${failed ? `${failed} suite(s) failed` : 'ALL SUITES PASSED'}`);
process.exit(failed ? 1 : 0);
