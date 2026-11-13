/**
 * iOS project generator.
 *
 * For web-based projects it produces a real SwiftUI + WKWebView app that
 * ships the web bundle inside the .app (no remote URL, works offline).
 * For native/Flutter/RN projects nothing is generated: the existing Xcode
 * project is built as-is.
 */
import fs from 'node:fs';
import path from 'node:path';
import { makeIcon } from './png.mjs';

const APP_DIR = 'ios';

export function sanitizeSettings(input = {}, analysis = {}) {
  const name = String(input.appName || '').trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').slice(0, 40) || 'My App';
  let bundleId = String(input.bundleId || '').trim().replace(/[^a-zA-Z0-9.\-]/g, '');
  if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z0-9\-]+)+$/.test(bundleId)) {
    bundleId = `com.openmgz.${(name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'app').slice(0, 24)}`;
  }
  const version = /^\d+(\.\d+){0,2}$/.test(String(input.version || '')) ? String(input.version) : '1.0';
  const scheme = String(input.scheme || analysis?.bundleHints?.scheme || '').trim() || null;
  const outputDir = String(input.outputDir || analysis?.bundleHints?.outputDir || '').trim() || null;
  const buildCommand = String(input.buildCommand || analysis?.bundleHints?.buildCommand || '').trim() || null;
  const installCommand = String(input.installCommand || analysis?.bundleHints?.installCommand || '').trim() || null;

  return { appName: name, bundleId, version, scheme, outputDir, buildCommand, installCommand };
}

const SWIFT_APP = `import SwiftUI

@main
struct OpenmgzApp: App {
    var body: some Scene {
        WindowGroup {
            WebShellView()
                .ignoresSafeArea(.container, edges: .bottom)
        }
    }
}
`;

const SWIFT_VIEW = `import SwiftUI
import WebKit

/// Native shell that hosts the bundled web build. Everything ships inside the
/// .app bundle, so the app works offline and needs no server.
struct WebShellView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = false
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground

        context.coordinator.webView = webView
        context.coordinator.load()
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        weak var webView: WKWebView?

        func load() {
            guard let webView else { return }
            guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") else {
                let html = """
                <html><body style="font-family:-apple-system;padding:40px;text-align:center">
                <h2>Web bundle missing</h2>
                <p>The build finished but no www/index.html was bundled.</p>
                </body></html>
                """
                webView.loadHTMLString(html, baseURL: nil)
                return
            }
            let root = index.deletingLastPathComponent()
            webView.loadFileURL(index, allowingReadAccessTo: root)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {}

        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = action.request.url else { return decisionHandler(.allow) }
            if url.isFileURL || url.scheme == "about" { return decisionHandler(.allow) }
            if action.navigationType == .linkActivated {
                UIApplication.shared.open(url)
                return decisionHandler(.cancel)
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            present(title: "Alert", message: message, completionHandler: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: "Confirm", message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            topController()?.present(alert, animated: true)
        }

        private func present(title: String, message: String, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            topController()?.present(alert, animated: true)
        }

        private func topController() -> UIViewController? {
            let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
            var top = scene?.windows.first { $0.isKeyWindow }?.rootViewController
            while let presented = top?.presentedViewController { top = presented }
            return top
        }
    }
}
`;

function projectYml({ appName, bundleId, version }) {
  return `name: OpenmgzApp
options:
  bundleIdPrefix: ${bundleId.split('.').slice(0, 2).join('.') || 'com.openmgz'}
  deploymentTarget:
    iOS: "15.0"
  createIntermediateGroups: true
  groupSortPosition: top

settings:
  base:
    SWIFT_VERSION: "5.9"
    MARKETING_VERSION: "${version}"
    CURRENT_PROJECT_VERSION: "1"
    ENABLE_USER_SCRIPT_SANDBOXING: NO

targets:
  OpenmgzApp:
    type: application
    platform: iOS
    deploymentTarget: "15.0"
    sources:
      - path: App
        excludes:
          - "www"
      - path: App/www
        type: folder
        buildPhase: resources
    settings:
      base:
        PRODUCT_BUNDLE_IDENTIFIER: ${bundleId}
        PRODUCT_NAME: OpenmgzApp
        TARGETED_DEVICE_FAMILY: "1,2"
        ASSETCATALOG_COMPILER_APPICON_NAME: AppIcon
        INFOPLIST_KEY_CFBundleDisplayName: "${appName.replace(/"/g, '')}"
        CODE_SIGN_STYLE: Manual
        DEVELOPMENT_TEAM: ""
    info:
      path: App/Info.plist
      properties:
        CFBundleDisplayName: "${appName.replace(/"/g, '')}"
        CFBundleShortVersionString: "${version}"
        UILaunchScreen: {}
        UIApplicationSupportsIndirectInputEvents: true
        UISupportedInterfaceOrientations:
          - UIInterfaceOrientationPortrait
          - UIInterfaceOrientationLandscapeLeft
          - UIInterfaceOrientationLandscapeRight
        NSAppTransportSecurity:
          NSAllowsArbitraryLoadsInWebContent: true
`;
}

const PLACEHOLDER = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>Openmgz</title>
    <style>
      html,body{margin:0;height:100%;background:#0b0b12;color:#eee;font:16px -apple-system,system-ui,sans-serif;display:grid;place-items:center;text-align:center}
      .box{padding:32px;max-width:340px}
      h1{font-size:20px;margin:0 0 8px}
      p{color:#9aa0b5;font-size:14px;line-height:1.6;margin:0}
    </style>
  </head>
  <body>
    <div class="box">
      <h1>Build output not copied</h1>
      <p>This is the placeholder page. The CI job replaces <code>App/www</code> with your compiled web app.</p>
    </div>
  </body>
</html>
`;

function copyDir(src, dest, { skip = new Set() } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  let bytes = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const nested = copyDir(from, to, { skip });
      count += nested.count;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      fs.copyFileSync(from, to);
      count++;
      bytes += fs.statSync(from).size;
    }
  }
  return { count, bytes };
}

/**
 * @returns {{generated:boolean, dir:string|null, files:string[], notes:string[]}}
 */
export function generateIosProject({ srcDir, analysis, settings, outDir }) {
  const notes = [];
  const files = [];

  if (analysis.strategy !== 'web-wrapper') {
    return {
      generated: false,
      dir: null,
      files,
      notes: [`Strategy "${analysis.strategy}" builds the existing project as-is — no iOS shell generated.`],
    };
  }

  const root = path.join(outDir, APP_DIR);
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(path.join(root, 'App', 'www'), { recursive: true });
  fs.mkdirSync(path.join(root, 'App', 'Assets.xcassets', 'AppIcon.appiconset'), { recursive: true });

  fs.writeFileSync(path.join(root, 'project.yml'), projectYml(settings));
  fs.writeFileSync(path.join(root, 'App', 'OpenmgzApp.swift'), SWIFT_APP);
  fs.writeFileSync(path.join(root, 'App', 'WebShellView.swift'), SWIFT_VIEW);
  fs.writeFileSync(path.join(root, 'App', 'www', 'index.html'), PLACEHOLDER);
  fs.writeFileSync(path.join(root, 'App', 'Assets.xcassets', 'Contents.json'), '{\n  "info" : { "author" : "openmgz", "version" : 1 }\n}\n');
  fs.writeFileSync(
    path.join(root, 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'Contents.json'),
    JSON.stringify(
      {
        images: [{ filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
        info: { author: 'openmgz', version: 1 },
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(root, 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'icon-1024.png'), makeIcon(1024));
  notes.push('Generated SwiftUI + WKWebView shell with XcodeGen project.');

  // Static sites can be bundled right now; toolchain builds are copied by CI.
  if (analysis.projectType === 'static-web') {
    const entry = analysis.bundleHints.entry || '';
    const source = entry ? path.join(srcDir, entry) : srcDir;
    const result = copyDir(source, path.join(root, 'App', 'www'), {
      skip: new Set(['node_modules', '.git', 'ios', 'android']),
    });
    notes.push(`Bundled ${result.count} static files (${Math.round(result.bytes / 1024)} KB) into the app.`);
  } else {
    notes.push('CI will compile the web project and replace App/www with the build output.');
  }

  const rel = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) walk(abs);
      else rel.push(path.relative(outDir, abs).split(path.sep).join('/'));
    }
  };
  walk(root);

  return { generated: true, dir: root, files: rel, notes };
}

/** List every file under a directory as repo-relative paths. */
export function listFiles(dir, base = dir, out = [], depth = 0) {
  if (depth > 14) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(base, abs).split(path.sep).join('/');
    if (e.isDirectory()) listFiles(abs, base, out, depth + 1);
    else out.push(rel);
  }
  return out;
}
