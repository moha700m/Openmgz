import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeProject } from '../src/analyzer.mjs';
import { generateIosProject, sanitizeSettings, listFiles } from '../src/generator.mjs';

let fails = 0;
const check = (n, c, e = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${e ? '  — ' + e : ''}`); if (!c) fails++; };

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'omgz-gen-'));
const write = (dir, rel, content) => {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
};

/* settings sanitization */
{
  const s = sanitizeSettings({ appName: 'My<>App', bundleId: 'not valid', version: '2.1' }, {});
  check('invalid bundle id is replaced', /^[a-z]+\.[a-z0-9.]+$/i.test(s.bundleId), s.bundleId);
  check('app name sanitized', !/[<>]/.test(s.appName), s.appName);
  check('valid version kept', s.version === '2.1');
}

/* web wrapper generation */
{
  const src = tmp();
  write(src, 'index.html', '<h1>Hi</h1><script src="a.js"></script>');
  write(src, 'a.js', 'console.log(1)');
  write(src, 'assets/logo.svg', '<svg></svg>');
  const analysis = analyzeProject(src);
  const out = tmp();
  const result = generateIosProject({
    srcDir: src,
    analysis,
    settings: sanitizeSettings({ appName: 'Demo App', bundleId: 'com.acme.demo', version: '1.2' }, analysis),
    outDir: out,
  });

  check('generator reports success', result.generated === true);
  const files = listFiles(out);
  check('project.yml written', files.includes('ios/project.yml'));
  check('App.swift written', files.includes('ios/App/OpenmgzApp.swift'));
  check('WebView file written', files.includes('ios/App/WebShellView.swift'));
  check('icon written', files.includes('ios/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png'));

  const yml = fs.readFileSync(path.join(out, 'ios/project.yml'), 'utf8');
  check('bundle id in project.yml', yml.includes('com.acme.demo'));
  check('display name in project.yml', yml.includes('Demo App'));
  check('www is a folder reference', /type: folder/.test(yml) && /App\/www/.test(yml));
  check('marketing version set', yml.includes('1.2'));

  const sw = fs.readFileSync(path.join(out, 'ios/App/WebShellView.swift'), 'utf8');
  check('swift loads bundled index', sw.includes('subdirectory: "www"') && sw.includes('loadFileURL'));
  check('swift handles external links', sw.includes('UIApplication.shared.open'));

  check('static files copied into www', fs.existsSync(path.join(out, 'ios/App/www/index.html')));
  check('assets copied', fs.existsSync(path.join(out, 'ios/App/www/assets/logo.svg')));
  check('icon is a png', fs.readFileSync(path.join(out, 'ios/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png')).slice(1, 4).toString() === 'PNG');
}

/* non-web strategy generates nothing */
{
  const src = tmp();
  write(src, 'MyApp.xcodeproj/project.pbxproj', '//');
  const analysis = analyzeProject(src);
  const out = tmp();
  const result = generateIosProject({ srcDir: src, analysis, settings: {}, outDir: out });
  check('native project: nothing generated', result.generated === false && result.notes.length > 0);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL GENERATOR TESTS PASSED');
process.exit(fails ? 1 : 0);
