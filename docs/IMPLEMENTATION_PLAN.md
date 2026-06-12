# TerminallySKILL Implementation Plan

This plan turns the June 2026 app review into an execution backlog. The ordering is deliberate: reduce shipped risk first, then improve confidence and product activation.

## Phase 0: Release And Security Baseline

- [x] Upgrade Electron from the current v33 line to a supported stable line.
- [x] Upgrade vulnerable runtime dependencies, starting with `ws`.
- [x] Re-run `npm audit --omit=dev --audit-level=moderate` and make it a required release gate after the upgrade lands.
- [x] Add Electron navigation hardening:
  - restrictive renderer CSP,
  - safe external URL allowlist,
  - blocked unexpected renderer navigation,
  - explicit review of `sandbox: false` and Linux `--no-sandbox`.
- [ ] Align app version, GitHub release state, update feeds, and README download guidance.

## Phase 1: Automated Test Coverage

- Keep `npm run test:ci` green on every PR: runtime baseline, localization check, unit/integration tests, and production build.
- Keep `npm run test:audit:runtime` green as a networked CI security gate.
- [x] Add initial Electron E2E smoke tests with Playwright.
- Add fixture-backed remote tests:
  - [x] fake `ssh` binary for deterministic UI and IPC flows,
  - [x] Docker OpenSSH service for real SSH handshake coverage,
  - optional Docker VNC service for tunnel/noVNC coverage.
- Add packaged-app smoke checks:
  - [x] macOS arm64 launch/version/settings/PTY smoke via `npm run test:package:mac:arm64`,
  - [ ] macOS x64 artifact smoke on an x64/Rosetta-capable runner,
  - [ ] Linux AppImage/deb launch smoke on Linux CI,
  - [ ] Windows installer/unpacked launch smoke on Windows CI.

## Phase 2: Command Activation

- Make first-run command discovery more guided.
- Batch-enrich discovered commands from `--help` output.
- Add starter-pack command profiles for common project types.
- Show clearer states for missing, installed, discovered, and enriched commands.

## Phase 3: Workflow Confidence

- Add dry-run previews for scripts and workflows.
- Add resume-from-failed-step and rerun-failed-step actions.
- Add environment and working-directory diff summaries before a run starts.
- Add richer failure summaries in run detail views.

## Phase 4: Observability And Data Safety

- Add log retention controls and per-project retention defaults.
- Redact likely secrets before sending terminal output to AI review.
- Add exportable run reports for support and team handoff.
- Surface whether API keys are protected by OS encryption or fallback storage.

## Phase 5: Polish And Scale

- Code-split heavy renderer surfaces: terminal, VNC, logs, settings, and syntax highlighting.
- Finish human translation review for long-form namespaces.
- Add RTL layout QA before promoting Arabic beyond watch tier.
- Expand README and website claims only after release artifacts and translation coverage match.
