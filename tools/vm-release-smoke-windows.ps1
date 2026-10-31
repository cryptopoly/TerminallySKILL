# Runs inside the Windows test VM as the logged-in user. Started by tools/vm-release-smoke-windows.sh.
param([string]$Installer, [string]$Ref = 'staging')
$ErrorActionPreference = 'Stop'
$env:Path = 'C:\tools\node;C:\tools\git\cmd;' + $env:Path

$local = Join-Path $env:TEMP 'tsk-release-setup.exe'
Copy-Item $Installer $local -Force
Start-Process $local -ArgumentList '/S' -Wait
# The one-click installer finishes its work after the setup process has exited, so wait for the app to appear.
$exe = $null
for ($i = 0; $i -lt 30 -and -not $exe; $i++) {
  Start-Sleep 2
  $exe = Get-ChildItem "$env:LOCALAPPDATA\Programs" -Recurse -Filter TerminallySKILL.exe -ErrorAction SilentlyContinue | Select-Object -First 1
}
if (-not $exe) { 'RELEASE SMOKE FAIL: installed TerminallySKILL.exe not found'; exit 1 }
"Installed: $($exe.FullName)"

$repo = Join-Path $env:USERPROFILE 'tsk'
if (-not (Test-Path "$repo\.git")) { git clone -q https://github.com/cryptopoly/TerminallySKILL.git $repo }
Set-Location $repo
git fetch -q origin $Ref
git checkout -q -B $Ref FETCH_HEAD
# The packaged spec only needs Playwright, not the native modules (those need Visual Studio to build).
npm ci --ignore-scripts --silent 2>&1 | Out-Host

$env:RUN_PACKAGED_E2E = '1'
$env:TERMINALLYSKILL_PACKAGED_EXECUTABLE = $exe.FullName
npx playwright test tests/e2e/packaged.spec.mjs --output test-results/release-smoke 2>&1 | Tee-Object -Variable out | Out-Host
if ($out -match ' 1 passed') { "RELEASE SMOKE PASS: $($exe.FullName)" } else { 'RELEASE SMOKE FAIL'; exit 1 }
