import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { analyzeProject } from '../src/analyzer.mjs';

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
  if (!cond) fails++;
};

function fixture(tree) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omgz-proj-'));
  for (const [rel, content] of Object.entries(tree)) {
    const abs = path.join(dir, rel);
    if (rel.endsWith('/')) {
      fs.mkdirSync(abs, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return dir;
}

/* SwiftUI */
{
  const dir = fixture({
    'MyApp.xcodeproj/project.pbxproj': '// project',
    'MyApp.xcodeproj/xcshareddata/xcschemes/MyApp.xcscheme': '<Scheme/>',
    'MyApp/ContentView.swift': 'struct ContentView: View { var body: some View { Text("hi") } }',
    'MyApp/ProfileView.swift': 'struct ProfileView: View { var body: some View { Text("p") } }',
    'Podfile': 'platform :ios',
  });
  const a = analyzeProject(dir);
  check('swift → xcode-build', a.strategy === 'xcode-build', a.strategy);
  check('swift → scheme from shared scheme', a.bundleHints.scheme === 'MyApp', a.bundleHints.scheme);
  check('swift → pods detected', a.bundleHints.requiresPods === true);
  check('swift → screens found', a.screens.includes('ContentView') && a.screens.includes('ProfileView'), a.screens.join(','));
}

/* XcodeGen project */
{
  const dir = fixture({
    'project.yml': 'name: HelloOpenmgz\noptions:\n  bundleIdPrefix: com.openmgz\n',
    'Sources/ContentView.swift': 'struct ContentView: View { var body: some View { Text("hi") } }',
  });
  const a = analyzeProject(dir);
  check('xcodegen → xcode-build', a.strategy === 'xcode-build', a.strategy);
  check('xcodegen → scheme from spec', a.bundleHints.scheme === 'HelloOpenmgz', a.bundleHints.scheme);
  check('xcodegen → supported', a.supported === true);
}

/* Flutter */
{
  const dir = fixture({ 'pubspec.yaml': 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n', 'lib/main.dart': 'void main(){}' });
  const a = analyzeProject(dir);
  check('flutter → flutter-build', a.strategy === 'flutter-build', a.strategy);
  check('flutter → warns about missing ios/', a.warnings.length > 0);
}

/* Flutter that already has an ios/ folder must stay Flutter, not "native Xcode" */
{
  const dir = fixture({
    'pubspec.yaml': 'name: app\ndependencies:\n  flutter:\n    sdk: flutter\n',
    'ios/Runner.xcodeproj/project.pbxproj': '// pbx',
    'lib/main.dart': 'void main(){}',
  });
  const a = analyzeProject(dir);
  check('flutter + ios/ → flutter-build', a.strategy === 'flutter-build', a.strategy);
  check('flutter + ios/ → no ios warning', a.warnings.length === 0);
}

/* React Native with ios/ */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { 'react-native': '0.7.0' }, scripts: {} }),
    'ios/App.xcodeproj/project.pbxproj': '// pbx',
    'App.js': 'export default function App(){}',
  });
  const a = analyzeProject(dir);
  check('RN + ios → rn-build', a.strategy === 'rn-build', a.strategy);
}

/* Expo without ios/ */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { expo: '50.0.0' } }),
    'app/index.tsx': 'export default () => null',
  });
  const a = analyzeProject(dir);
  check('expo without ios → unsupported', a.strategy === 'unsupported' && !a.supported);
  check('expo reason mentions prebuild', /prebuild/.test(a.reason), a.reason.slice(0, 60));
}

/* Next without static export */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { next: '14.0.0', react: '18' }, scripts: { build: 'next build' } }),
    'next.config.mjs': 'export default {}',
    'pages/index.jsx': 'export default function Home(){}',
  });
  const a = analyzeProject(dir);
  check('next SSR → unsupported', a.strategy === 'unsupported', a.strategy);
  check('next reason explains export', /output: "export"/.test(a.reason));
}

/* Next with static export */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { next: '14.0.0', react: '18' }, scripts: { build: 'next build' } }),
    'next.config.mjs': "export default { output: 'export' }",
    'app/page.tsx': 'export default function Page(){}',
  });
  const a = analyzeProject(dir);
  check('next static → web-wrapper', a.strategy === 'web-wrapper', a.strategy);
  check('next static → out dir', a.bundleHints.outputDir === 'out');
}

/* Vite React */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { react: '18', 'react-dom': '18' }, devDependencies: { vite: '5' }, scripts: { build: 'vite build' } }),
    'index.html': '<div id="root"></div>',
    'src/App.jsx': 'export default function App(){}',
    'src/pages/Dashboard.jsx': 'export default function Dashboard(){}',
  });
  const a = analyzeProject(dir);
  check('vite react → web-wrapper', a.strategy === 'web-wrapper');
  check('vite react → dist output', a.bundleHints.outputDir === 'dist', a.bundleHints.outputDir);
  check('vite react → npm detected', a.bundleHints.packageManager === 'npm');
  check('vite react → screens heuristic', a.screens.includes('Dashboard'), a.screens.join(','));
}

/* static site */
{
  const dir = fixture({ 'index.html': '<h1>site</h1>', 'about.html': '<h1>about</h1>' });
  const a = analyzeProject(dir);
  check('static site → web-wrapper', a.strategy === 'web-wrapper');
  check('static site → entry', a.bundleHints.entry === '');
}

/* node backend only */
{
  const dir = fixture({ 'package.json': JSON.stringify({ dependencies: { express: '4' }, scripts: { start: 'node .' } }), 'server.js': '' });
  const a = analyzeProject(dir);
  check('node service → unsupported', a.strategy === 'unsupported');
  check('node service reason is specific', /backend/i.test(a.reason), a.reason.slice(0, 50));
}

/* capacitor without ios */
{
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { '@capacitor/core': '6' }, scripts: { build: 'vite build' } }),
    'capacitor.config.ts': 'export default {}',
    'index.html': '<div id="app"></div>',
  });
  const a = analyzeProject(dir);
  check('capacitor → capacitor-add', a.strategy === 'capacitor-add', a.strategy);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL ANALYZER TESTS PASSED');
process.exit(fails ? 1 : 0);
