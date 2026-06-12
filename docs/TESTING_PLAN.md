# Automated Testing Plan

The goal is to move TerminallySKILL toward automatic confidence for the flows users normally test by hand: project setup, command building, scripts, terminal behavior, logs, AI settings, updates, SSH, and VNC.

## Current Baseline

- Unit/integration tests: `npm test`
- Runtime baseline check: `npm run test:runtime-baseline`
- Localization consistency: `npm run i18n:check`
- Production build: `npm run build`
- Electron E2E smoke tests: `npm run test:e2e`
- Docker-backed OpenSSH E2E: `npm run test:e2e:ssh-docker`
- Packaged macOS arm64 smoke: `npm run test:package:mac:arm64`
- Runtime dependency audit: `npm run test:audit:runtime`
- Merge-ready local gate: `npm run test:ci`

`test:audit:runtime` is intentionally separate from `test:ci` because it needs network access to the npm registry. It is now clean and should stay required in hosted CI.

## Test Layers

### 1. Pure Unit Tests

Use Vitest for logic that does not need Electron:

- command serialization and display helpers,
- terminal safety and paste detection,
- workflow template expansion and validation,
- run-history comparison,
- update-feed parsing,
- locale resolution and formatting.

Target: fast, deterministic, always runs on every PR.

### 2. Main-Process Integration Tests

Use Vitest with mocked Electron modules where needed:

- IPC validation and sender boundaries,
- path-access enforcement,
- project/script/snippet persistence,
- log creation/search/deletion,
- AI provider request/response parsing,
- workspace target connection logic,
- external URL policy.

Target: protect privileged behavior without launching a full app.

### 3. Renderer Component Tests

Add a lightweight renderer test environment before adding browser-level tests:

- command builder state changes,
- workflow run dialog validation,
- settings provider forms,
- log filter/search state,
- project dialog validation.

Recommended future dependency: React Testing Library with Vitest/jsdom.

### 4. Electron End-To-End Tests

Initial Playwright Electron tests now cover app launch, isolated state, local project persistence, fake SSH success/auth-failure through the real preload and IPC path, and a Docker-backed OpenSSH handshake.

Expand the suite toward these paths:

Core smoke path:

- launch Electron with isolated `TERMINALLYSKILL_USER_DATA_DIR`,
- create a local project in a temp directory,
- open a terminal,
- run a harmless command,
- save and run a one-step workflow,
- verify run/log entry appears,
- open settings and validate persistence after relaunch.

Command-builder path:

- open command browser,
- select a built-in command,
- set options/positionals,
- verify preview command,
- execute or copy command,
- promote a terminal command into a saved command.

Data path:

- create a project file,
- read/edit through file browser,
- verify path-access blocks outside project unless explicitly approved.

### 5. SSH Automation

SSH does not have to remain manual.

Use three tiers:

- **Fake SSH binary:** Put a generated `ssh` executable earlier in `PATH`. It simulates success, auth failure, host-key failure, timeout, and remote `pwd`. This is best for deterministic UI and IPC tests.
- **Docker OpenSSH endpoint:** Start an ephemeral container exposing port 22 on localhost with a generated key. This validates real `ssh`, key auth, port handling, and remote cwd behavior.
- **Manual external host:** Keep a small manual checklist for real-world hosts, agent forwarding, corporate SSH configs, and unusual shells.

Create the fake SSH fixture with:

```bash
npm run test:ssh-fixture:create
```

The script prints a temp `PATH` prefix and supports `FAKE_SSH_MODE=success`, `permission-denied`, `host-key-failed`, `resolve-failed`, or `timeout`.

CI recommendation:

- Run fake-SSH tests everywhere.
- Run Docker OpenSSH tests on Linux CI when Docker is available.
- Treat external-host tests as release-candidate smoke only.

### 6. VNC Automation

VNC can also be partially automated.

- Unit-test tunnel argument construction and token validation.
- Use fake SSH for tunnel failure/error UI states.
- Use Docker with `x11vnc` or TigerVNC for optional real noVNC handshake tests.
- Use screenshot/pixel checks for connected canvas presence, not full remote desktop behavior.

### 7. AI Provider Automation

Do not require paid provider keys in CI.

- Unit-test prompt construction, truncation, JSON coercion, and fallback routing.
- Use mocked fetch responses for OpenAI, Anthropic, Gemini, Ollama, LM Studio, and OpenAI-compatible providers.
- Add optional local Ollama/LM Studio smoke only when a runner advertises the service URL.

### 8. Release And Installer Tests

For each packaged artifact:

- launch with isolated user data,
- verify app opens,
- verify version matches `package.json`,
- verify update feed parse/check path,
- verify terminal launch,
- verify settings persistence,
- verify app exits cleanly with no orphan PTY/VNC processes.

Implemented package smoke:

- macOS arm64: `npm run test:package:mac:arm64` builds the artifact, launches the packaged `.app`, verifies the preload bridge/version, writes settings, starts and kills a PTY session, relaunches against the same isolated user data, and verifies settings persisted.

Platform matrix:

- macOS arm64 and x64 where available,
- Linux x64 AppImage/deb,
- Windows x64 installer.

## CI Gate Proposal

Required on every PR:

- `npm run test:ci`
- `npm run test:e2e`
- `npm run test:e2e:ssh-docker` on Linux CI with Docker available
- `npm run test:audit:runtime`

Required before release:

- Electron E2E smoke suite,
- packaged-app smoke suite,
- update-feed generation check,
- locale overflow/RTL screenshot checks for selected locales.

## Manual Testing That Remains

- Real SSH hosts with user-specific configs.
- Real VNC desktops with different desktop environments.
- OS-specific installer trust prompts.
- Human translation review.
- Accessibility review with real assistive tech.
