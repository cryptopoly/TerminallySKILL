#!/usr/bin/env bash
# Install the Windows setup .exe from a GitHub release (draft is fine) on the Windows test VM and run the
# packaged spec against it (app opens, version matches, settings persist, a terminal starts).
# Leaves the app installed. Usage: tools/vm-release-smoke-windows.sh <version> [--vm "W11 Testing"]
set -euo pipefail

VERSION=${1:?version required, e.g. 0.9.103}; shift || true
VM="W11 Testing"
[ "${1:-}" = "--vm" ] && VM=$2
HERE=$(cd "$(dirname "$0")" && pwd)

prlctl status "$VM" | grep -q running || { prlctl start "$VM" >/dev/null; sleep 60; }

stage="$HOME/Downloads/tsk-release-smoke"; mkdir -p "$stage"; rm -f "$stage"/*.exe
gh release download "v$VERSION" -R cryptopoly/TerminallySKILL -p "*Setup-$VERSION-arm64.exe" -D "$stage" --clobber
exe=$(ls "$stage"/*.exe)
trap 'rm -rf "$stage"' EXIT

# prlctl exec joins its arguments into one string; ship the script base64-encoded. --current-user runs it in the
# logged-in desktop session, which Electron needs (the default SYSTEM account has no desktop).
payload=$(base64 < "$HERE/vm-release-smoke-windows.ps1" | tr -d '\n')
prlctl exec "$VM" --current-user powershell -NoProfile -Command "[IO.File]::WriteAllText('C:\\Users\\Public\\tsk-release-smoke.ps1',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('$payload')))"
prlctl exec "$VM" --current-user powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\\Users\\Public\\tsk-release-smoke.ps1' -Installer "\\\\Mac\\Home\\Downloads\\tsk-release-smoke\\$(basename "$exe")" 2>&1 | tee /tmp/win-release-smoke.log
grep -q "RELEASE SMOKE PASS" /tmp/win-release-smoke.log
