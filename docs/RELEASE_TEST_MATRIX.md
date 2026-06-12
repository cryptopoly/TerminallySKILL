# Release Test Matrix

This matrix defines the minimum automated and manual checks before shipping TerminallySKILL.

## Pull Request Gate

- `npm run test:ci`
- `npm run test:e2e`
- `npm run test:e2e:ssh-docker` on Linux runners with Docker
- `npm run test:audit:runtime`
- Confirm no generated artifacts are committed from `dist/`, `out/`, `test-results/`, or `playwright-report/`.

## Nightly Gate

- Pull request gate.
- `npm run test:audit:all`
- `npm run test:package:mac:arm64` on Apple Silicon macOS runners.
- Linux package smoke: build AppImage/deb, launch with isolated user data, verify app opens.
- Locale screenshot smoke for English plus one long-text locale.

## Release Candidate Gate

- Pull request and nightly gates.
- macOS arm64 and x64 package builds.
- Linux x64 and arm64 package builds.
- Windows x64 package build.
- Generated update feeds exist and parse.
- Packaged app smoke on every produced platform:
  - app launches,
  - version matches `package.json`,
  - settings persist after relaunch,
  - terminal starts,
  - app exits cleanly,
  - no orphan PTY or VNC tunnel processes remain.

Current automated package smoke coverage:

- macOS arm64: `npm run test:package:mac:arm64`

## Manual Smoke That Remains

- Real external SSH host with user-specific `~/.ssh/config`.
- Real external VNC desktop with a non-test desktop environment.
- macOS Gatekeeper/notarization prompt behavior.
- Windows SmartScreen prompt behavior.
- Human translation review.
- Accessibility pass with real assistive tech.

## Required Release Sign-Off

- Runtime audit has zero moderate-or-higher vulnerabilities.
- Release artifacts match the update feed names.
- README download guidance matches the uploaded artifacts.
- The current implementation plan has no unchecked Phase 0 items.
