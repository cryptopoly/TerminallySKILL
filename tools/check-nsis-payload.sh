#!/usr/bin/env bash
# Fail if a Windows setup .exe packs files with a 7z filter the NSIS extractor (Nsis7z) cannot decode.
# electron-builder 26.15.x let 7-Zip apply its ARM64 branch filter to ARM64 binaries; the installer then skipped
# those files without an error, so a silent install had no TerminallySKILL.exe or .dll files (0.9.103).
# Usage: tools/check-nsis-payload.sh <Setup.exe>   (SEVENZIP=7zz on macOS; 7z on the Windows runner)
set -euo pipefail

exe=${1:?setup .exe required}
sevenzip=${SEVENZIP:-7z}
work=$(mktemp -d ./nsis-payload-check.XXXXXX)  # relative, so Git Bash passes it to 7z.exe unchanged
trap 'rm -rf "$work"' EXIT

"$sevenzip" x -y -o"$work" "$exe" '$PLUGINSDIR/app-*.7z' >/dev/null
payload=$(ls "$work"/\$PLUGINSDIR/app-*.7z)

# Every coder in each file's Method must be one Nsis7z reads: LZMA2, LZMA, Copy, BCJ or BCJ2 (BCJ2 files did
# extract on the 0.9.103 test; only the ARM64-filtered ones were missing).
bad=$("$sevenzip" l -slt "$payload" | awk -F' = ' '
  /^----------$/ { files = 1 }
  /^Path = / { path = $2 }
  files && /^Method = / {
    n = split($2, coders, " ")
    for (i = 1; i <= n; i++) if (coders[i] !~ /^(LZMA2|LZMA|Copy|BCJ|BCJ2)(:|$)/) { print coders[i] " " path; break }
  }')

if [ -n "$bad" ]; then
  echo "NSIS payload check FAIL: $(echo "$bad" | wc -l | tr -d ' ') files use filters the installer cannot extract:"
  echo "$bad" | head -20
  exit 1
fi
echo "NSIS payload check PASS: $(basename "$exe")"
