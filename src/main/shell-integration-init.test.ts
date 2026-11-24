import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildBashShellIntegrationInit,
  buildPowerShellIntegrationArgs,
  buildPowerShellShellIntegrationInit,
  buildZshEnvForward,
  buildZshShellIntegrationInit
} from './shell-integration-init'

describe('shell integration init scripts', () => {
  it('builds zsh hooks for prompt-ready and command-start events', () => {
    const init = buildZshShellIntegrationInit()

    expect(init).toContain('precmd_functions+=(__tv_prompt_ready)')
    expect(init).toContain('preexec_functions+=(__tv_command_start)')
  })

  it('builds bash hooks that emit prompt-ready and command-start markers', () => {
    const init = buildBashShellIntegrationInit()

    expect(init).toContain('__tv_command_start "$BASH_COMMAND"')
    expect(init).toContain("trap '__tv_preexec' DEBUG")
    expect(init).toContain('PROMPT_COMMAND="__tv_prompt_command"')
    expect(init).toContain('__tv_command_started=0')
    expect(init).toContain('__tv_prompt_state=1')
    expect(init).toContain('__tv_run_original_prompt_command()')
    expect(init).toContain('__tv_original_prompt_command_array=("${PROMPT_COMMAND[@]}")')
  })

  it('builds PowerShell hooks that wrap the profile prompt and work in Windows PowerShell 5.1', () => {
    const init = buildPowerShellShellIntegrationInit()
    const promptBody = init.split('function global:prompt {\n')[1]

    // $? is lost as soon as anything else runs
    expect(promptBody.startsWith('  $ok = $?\n')).toBe(true)
    expect(init).toContain('Prompt = $function:prompt')
    expect(init).toContain('& $global:__TvState.Prompt')
    expect(init).toContain('[Console]::Write([string][char]27 + "]7337;shell;" + $Payload + [char]7)')
    expect(init).toContain('"prompt-ready;" + $code + ";"')
    // The next typed line (a workflow step marker) still sees the user's $LASTEXITCODE
    expect(promptBody).toContain('  & $global:__TvState.Prompt\n  $global:LASTEXITCODE = $native\n}')
    expect(init).not.toContain('`e')
    expect(init).toMatch(/^[\x00-\x7f]*$/)
  })

  it('defines the workflow step function, which erases its own typed line and reports the step status', () => {
    const init = buildPowerShellShellIntegrationInit()
    const body = init.split('function global:__TvStep([string]$Run, [string]$Step, $Ok, $Native) {\n')[1].split('\n}\n')[0]

    // Rows the prompt plus the typed line take, wrapped at the window width; cursor up that many, erase to the end
    expect(body).toContain('$rows = [Math]::Floor(($start + $MyInvocation.Line.Length - 1) / $width) + 1')
    expect(body).toContain('[Console]::Write([string][char]27 + "[" + $rows + "A`r" + [char]27 + "[J")')
    // Only a line the line editor drew is erased, and only once
    expect(body).toContain('  $global:__TvState.LineStart = $null\n  if ($null -ne $start -and $MyInvocation.Line) {')
    // A failed step reports the code its prompt worked out, else $LASTEXITCODE, else 1
    expect(body).toContain("  if (-not $Ok) {\n    $code = $global:__TvState.Code\n    if (-not $code) { $code = 1; if ($Native) { $code = $Native } }")
    expect(init).toContain('    $global:__TvState.Code = $code')
    // ...and is taken out of Get-History by the next prompt
    expect(init).toContain('if ($last -and $last.CommandLine.StartsWith("__TvStep ")) { Clear-History -Id $last.Id }')
    expect(body).toContain('"]7337;workflow-step;" + $Run + ";" + $Step + ";" + $code + [char]7')
    // Defined before the prompt and line-editor hooks, so it exists even if a later part fails
    expect(init.indexOf('function global:__TvStep')).toBeLessThan(init.indexOf('function global:prompt'))
  })

  it('builds PowerShell command-start and history hooks only when PSReadLine is loaded', () => {
    const init = buildPowerShellShellIntegrationInit()
    const readLineBlock = init.slice(init.indexOf('if (Get-Module PSReadLine) {'))

    expect(readLineBlock).toContain('function global:PSConsoleHostReadLine {\n    $ok = $?\n')
    // A prompt redrawn while a line is edited (Ctrl+L, transient prompt) is not a new prompt
    expect(readLineBlock).toContain('try { $line = & $global:__TvState.ReadLine } finally { $global:__TvState.Reading = $false }')
    expect(init).toContain('  if (-not $global:__TvState.Reading) {')
    expect(readLineBlock).toContain('[string]::IsNullOrWhiteSpace($line)')
    expect(readLineBlock).toContain('"command-start;" + (__TvB64 $line)')
    expect(readLineBlock).toContain('$global:__TvState.History = (Get-PSReadLineOption).AddToHistoryHandler')
    expect(readLineBlock).toContain('if ($Line.StartsWith("__TvStep ")) { return $false }')
    // Where the typed line starts, read before the line editor runs
    expect(readLineBlock).toContain('$global:__TvState.LineStart = $Host.UI.RawUI.CursorPosition.X\n    if (-not $ok)')
    expect(readLineBlock).toContain('return $global:__TvState.History.Invoke($Line)')
  })

  it('quotes the PowerShell init path for -Command and keeps the user profile', () => {
    const args = buildPowerShellIntegrationArgs("C:\\Users\\Jo O'Brien\u2019s\\AppData\\Local\\Temp\\tv-ps-term-1.ps1")

    expect(args).toEqual([
      '-NoLogo',
      '-NoExit',
      '-Command',
      ". ([ScriptBlock]::Create([IO.File]::ReadAllText('C:\\Users\\Jo O''Brien\u2019\u2019s\\AppData\\Local\\Temp\\tv-ps-term-1.ps1')))"
    ])
    expect(args).not.toContain('-NoProfile')
  })
})

describe('shell integration against real shells', () => {
  const run = (shell: string, args: string[], env: Record<string, string>): string => {
    const result = spawnSync(shell, args, { env: { PATH: process.env.PATH ?? '', ...env }, encoding: 'utf8' })
    return result.stdout
  }
  const hasShell = (shell: string): boolean => spawnSync('which', [shell]).status === 0

  it.runIf(hasShell('zsh'))('zsh: keeps integration when the user .zshenv moves ZDOTDIR', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'tv-home-'))
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'tv-zsh-'))
    mkdirSync(path.join(home, '.config/zsh'), { recursive: true })
    writeFileSync(path.join(home, '.zshenv'), 'export ZDOTDIR="$HOME/.config/zsh"\n')
    writeFileSync(path.join(home, '.config/zsh/.zshrc'), 'USER_RC_LOADED=yes\n')
    writeFileSync(path.join(tmp, '.zshenv'), buildZshEnvForward(tmp))
    writeFileSync(path.join(tmp, '.zshrc'), buildZshShellIntegrationInit())

    const out = run('zsh', ['-i', '-c', 'print -r -- "rc=$USER_RC_LOADED hooks=${precmd_functions[*]}"'], {
      HOME: home,
      ZDOTDIR: tmp
    })

    expect(out).toContain('rc=yes')
    expect(out).toContain('__tv_prompt_ready')
  })

  it.runIf(hasShell('zsh'))('zsh: survives a stale TV_USER_ZDOTDIR pointing at its own temp dir', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'tv-home-'))
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'tv-zsh-'))
    writeFileSync(path.join(home, '.zshrc'), 'USER_RC_LOADED=yes\n')
    writeFileSync(path.join(tmp, '.zshenv'), buildZshEnvForward(tmp))
    writeFileSync(path.join(tmp, '.zshrc'), buildZshShellIntegrationInit())

    const result = spawnSync('zsh', ['-i', '-c', 'print -r -- "rc=$USER_RC_LOADED"'], {
      env: { PATH: process.env.PATH ?? '', HOME: home, ZDOTDIR: tmp, TV_USER_ZDOTDIR: tmp },
      encoding: 'utf8',
      timeout: 5000
    })

    expect(result.stderr).not.toContain('recursion')
    expect(result.stdout).toContain('rc=yes')
  })

  it.runIf(hasShell('bash'))('bash: chains a DEBUG trap installed by the user rc', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'tv-bash-'))
    const rc = path.join(dir, 'rc.sh')
    writeFileSync(path.join(dir, '.bashrc'), "PREV_TRAP_HITS=0\ntrap 'PREV_TRAP_HITS=$((PREV_TRAP_HITS+1))' DEBUG\n")
    writeFileSync(rc, buildBashShellIntegrationInit())

    const out = run('bash', ['--rcfile', rc, '-i', '-c', 'true; true; echo hits=$PREV_TRAP_HITS'], { HOME: dir })

    expect(out).toMatch(/hits=[1-9]/)
  })

  it.runIf(process.platform === 'win32')('powershell: reports the exit code and folder at each prompt', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "tv-ps O'Brien\u2019s-"))
    const file = path.join(dir, 'init.ps1')
    writeFileSync(file, buildPowerShellShellIntegrationInit())
    // Same quoting as a real tab; prompt is called by hand since this shell is not interactive
    const args = buildPowerShellIntegrationArgs(file).filter((arg) => arg !== '-NoExit')
    args[args.length - 1] +=
      '; Set-Location $env:SystemRoot; prompt | Out-Null; cmd /c exit 3; prompt | Out-Null;' +
      ' Get-Item nope; prompt | Out-Null; cmd /c exit 3; prompt | Out-Null'

    const out = spawnSync('powershell.exe', ['-NoProfile', ...args], { encoding: 'utf8' }).stdout
    const events = [...out.matchAll(/\x1b\]7337;shell;prompt-ready;(-?\d+);([^\x07]*)\x07/g)]

    expect(events.map((event) => event[1])).toEqual(['0', '3', '1', '3'])
    expect(Buffer.from(events[0][2], 'base64').toString('utf8').toLowerCase()).toBe(process.env.SystemRoot?.toLowerCase())
  })

  it.runIf(process.platform === 'win32')('powershell: the workflow step line reports the step status', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'tv-ps-step-'))
    const file = path.join(dir, 'init.ps1')
    writeFileSync(file, buildPowerShellShellIntegrationInit())
    const args = buildPowerShellIntegrationArgs(file).filter((arg) => arg !== '-NoExit')
    args[args.length - 1] +=
      '; cmd /c exit 3; __TvStep r1 0 $? $LASTEXITCODE; cmd /c exit 0; __TvStep r1 1 $? $LASTEXITCODE;' +
      ' Get-Item nope; __TvStep r1 2 $? $LASTEXITCODE'

    const out = spawnSync('powershell.exe', ['-NoProfile', ...args], { encoding: 'utf8' }).stdout
    const results = [...out.matchAll(/\x1b\]7337;workflow-step;r1;(\d+);(-?\d+)\x07/g)].map((m) => `${m[1]}:${m[2]}`)

    expect(results).toEqual(['0:3', '1:0', '2:1'])
    // Not read by the line editor here, so nothing is erased
    expect(out).not.toContain('\x1b[J')
  })
})

describe('zsh history file', () => {
  it.runIf(spawnSync('zsh', ['--version']).status === 0)('points back at the user file when system rc used the temp dir', () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'tv-home-'))
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'tv-zsh-'))
    writeFileSync(path.join(tmp, '.zshrc'), 'HISTFILE="$ZDOTDIR/.zsh_history"\n' + buildZshShellIntegrationInit())
    const run = (extra: string): string => {
      writeFileSync(path.join(home, '.zshrc'), extra)
      return spawnSync('zsh', ['-f', '-c', `ZDOTDIR=${tmp}; source ${tmp}/.zshrc; print -r -- $HISTFILE`], {
        env: { ...process.env, HOME: home, TV_USER_ZDOTDIR: home },
        encoding: 'utf8'
      }).stdout.trim()
    }
    expect(run('')).toBe(path.join(home, '.zsh_history'))
    expect(run('HISTFILE=/custom/history\n')).toBe('/custom/history')
  })
})
