#!/usr/bin/env bash
# Smoke-test the .deb from a GitHub release on the Linux test VM: install it, run the packaged spec against it
# (app opens, version matches, settings persist, a terminal starts). Leaves it installed.
# This tests the file users download, not a local build. Draft releases work too (needs `gh` access).
# Usage: tools/vm-release-smoke.sh <version> [--vm "Ubuntu 26.04 ARM64"]
set -euo pipefail

VERSION=${1:?version required, e.g. 0.9.103}; shift || true
VM="Ubuntu 26.04 ARM64"
[ "${1:-}" = "--vm" ] && VM=$2

prlctl status "$VM" | grep -q running || { prlctl start "$VM" >/dev/null; sleep 30; }
case $(prlctl exec "$VM" uname -m) in aarch64) arch=arm64 ;; x86_64) arch=amd64 ;; *) echo "Unknown VM architecture"; exit 2 ;; esac

# The VM sees the Mac home folder at /media/psf/Home, so download there.
stage="$HOME/.tsk-release-smoke"; mkdir -p "$stage"; rm -f "$stage"/*.deb
gh release download "v$VERSION" -R cryptopoly/TerminallySKILL -p "*-$arch.deb" -D "$stage" --clobber
deb=$(ls "$stage"/*.deb)

prlctl exec "$VM" "cp /media/psf/Home/.tsk-release-smoke/$(basename "$deb") /tmp/release-smoke.deb && dpkg -i /tmp/release-smoke.deb >/dev/null"
# The package stays installed afterwards (the VM is also used by hand); remove it with `dpkg -r terminallyskill`.
trap 'prlctl exec "$VM" "rm -f /tmp/release-smoke.deb"; rm -rf "$stage"' EXIT

prlctl exec "$VM" "su - parallels -c 'cd ~/tsk && git fetch -q origin main && git checkout -q -B main FETCH_HEAD && npm ci --silent && RUN_PACKAGED_E2E=1 TERMINALLYSKILL_PACKAGED_EXECUTABLE=/opt/TerminallySKILL/terminallyskill xvfb-run -a npx playwright test tests/e2e/packaged.spec.mjs --output test-results/release-smoke'" 2>&1 | tee /dev/stderr | grep -q " 1 passed" && echo "RELEASE SMOKE PASS: $(basename "$deb")" || { echo "RELEASE SMOKE FAIL: $(basename "$deb")"; exit 1; }
