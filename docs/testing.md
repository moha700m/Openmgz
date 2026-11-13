# Test results

Everything below was executed against the real repository `moha700m/Openmgz`
and real GitHub-hosted macOS runners. No results are simulated.

## 1. Local suite

```bash
node tests/run.mjs
```

| Suite | Checks | Result |
|---|---|---|
| `tests/untar.test.mjs` — archive safety | 14 | ✅ all passed |
| `tests/analyzer.test.mjs` — project detection | 23 | ✅ all passed |
| `tests/generator.test.mjs` — iOS shell generation | 18 | ✅ all passed |
| `tests/server.test.mjs` — HTTP lifecycle | 16 | ✅ all passed |

Covered cases include: `../` traversal, absolute paths, symlink entries, size caps, entry caps,
corrupt headers, wrapper-directory stripping, plain `.tar`, 10 project types, invalid bundle IDs,
static asset bundling, generation refusal for native projects, upload → analyze → preview →
generate → delete.

The same suite runs on every push in `.github/workflows/ci.yml` (ubuntu-latest, 12–15 s).

## 2. End-to-end builds (real macOS runners)

| # | Sample | Strategy | Run | Conclusion | Job time | Artifact |
|---|---|---|---|---|---|---|
| 1 | `samples/web-demo` | `web-wrapper` | [43437154494](https://github.com/moha700m/Openmgz/actions/runs/43437154494) | ❌ failed (path bug) | 26 s | — |
| 2 | `samples/web-demo` | `web-wrapper` | [43437321540](https://github.com/moha700m/Openmgz/actions/runs/43437321540) | ❌ failed (scheme bug) | 34 s | — |
| 3 | `samples/web-demo` | `web-wrapper` | [43437570993](https://github.com/moha700m/Openmgz/actions/runs/43437570993) | ✅ success | 1 m 4 s | `ipa-bld_vXjOZnLVoXM` |
| 4 | `samples/swiftui-hello` | `xcode-build` | [43437951819](https://github.com/moha700m/Openmgz/actions/runs/43437951819) | ✅ success | 45 s | `ipa-bld_F0DZc12AgJ0` |

### Artifact verification

Both IPAs were downloaded back through the platform (`src/builds.mjs` → Actions artifact API →
ZIP reader → `data/builds/<id>/app.ipa`) and inspected.

**Web wrapper** — 131,354 bytes:

```
Payload/OpenmgzApp.app/OpenmgzApp          139,496   Mach-O 64-bit arm64 (cffaedfe)
Payload/OpenmgzApp.app/Info.plist            1,283   bplist00
Payload/OpenmgzApp.app/Assets.car          164,415
Payload/OpenmgzApp.app/AppIcon60x60@2x.png   4,343
Payload/OpenmgzApp.app/www/index.html        1,018   ← the uploaded web app
Payload/OpenmgzApp.app/www/styles.css        2,336
Payload/OpenmgzApp.app/www/app.js            1,510
_CodeSignature: absent   embedded.mobileprovision: absent   → unsigned, as designed
```

**Native SwiftUI** — 18,049 bytes:

```
Payload/HelloOpenmgz.app/HelloOpenmgz      104,256   Mach-O 64-bit arm64
Payload/HelloOpenmgz.app/Info.plist            864
_Payload/HelloOpenmgz.app/PkgInfo                8
_CodeSignature: absent   embedded.mobileprovision: absent   → unsigned, as designed
```

## 3. HTTP lifecycle (live server)

```
PASS  serves the SPA
PASS  upload over HTTP        — web-wrapper
PASS  patch settings
PASS  build accepted over HTTP — bld__TH5RhXk5bk
```

## 4. Bugs found and fixed during the real runs

| Bug | Symptom | Fix |
|---|---|---|
| Duplicated path segment | files pushed to `builds/<id>/ios/ios/...`, `xcodegen` found no spec | push under `builds/<id>/`, set `project_path=builds/<id>/ios` |
| Wrong scheme | `xcodebuild` reported scheme `project` | exclude `*.xcodeproj/*.xcworkspace`, validate scheme against `xcodebuild -list -json` |
| Missing UIKit import | would break `UIApplication`/`UIAlertController` on some toolchains | explicit `import UIKit` in the generated shell |

## 5. What was **not** executed

- Flutter, React Native, Capacitor and Next.js strategies: implemented but not built end-to-end
  here (no such sample in the repository and each needs extra runner minutes). Their detection is
  unit-tested; their CI branches follow the same shape as the tested ones.
- Signing with ESign: cannot be automated from CI, documented in `docs/esign.md`.
- Installation on a physical iPhone.

## Reproduce

```bash
export GITHUB_TOKEN=<token with repo+workflow>
node scripts/smoke-build.mjs start samples/web-demo
node scripts/smoke-build.mjs poll <buildId> 600000
```
