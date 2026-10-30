#!/usr/bin/env bash
# Run the test suite on the Linux VM in Parallels Desktop (Pro edition, needs `prlctl exec`).
# Usage: tools/vm-test.sh [--vm "Ubuntu 26.04 ARM64"] [--branch NAME] [--stop] [--windows]
# --windows runs tools/vm-test-windows.ps1 instead (use with --vm "W11 Testing").
# The branch must be pushed: the VM clones from GitHub, not from this working tree.
set -euo pipefail

VM="Ubuntu 26.04 ARM64"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
STOP=0
WINDOWS=0
while [ $# -gt 0 ]; do
  case $1 in
    --vm) VM=$2; shift 2 ;;
    --branch) BRANCH=$2; shift 2 ;;
    --stop) STOP=1; shift ;;
    --windows) WINDOWS=1; shift ;;
    *) echo "Unknown option: $1"; exit 64 ;;
  esac
done

HERE=$(cd "$(dirname "$0")" && pwd)
LOG="$HERE/../test-results/vm-$(echo "$VM" | tr ' .' '__')-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname "$LOG")"

if ! prlctl status "$VM" | grep -q running; then
  echo "Starting $VM"
  prlctl start "$VM" >/dev/null
fi
for _ in $(seq 1 60); do
  if [ "$WINDOWS" = 1 ]; then prlctl exec "$VM" cmd /c echo ready >/dev/null 2>&1 && break
  else prlctl exec "$VM" true 2>/dev/null && break; fi
  sleep 3
done

if [ "$WINDOWS" = 1 ]; then
  payload=$(base64 < "$HERE/vm-test-windows.ps1" | tr -d '\n')
  prlctl exec "$VM" powershell -NoProfile -Command "[IO.File]::WriteAllText('C:\\tsk-vm-test.ps1',[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('$payload')))"
  prlctl exec "$VM" powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\tsk-vm-test.ps1' -Branch "$BRANCH" 2>&1 | tee "$LOG"
  echo "Log: $LOG"
  [ "$STOP" = 1 ] && prlctl stop "$VM" >/dev/null
  # prlctl exec does not report a Windows exit code reliably; the Summary above is the result.
  grep -q '^FAIL' "$LOG" && exit 1
  exit 0
fi

# prlctl exec runs as root with a bare PATH and joins its arguments into one string, so pass
# one string per call, ship the script base64-encoded and run it through a login shell as the normal user.
payload=$(base64 < "$HERE/vm-test-inner.sh" | tr -d '\n')
prlctl exec "$VM" "echo $payload | base64 -d > /tmp/tsk-vm-test.sh && chmod 644 /tmp/tsk-vm-test.sh"
prlctl exec "$VM" "su - parallels -c 'bash /tmp/tsk-vm-test.sh $BRANCH'" 2>&1 | tee "$LOG"
status=${PIPESTATUS[0]}

echo "Log: $LOG"
[ "$STOP" = 1 ] && prlctl stop "$VM" >/dev/null
exit "$status"
