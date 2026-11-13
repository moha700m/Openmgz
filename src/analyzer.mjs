/**
 * Project analyzer.
 *
 * It looks at what is actually in the archive and decides a build strategy.
 * It never assumes every project should become SwiftUI: web apps get a
 * WKWebView wrapper, Flutter stays Flutter, React Native needs its ios/
 * project, and anything it cannot build reliably is reported as unsupported
 * with the exact reason instead of being faked.
 */
import fs from 'node:fs';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'Pods', 'build', 'dist', '.next', '.expo', 'vendor',
  '.dart_tool', 'DerivedData', '.gradle', '.idea', '.vscode', 'coverage', 'out',
]);

function walk(dir, base = dir, out = [], depth = 0) {
  if (depth > 12 || out.length > 8000) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.well-known') continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      out.push({ rel: `${rel}/`, dir: true, size: 0 });
      walk(abs, base, out, depth + 1);
    } else if (entry.isFile()) {
      let size = 0;
      try { size = fs.statSync(abs).size; } catch { /* ignore */ }
      out.push({ rel, dir: false, size });
    }
  }
  return out;
}

const readText = (file, limit = 200_000) => {
  try {
    const stat = fs.statSync(file);
    if (stat.size > limit) return '';
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};

const readJson = (file) => {
  try {
    return JSON.parse(readText(file, 1_000_000));
  } catch {
    return null;
  }
};

const exists = (dir, rel) => fs.existsSync(path.join(dir, rel));

function packageManager(dir, files) {
  if (exists(dir, 'pnpm-lock.yaml')) return 'pnpm';
  if (exists(dir, 'yarn.lock')) return 'yarn';
  if (exists(dir, 'bun.lockb') || exists(dir, 'bun.lock')) return 'bun';
  if (exists(dir, 'package-lock.json')) return 'npm';
  return files.some((f) => f.rel === 'package.json') ? 'npm' : null;
}

function detectBuild(dir, pkg, files) {
  const scripts = pkg?.scripts || {};
  const candidates = ['dist', 'build', 'out', 'public/build'];
  for (const c of candidates) {
    if (exists(dir, c) && files.some((f) => f.rel.startsWith(`${c}/`))) return { outputDir: c, built: true };
  }
  if (scripts.build) return { outputDir: exists(dir, 'out') ? 'out' : exists(dir, 'dist') ? 'dist' : 'dist', built: false };
  return { outputDir: null, built: false };
}

function detectScreens(dir, files, type) {
  const names = [];
  const push = (n) => {
    const clean = n.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    if (clean && !names.includes(clean) && names.length < 24) names.push(clean);
  };

  if (type === 'swiftui' || type === 'ios-native' || type === 'swiftpm') {
    for (const f of files.filter((x) => x.rel.endsWith('.swift')).slice(0, 120)) {
      const text = readText(path.join(dir, f.rel), 120_000);
      const re = /struct\s+([A-Za-z0-9_]+)\s*:\s*(?:SwiftUI\.)?View/g;
      let m;
      while ((m = re.exec(text))) push(m[1]);
    }
  } else if (type === 'flutter') {
    for (const f of files.filter((x) => x.rel.endsWith('.dart') && x.rel.startsWith('lib/')).slice(0, 120)) {
      const text = readText(path.join(dir, f.rel), 120_000);
      const re = /class\s+([A-Za-z0-9_]+)\s+extends\s+(?:StatefulWidget|StatelessWidget)/g;
      let m;
      while ((m = re.exec(text))) push(m[1]);
    }
  } else {
    const pageDirs = ['pages/', 'app/', 'src/pages/', 'src/screens/', 'src/views/', 'views/', 'screens/'];
    for (const f of files) {
      if (!pageDirs.some((d) => f.rel.startsWith(d))) continue;
      if (/\.(jsx?|tsx?|vue|svelte|html)$/.test(f.rel)) {
        const base = f.rel.split('/').pop().replace(/\.(jsx?|tsx?|vue|svelte|html)$/, '');
        if (!['index', '_app', '_document', 'layout', 'page'].includes(base)) push(base);
      }
    }
    for (const f of files) {
      if (/^(src\/)?App\.(jsx?|tsx?|vue|svelte)$/.test(f.rel)) push('App');
    }
  }
  return names;
}

function topExtensions(files) {
  const map = new Map();
  for (const f of files) {
    if (f.dir) continue;
    const ext = path.extname(f.rel).slice(1).toLowerCase() || 'none';
    map.set(ext, (map.get(ext) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ext, count]) => ({ ext, count }));
}

/**
 * @param {string} dir extracted project root
 * @returns analysis object
 */
export function analyzeProject(dir) {
  const files = walk(dir);
  const fileSet = new Set(files.map((f) => f.rel));
  const evidence = [];
  const warnings = [];
  const stack = [];

  const stat = {
    files: files.filter((f) => !f.dir).length,
    bytes: files.reduce((n, f) => n + f.size, 0),
    topExtensions: topExtensions(files),
  };

  const pkg = fileSet.has('package.json') ? readJson(path.join(dir, 'package.json')) : null;
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const has = (name) => Boolean(deps[name]);
  const pm = packageManager(dir, files);

  const xcodeproj = files.find((f) => f.rel.endsWith('.xcodeproj/'));
  const xcworkspace = files.find((f) => f.rel.endsWith('.xcworkspace/'));
  const podfile = fileSet.has('Podfile') || files.some((f) => /(^|\/)ios\/Podfile$/.test(f.rel));
  const flutterPub = fileSet.has('pubspec.yaml') && /flutter\s*:/m.test(readText(path.join(dir, 'pubspec.yaml')));

  let type = 'unknown';
  let strategy = 'unsupported';
  let supported = false;
  let confidence = 0.3;
  let reason = '';
  let xcodeProject = null;
  let scheme = null;
  let buildCommand = null;
  let installCommand = null;
  let outputDir = null;
  let entry = null;
  let requiresPods = false;

  const isReactNative = Boolean(pkg && (has('react-native') || has('expo')));
  const isCapacitor = Boolean(pkg && (has('@capacitor/core') || files.some((f) => /^capacitor\.config\./.test(f.rel))));

  // Flutter / React Native / Capacitor projects also contain an .xcodeproj —
  // they must be claimed before the generic "native Xcode project" branch.
  if ((xcodeproj || xcworkspace) && !flutterPub && !isReactNative && !isCapacitor) {
    type = xcodeproj ? 'ios-native' : 'ios-workspace';
    stack.push('Xcode');
    const projPath = (xcodeproj || xcworkspace).rel.replace(/\/$/, '');
    xcodeProject = projPath;
    const projName = projPath.split('/').pop().replace(/\.(xcodeproj|xcworkspace)$/, '');
    scheme = projName;
    const schemeFile = files.find((f) => /xcshareddata\/xcschemes\/.+\.xcscheme$/.test(f.rel));
    if (schemeFile) scheme = schemeFile.rel.split('/').pop().replace(/\.xcscheme$/, '');
    strategy = 'xcode-build';
    supported = true;
    confidence = 0.95;
    requiresPods = podfile;
    reason = 'Existing Xcode project — it will be built as-is, without rewriting the app.';
    evidence.push({ file: projPath, note: `Xcode ${xcodeproj ? 'project' : 'workspace'} found` });
    if (podfile) evidence.push({ file: 'Podfile', note: 'CocoaPods dependencies present' });
  } else if (fileSet.has('Package.swift')) {
    type = 'swiftpm';
    stack.push('Swift Package Manager');
    strategy = 'unsupported';
    reason = 'Swift Package only: there is no .xcodeproj to archive. Add an Xcode app target (or an ios/ project) and upload again.';
    confidence = 0.6;
    evidence.push({ file: 'Package.swift', note: 'SwiftPM manifest, no app target' });
  } else if (flutterPub) {
    type = 'flutter';
    stack.push('Flutter', 'Dart');
    strategy = 'flutter-build';
    supported = true;
    confidence = 0.95;
    reason = 'Flutter project — built with the Flutter SDK, unchanged.';
    buildCommand = 'flutter build ios --release --no-codesign';
    installCommand = 'flutter pub get';
    evidence.push({ file: 'pubspec.yaml', note: 'Flutter dependency declared' });
    if (!fileSet.has('ios/Runner.xcodeproj/project.pbxproj')) {
      warnings.push('No ios/ folder committed. The CI job runs `flutter create --platforms=ios .` first.');
    }
  } else if (isReactNative) {
    type = 'react-native';
    stack.push(has('expo') ? 'Expo' : 'React Native');
    const hasIos = files.some((f) => f.rel.startsWith('ios/'));
    if (hasIos) {
      strategy = 'rn-build';
      supported = true;
      confidence = 0.8;
      requiresPods = true;
      reason = 'React Native project with an ios/ folder — built with CocoaPods + Xcode.';
      installCommand = `${pm || 'npm'} ci`;
      evidence.push({ file: 'ios/', note: 'iOS native project present' });
    } else {
      strategy = 'unsupported';
      reason = has('expo')
        ? 'Expo project without an ios/ folder. Run `npx expo prebuild --platform ios` locally, commit the generated ios/ folder, then upload again.'
        : 'React Native project without an ios/ folder. Run `npx react-native init` output or add the ios/ project, then upload again.';
      confidence = 0.85;
      evidence.push({ file: 'package.json', note: `${has('expo') ? 'Expo' : 'React Native'} dependency, no ios/ directory` });
    }
  } else if (isCapacitor) {
    type = 'capacitor';
    stack.push('Capacitor');
    const hasIos = files.some((f) => f.rel.startsWith('ios/'));
    strategy = hasIos ? 'capacitor-build' : 'capacitor-add';
    supported = true;
    confidence = 0.8;
    requiresPods = hasIos;
    reason = hasIos
      ? 'Capacitor project with an ios/ platform — built with CocoaPods + Xcode.'
      : 'Capacitor project without ios/ — the CI job runs `npx cap add ios` before building.';
    installCommand = `${pm || 'npm'} ci`;
    evidence.push({ file: 'package.json', note: 'Capacitor runtime detected' });
    if (!hasIos) warnings.push('`npx cap add ios` runs in CI; the build fails if the web build step is missing.');
  } else if (pkg && has('next')) {
    type = 'nextjs';
    stack.push('Next.js');
    const cfgFile = files.find((f) => /^next\.config\.(js|mjs|ts)$/.test(f.rel));
    const cfg = cfgFile ? readText(path.join(dir, cfgFile.rel), 50_000) : '';
    const staticExport = /output\s*:\s*['"]export['"]/.test(cfg);
    if (staticExport) {
      strategy = 'web-wrapper';
      supported = true;
      confidence = 0.8;
      buildCommand = `${pm || 'npm'} run build`;
      installCommand = `${pm || 'npm'} ci`;
      outputDir = 'out';
      reason = 'Next.js with `output: "export"` — the static export is bundled into a native shell.';
      evidence.push({ file: cfgFile.rel, note: 'Static export configured' });
    } else {
      strategy = 'unsupported';
      reason = 'Next.js is server-rendered. A WKWebView app cannot run a Node server. Set `output: "export"` in next.config (and remove server-only features), then upload again.';
      confidence = 0.9;
      evidence.push({ file: cfgFile?.rel || 'package.json', note: 'Next.js without static export' });
    }
  } else if (pkg && (has('vite') || has('react') || has('vue') || has('svelte') || has('@ionic/react'))) {
    type = pkg && has('@ionic/react') ? 'ionic' : 'web-spa';
    stack.push(has('react') ? 'React' : has('vue') ? 'Vue' : has('svelte') ? 'Svelte' : 'JavaScript');
    const build = detectBuild(dir, pkg, files);
    buildCommand = pkg?.scripts?.build ? `${pm || 'npm'} run build` : null;
    installCommand = `${pm || 'npm'} ci`;
    if (pkg?.scripts?.build) {
      strategy = 'web-wrapper';
      supported = true;
      confidence = 0.85;
      outputDir = build.outputDir || 'dist';
      reason = 'Single-page web app — the build output is bundled into a native WKWebView shell, keeping the original UI and logic.';
      evidence.push({ file: 'package.json', note: 'Frontend toolchain with a build script' });
    } else {
      strategy = 'unsupported';
      reason = 'package.json has no build script, so there is no static output to bundle into the app.';
      confidence = 0.7;
      evidence.push({ file: 'package.json', note: 'No build script' });
    }
  } else if (files.some((f) => f.rel === 'index.html' || /^[^/]+\/index\.html$/.test(f.rel))) {
    type = 'static-web';
    stack.push('Static HTML');
    strategy = 'web-wrapper';
    supported = true;
    confidence = 0.7;
    const rootIndex = fileSet.has('index.html') ? '' : files.find((f) => /^[^/]+\/index\.html$/.test(f.rel)).rel.replace(/index\.html$/, '');
    entry = rootIndex;
    reason = 'Static site — copied into a native WKWebView shell as-is.';
    evidence.push({ file: `${rootIndex}index.html`, note: 'Static entry point' });
  } else if (pkg) {
    type = 'node-app';
    stack.push('Node.js');
    strategy = 'unsupported';
    reason = 'Node service/CLI project with no iOS project and no static frontend. It cannot run inside an iOS app; deploy it as a backend and upload the client instead.';
    confidence = 0.7;
    evidence.push({ file: 'package.json', note: 'Node project without a mobile client' });
  } else {
    strategy = 'unsupported';
    reason = 'No Xcode project, Flutter app, React Native client, or web entry point was found. Nothing to build.';
    confidence = 0.6;
  }

  // Entry point for wrappers: prefer a built index.html if it already exists.
  if (strategy === 'web-wrapper' && !entry) {
    const html = files.find((f) => f.rel === 'index.html') || files.find((f) => f.rel.endsWith('/index.html'));
    entry = html ? html.rel.replace(/index\.html$/, '') : outputDir || '';
  }

  const screens = detectScreens(dir, files, type);

  return {
    projectType: type,
    strategy,
    supported,
    confidence,
    reason,
    evidence,
    warnings,
    stack,
    screens,
    stats: stat,
    fileCount: stat.files,
    bundleHints: {
      xcodeProject,
      scheme,
      requiresPods,
      podfile,
      packageManager: pm,
      buildCommand,
      installCommand,
      outputDir,
      entry,
      requiresNode: Boolean(pkg),
      nodeVersion: pkg?.engines?.node || null,
    },
    analyzedAt: new Date().toISOString(),
  };
}

/** Cheap re-check used after the user edits settings. */
export function publicAnalysis(a) {
  if (!a) return null;
  return {
    projectType: a.projectType,
    strategy: a.strategy,
    supported: a.supported,
    confidence: a.confidence,
    reason: a.reason,
    evidence: a.evidence,
    warnings: a.warnings,
    stack: a.stack,
    screens: a.screens,
    stats: a.stats,
    bundleHints: a.bundleHints,
    analyzedAt: a.analyzedAt,
  };
}
