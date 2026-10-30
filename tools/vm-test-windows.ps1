# Runs inside the Windows test VM. Started by `tools/vm-test.sh --windows`.
# Needs Node and MinGit unpacked in C:\tools (see docs/hub/backlog.md, "Windows VM").
param([string]$Branch = 'staging')
$ErrorActionPreference = 'Continue'
$env:Path = 'C:\tools\node;C:\tools\git\cmd;' + $env:Path
$repo = 'https://github.com/cryptopoly/TerminallySKILL.git'

if (-not (Test-Path C:\tsk\.git)) { git clone -q $repo C:\tsk }
Set-Location C:\tsk
git fetch -q origin $Branch
git checkout -q -B $Branch FETCH_HEAD
"Testing $(git log --oneline -1) on $env:PROCESSOR_ARCHITECTURE, node $(node -v)"

$results = @()
function Step($name, [scriptblock]$block) {
  $start = Get-Date
  "`n=== $name"
  & $block
  $ok = ($LASTEXITCODE -eq 0)
  $secs = [int]((Get-Date) - $start).TotalSeconds
  $script:results += ('{0}  {1} ({2}s)' -f $(if ($ok) { 'PASS' } else { 'FAIL' }), $name, $secs)
}

Step 'npm ci' { npm ci --silent 2>&1 | Out-Host }
Step 'test:ci' { npm run test:ci 2>&1 | Out-Host }
Step 'test:e2e' { npm run test:e2e 2>&1 | Out-Host }
Step 'package:win' { npm run package:win:arm64 2>&1 | Out-Host }

"`n=== Summary"
$results
if ($results -match '^FAIL') { exit 1 }
