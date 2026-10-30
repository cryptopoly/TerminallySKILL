#!/usr/bin/env bash
# Runs inside the Linux test VM as the normal user. Started by tools/vm-test.sh.
# Usage: vm-test-inner.sh <branch>
set -uo pipefail
export PATH=/usr/local/bin:$PATH
# prlctl exec starts with umask 007, which would end up inside the deb's file modes.
umask 022
BRANCH=${1:?branch required}
REPO=https://github.com/cryptopoly/TerminallySKILL.git

cd "$HOME"
[ -d tsk/.git ] || git clone -q "$REPO" tsk
cd tsk
git fetch -q origin "$BRANCH" || { echo "Branch $BRANCH is not on origin. Push it first."; exit 2; }
git checkout -q -B "$BRANCH" FETCH_HEAD
echo "Testing $(git log --oneline -1) on $(uname -m), node $(node -v)"

results=()
step() {
  local name=$1; shift
  local start=$SECONDS
  echo; echo "=== $name"
  if "$@"; then results+=("PASS  $name ($((SECONDS - start))s)"); else results+=("FAIL  $name ($((SECONDS - start))s)"); fi
}

step "npm ci" npm ci --silent
step "test:ci (lint, typecheck, unit, build)" npm run test:ci
step "test:e2e" xvfb-run -a npm run test:e2e
step "test:e2e:ssh-local" xvfb-run -a npm run test:e2e:ssh-local
if docker info >/dev/null 2>&1; then
  step "test:e2e:ssh-docker" env REQUIRE_DOCKER_E2E=1 xvfb-run -a npm run test:e2e:ssh-docker
else
  results+=("SKIP  test:e2e:ssh-docker (Docker not running in this VM)")
fi

step "package:linux" npm run "package:linux:$([ "$(uname -m)" = aarch64 ] && echo arm64 || echo x64)"
step "package smoke (unpacked, AppImage, deb)" tools/linux-package-smoke.sh

echo; echo "=== Summary"
printf '%s\n' "${results[@]}"
printf '%s\n' "${results[@]}" | grep -q '^FAIL' && exit 1
exit 0
