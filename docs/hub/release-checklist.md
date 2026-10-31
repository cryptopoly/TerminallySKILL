---
title: Release checklist
order: 9
summary: The steps for every release, including the Linux and Windows smoke tests on the actual release files.
---
# Release checklist

Use this for every release. Lesson from 0.9.103: a local build is not the release file. The arm64 `.deb` that GitHub built shipped an x86 terminal module and no terminal could start, while the local build worked. Always test the files that users download.

## Before the release build

1. All work merged into `staging` through PRs. Checks `test` and `test (macos-latest)` green.
2. Version bumped in `package.json` (use `npx -y npm@11 version X --no-git-tag-version`), release notes in `docs/releases/vX.md` (privacy line first, highlights, requirements, testing, known limitations, assets).
3. Hand-test the packaged macOS build against real data: `docs/hub/uat-X.md`. Back up the data folder first.
4. Linux VM: `tools/vm-test.sh` (unit, e2e, SSH, Docker SSH, AppImage and `.deb` smoke). All steps PASS.
5. Open the PR `staging` to `main`, merge when green.

## The release build

6. Run the **Release** workflow on `main` with the version. It creates a **draft** release with all assets and the notes. If a macOS job fails at stapling with a network error, re-run the failed jobs.

## Smoke-test the draft release files (do not skip)

7. **Linux:** `tools/vm-release-smoke.sh X`. It downloads the draft `.deb` for the VM architecture, installs it, and runs the packaged spec (app opens, version matches, settings persist, **a terminal starts**). Must print `RELEASE SMOKE PASS`. Also install the other architecture's file on a matching machine when one exists (x64 `.deb` and AppImage have not been run on real x64 hardware yet).
8. **Windows (best effort, no known users):** on the `W11 Testing` VM (snapshot `pre-test-2026-10-30`) install the draft `Setup-X-arm64.exe`, open it, create a project, run a script, confirm a terminal opens. Note the result in the release notes under known limitations if skipped.
9. **macOS:** open the notarized `.dmg` from the draft on a Mac, confirm no Gatekeeper warning and that a terminal opens.

## Publish

10. Publish the draft (Dan). Check the update feed from a 0.9.(X-1) install.
11. Post the announcement. Lead with "No telemetry. No analytics. No account."
12. Delete merged branches. Log decisions on the Decisions page; update status.
