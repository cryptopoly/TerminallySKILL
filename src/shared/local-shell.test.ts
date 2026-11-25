import { describe, expect, it } from 'vitest'
import {
  buildChangeDirectoryCommand,
  buildCommandInFolder,
  buildNativeInvocation,
  isPowerShell,
  posixSingleQuote,
  powerShellSingleQuote,
  quoteForShell
} from './local-shell'

describe('isPowerShell', () => {
  it('recognises Windows PowerShell and PowerShell 7 by path or name', () => {
    expect(isPowerShell('powershell.exe')).toBe(true)
    expect(isPowerShell('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')).toBe(true)
    expect(isPowerShell('pwsh')).toBe(true)
    expect(isPowerShell('C:\\Program Files\\PowerShell\\7\\PWSH.EXE')).toBe(true)
    expect(isPowerShell('/usr/local/bin/pwsh')).toBe(true)
  })

  it('treats everything else as a POSIX shell', () => {
    expect(isPowerShell('/bin/zsh')).toBe(false)
    expect(isPowerShell('/bin/bash')).toBe(false)
    expect(isPowerShell('cmd.exe')).toBe(false)
    expect(isPowerShell('/opt/mypowershell-wrapper')).toBe(false)
    expect(isPowerShell(null)).toBe(false)
    expect(isPowerShell(undefined)).toBe(false)
    expect(isPowerShell('')).toBe(false)
  })
})

describe('quoting', () => {
  it('doubles apostrophes for PowerShell and leaves $, spaces and backslashes literal', () => {
    expect(powerShellSingleQuote("it's")).toBe("'it''s'")
    expect(powerShellSingleQuote('$HOME and $(whoami)')).toBe("'$HOME and $(whoami)'")
    expect(powerShellSingleQuote('C:\\Program Files\\app\\')).toBe("'C:\\Program Files\\app\\'")
    expect(powerShellSingleQuote('`n "x"')).toBe("'`n \"x\"'")
    expect(powerShellSingleQuote('')).toBe("''")
  })

  it('doubles the typographic single quotes PowerShell also ends a string at', () => {
    expect(powerShellSingleQuote('it\u2019s')).toBe("'it\u2019\u2019s'")
    expect(powerShellSingleQuote('\u2018a\u2019 \u201Ab\u201B')).toBe("'\u2018\u2018a\u2019\u2019 \u201A\u201Ab\u201B\u201B'")
    expect(powerShellSingleQuote('日本語 ü café')).toBe("'日本語 ü café'")
  })

  it('keeps POSIX quoting as before', () => {
    expect(posixSingleQuote("it's")).toBe("'it'\\''s'")
    expect(quoteForShell("it's", '/bin/zsh')).toBe("'it'\\''s'")
    expect(quoteForShell("it's", 'powershell.exe')).toBe("'it''s'")
  })
})

describe('buildChangeDirectoryCommand', () => {
  it('uses cd for POSIX shells', () => {
    expect(buildChangeDirectoryCommand("/Users/me/it's here", '/bin/zsh')).toBe("cd '/Users/me/it'\\''s here'")
    expect(buildChangeDirectoryCommand('/tmp', null)).toBe("cd '/tmp'")
  })

  it('uses Set-Location -LiteralPath for PowerShell, so [ ] and * are not wildcards', () => {
    expect(buildChangeDirectoryCommand("C:\\Users\\me\\it's [v2] $x", 'powershell.exe')).toBe(
      "Set-Location -LiteralPath 'C:\\Users\\me\\it''s [v2] $x'"
    )
  })
})

describe('buildCommandInFolder', () => {
  it('chains with && in POSIX shells', () => {
    expect(buildCommandInFolder('/repo', "python3 './a.py'", '/bin/bash')).toBe("cd '/repo' && python3 './a.py'")
  })

  it('runs the command only when Set-Location worked in PowerShell', () => {
    expect(buildCommandInFolder('C:\\repo', "python3 './a.py'", 'powershell.exe')).toBe(
      "Set-Location -LiteralPath 'C:\\repo'; if ($?) { python3 './a.py' }"
    )
  })
})

describe('buildNativeInvocation', () => {
  const args = ['ssh', '-p', '22', 'me@host', `cd '/srv/it'\\''s' && exec "\${SHELL:-/bin/sh}" -l`]

  it('quotes every argument for sh, unchanged from before', () => {
    expect(buildNativeInvocation(args, '/bin/zsh')).toBe(
      `'ssh' '-p' '22' 'me@host' 'cd '\\''/srv/it'\\''\\'\\'''\\''s'\\'' && exec "\${SHELL:-/bin/sh}" -l'`
    )
  })

  it('uses the call operator and escapes embedded double quotes for Windows PowerShell 5.1', () => {
    expect(buildNativeInvocation(args, 'powershell.exe')).toBe(
      `& 'ssh' '-p' '22' 'me@host' 'cd ''/srv/it''\\''''s'' && exec \\"\${SHELL:-/bin/sh}\\" -l'`
    )
  })

  it('leaves embedded double quotes to PowerShell 7, which escapes them itself', () => {
    expect(buildNativeInvocation(['ssh', 'host', 'echo "a b"'], 'pwsh')).toBe(`& 'ssh' 'host' 'echo "a b"'`)
  })

  it('doubles backslashes before a quote, and trailing ones when 5.1 wraps the argument', () => {
    expect(buildNativeInvocation(['x', 'a\\"b'], 'powershell.exe')).toBe(`& 'x' 'a\\\\\\"b'`)
    expect(buildNativeInvocation(['x', 'a b\\'], 'powershell.exe')).toBe(`& 'x' 'a b\\\\'`)
    expect(buildNativeInvocation(['x', 'ab\\'], 'powershell.exe')).toBe(`& 'x' 'ab\\'`)
  })
})
