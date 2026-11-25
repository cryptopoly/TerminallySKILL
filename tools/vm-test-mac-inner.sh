#!/usr/bin/env bash
# Runs inside the macOS test VM as the logged-in user, in their desktop session. Started by tools/vm-test.sh --mac.
# Usage: vm-test-mac-inner.sh <branch>
set -uo pipefail
export PATH=/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
BRANCH=${1:?branch required}
REPO=https://github.com/cryptopoly/TerminallySKILL.git

cd "$HOME"
[ -d tsk/.git ] || git clone -q "$REPO" tsk
cd tsk
git fetch -q origin "$BRANCH" || { echo "Branch $BRANCH is not on origin. Push it first."; exit 2; }
git checkout -q -B "$BRANCH" FETCH_HEAD
echo "Testing $(git log --oneline -1) on macOS $(sw_vers -productVersion) $(uname -m), node $(node -v)"

results=()
step() {
  local name=$1; shift
  local start=$SECONDS
  echo; echo "=== $name"
  if "$@"; then results+=("PASS  $name ($((SECONDS - start))s)"); else results+=("FAIL  $name ($((SECONDS - start))s)"); fi
}

step "npm ci" npm ci --silent
step "test:ci (lint, typecheck, unit, build)" npm run test:ci
step "test:e2e" npm run test:e2e
step "test:e2e:ssh-local" npm run test:e2e:ssh-local
rm -rf dist
step "package:mac:arm64 + packaged tests" npm run test:package:mac:arm64

echo; echo "=== Summary"
printf '%s\n' "${results[@]}"
printf '%s\n' "${results[@]}" | grep -q '^FAIL' && exit 1
exit 0
