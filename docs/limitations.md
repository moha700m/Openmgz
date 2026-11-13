# What converts, what does not, and why

Openmgz never fabricates a working app. When a project cannot be built reliably, the analyzer says
so, names the reason, and the build button stays disabled.

## Conversion matrix

| Project | Detected by | Strategy | Result |
|---|---|---|---|
| Swift / SwiftUI / UIKit (`.xcodeproj`) | Xcode project + schemes | `xcode-build` | Built as-is; no rewriting |
| XcodeGen project (`project.yml`) | spec + Swift sources | `xcode-build` | `xcodegen generate` in CI, then archive |
| Swift Package only (`Package.swift`) | no `.xcodeproj` | unsupported | Needs an app target |
| Flutter (`pubspec.yaml`) | Flutter dependency | `flutter-build` | `flutter build ios --no-codesign` |
| React Native / Expo **with `ios/`** | `package.json` deps | `rn-build` | Pods + Xcode workspace |
| Expo **without `ios/`** | deps only | unsupported | Run `npx expo prebuild --platform ios`, commit `ios/` |
| Capacitor with `ios/` | `@capacitor/core` | `capacitor-build` | Pods + workspace |
| Capacitor without `ios/` | `@capacitor/core` | `capacitor-add` | `npx cap add ios` in CI |
| Next.js with `output: "export"` | `next.config.*` | `web-wrapper` | Static export bundled in WKWebView |
| Next.js SSR/ISR | no static export | unsupported | A WKWebView cannot run a Node server |
| Vite / React / Vue / Svelte SPA | build script | `web-wrapper` | Build output bundled in WKWebView |
| Static HTML | `index.html` | `web-wrapper` | Copied in directly |
| Node service / CLI | `package.json` only | unsupported | No client to wrap |

## Known limitations

1. **Unsigned IPA only.** Signing is done on-device (see `esign.md`). No Apple credentials are
   stored or required.
2. **Artifacts expire.** GitHub keeps artifacts for 7 days (`retention-days`). Download the IPA
   before then; the server keeps its own copy in `data/builds/<id>/app.ipa`.
3. **macOS minutes.** Public repositories use free standard runners. Private repositories consume
   the account's Actions minutes (macOS counts ×10). The platform cannot change that.
4. **Push size.** Projects are pushed through the Git Data API with a 700-file / 90 MB cap and a
   6 MB per-file cap. Larger projects need a manual push.
5. **Public repository guard.** If `GITHUB_REPO` is public, builds are refused unless the project
   opts in, because the source would become public.
6. **Web wrapper fidelity.** The generated shell is a WKWebView with file access, safe areas,
   external-link handling and JS dialogs. Features that require native APIs (camera, Bluetooth,
   push) need a Capacitor or React Native project — the wrapper does not fake them.
7. **Preview is best-effort.** The phone preview serves the built output when it exists in the
   archive, otherwise the raw source. Projects that need a dev server (unbuilt Vite/Next) will show
   a blank or unstyled preview until built.
8. **One build at a time per project** is not enforced by the server; GitHub's `concurrency` group
   serializes builds with the same `build_id`, so parallel builds are separate jobs.
9. **No device provisioning.** The platform cannot register UDIDs or create profiles.
