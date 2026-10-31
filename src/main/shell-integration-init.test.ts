import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildBashShellIntegrationInit, buildZshEnvForward, buildZshShellIntegrationInit } from './shell-integration-init'

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
