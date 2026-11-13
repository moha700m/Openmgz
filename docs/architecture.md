# Architecture

Openmgz is a **local control plane** with a **remote build worker** (GitHub Actions macOS runners).

```
iPhone / browser
      │  HTTPS (LAN or tunnel)
      ▼
┌──────────────────────────┐
│  Openmgz server (Node)   │   zero dependencies
│  ├─ HTTP API + SSE       │
│  ├─ archive extractor    │   pure JS tar reader, hard limits
│  ├─ analyzer             │   detects project type → strategy
│  ├─ generator            │   SwiftUI + WKWebView shell (XcodeGen)
│  ├─ GitHub client        │   Git Data API + Actions API
│  └─ build orchestrator   │   push → dispatch → poll → fetch IPA
└────────────┬─────────────┘
             │  REST (token stays server-side)
             ▼
   github.com/moha700m/Openmgz
             │  workflow_dispatch
             ▼
   GitHub Actions (macos-15)
   ├─ checkout build branch
   ├─ install toolchain per strategy
   ├─ xcodegen / pod install / flutter / npm
   ├─ xcodebuild CODE_SIGNING_ALLOWED=NO
   ├─ Payload/App.app → app.ipa
   └─ upload artifact  ──────────────►  server downloads it
                                            │
                                            ▼
                                      iPhone: ESign
```

## Modules

| File | Responsibility |
|---|---|
| `server.mjs` | HTTP server, routing, SSE, static + preview serving |
| `src/config.mjs` | env loading, limits, repo/workflow config |
| `src/store.mjs` | JSON persistence (projects, builds), atomic writes |
| `src/untar.mjs` | tar/tar.gz parser with traversal/symlink/size protection |
| `src/analyzer.mjs` | project type detection, strategy selection, evidence |
| `src/generator.mjs` | iOS shell generation, settings sanitization, icon |
| `src/png.mjs` | dependency-free PNG encoder for the app icon |
| `src/github.mjs` | GitHub REST client (blobs/trees/commits/refs/runs/artifacts) |
| `src/builds.mjs` | build state machine, polling, artifact extraction |
| `src/zip.mjs` | minimal ZIP reader for artifact + log archives |

## Build state machine

```
queued ──► in_progress ──► completed
   │            │
   └────────────┴────────► failed
```

* `queued` — workflow dispatched, run id not resolved yet (matched by `run-name: openmgz <build_id>`).
* `in_progress` — run found; steps mirrored from the Jobs API.
* `completed` — artifact `ipa-<build_id>` downloaded, inner `.ipa` extracted to `data/builds/<id>/app.ipa`.
* `failed` — logs ZIP downloaded and flattened into `build.log`.

## Why these choices

**Zero npm dependencies.** The whole control plane runs with `node server.mjs`. No supply-chain surface for a tool that handles archives and tokens.

**Pure-JS tar reader instead of shelling out.** `tar` flags differ across macOS/Linux/Windows, and a shelled-out extraction of an untrusted archive is much harder to bound. The parser rejects absolute paths, `..`, symlinks, hardlinks and devices, and enforces entry/size caps before writing anything.

**Generator only for web projects.** Native, Flutter, React Native and Capacitor projects already have a correct iOS project; rewriting them into SwiftUI would destroy functionality. The analyzer says so explicitly and the generator refuses.

**Workflow inputs, not commits, drive the build.** The workflow receives `strategy`, `project_path`, `scheme`, `build_command`, `output_dir`; the manifest is committed alongside for audit.

**Public-repo guard.** Building pushes the project source into `GITHUB_REPO`. If that repository is public, the API refuses unless the project opts in (`allowPublicPush`), because that would publish the user's code.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/state` | repo, token status, stats, recent builds |
| GET | `/api/repo` | live repository metadata (visibility, default branch) |
| GET/POST | `/api/projects` | list / upload (raw `application/gzip` body) |
| GET/PATCH/DELETE | `/api/projects/:id` | detail / settings / delete |
| POST | `/api/projects/:id/analyze` | re-run the analyzer |
| POST | `/api/projects/:id/generate` | generate the iOS project locally |
| GET | `/api/projects/:id/files` | source file list |
| POST | `/api/projects/:id/build` | push + dispatch a build |
| GET | `/api/builds` `/api/builds/:id` | history / detail |
| GET | `/api/builds/:id/logs` | stored log text |
| GET | `/api/builds/:id/ipa` | download the IPA |
| GET | `/preview/:id/*` | serve the web build for the in-app phone preview |
| GET | `/api/events` | SSE stream of build updates |

## Threat model

| Risk | Mitigation |
|---|---|
| Malicious archive (`../`, symlinks, zip-bomb) | validated entries, type whitelist, size/entry caps |
| Token leaking to the browser | token read from env only; never serialized into API responses |
| Publishing private source | public-repo guard + explicit opt-in per project |
| Command injection from project metadata | no shell interpolation of project values; workflow uses env vars and quoted inputs |
| SSRF via preview endpoint | preview resolves strictly inside the project's `src` directory |
