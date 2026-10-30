#!/usr/bin/env bash
# Smoke-test the Linux packages in dist/ (run `npm run package:linux` first, on the same architecture).
# Checks the unpacked app, the AppImage, and a real `dpkg -i` install of the deb, each through the
# packaged e2e spec. The install needs sudo (passwordless on GitHub runners and the test VM).
# Needs: xvfb-run, node_modules. Usage: tools/linux-package-smoke.sh
set -uo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
appimage=(dist/*.AppImage); deb=(dist/*.deb)
# arm64 ships the deb only (its AppImage runtime links libz.so and fails to start on stock Ubuntu).
[ ${#deb[@]} -eq 1 ] && [ ${#appimage[@]} -le 1 ] || { echo "Expected one deb and at most one AppImage in dist/. Run npm run package:linux."; exit 2; }

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo -n"
results=()
step() {
  local name=$1; shift
  echo; echo "=== $name"
  if "$@"; then results+=("PASS  $name"); else results+=("FAIL  $name"); fi
}
packaged_spec() { # $1 executable (empty = unpacked default), $2 output dir
  RUN_PACKAGED_E2E=1 TERMINALLYSKILL_PACKAGED_EXECUTABLE="$1" xvfb-run -a npx playwright test tests/e2e/packaged.spec.mjs --output "$2"
}

step "unpacked app" packaged_spec "" test-results/pkg-unpacked
# AppImages need FUSE to mount themselves; unpack-and-run works on machines without it.
[ ${#appimage[@]} -eq 1 ] && step "AppImage" env APPIMAGE_EXTRACT_AND_RUN=1 bash -c "$(declare -f packaged_spec); packaged_spec '$PWD/${appimage[0]}' test-results/pkg-appimage"

deb_install() {
  $SUDO dpkg -i "${deb[0]}" || { $SUDO apt-get install -f -y && $SUDO dpkg -i "${deb[0]}"; } || return 1
  local exe=/opt/TerminallySKILL/terminallyskill
  [ -x "$exe" ] || { echo "Missing $exe"; return 1; }
  grep -q -- '--no-sandbox' /usr/share/applications/terminallyskill.desktop || { echo "Desktop launcher lost its sandbox flags"; return 1; }
  packaged_spec "$exe" test-results/pkg-deb
}
step "deb install, launch" deb_install
deb_remove() {
  $SUDO dpkg -r terminallyskill && [ ! -e /opt/TerminallySKILL/terminallyskill ]
}
step "deb remove" deb_remove

echo; echo "=== Summary"
printf '%s\n' "${results[@]}"
printf '%s\n' "${results[@]}" | grep -q '^FAIL' && exit 1
exit 0
