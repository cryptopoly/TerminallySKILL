import { describe, expect, it } from 'vitest'
import { formatCommandForDisplay, getSSHHost, isSSHSessionCommand } from './command-display'

describe('ssh command display', () => {
  it('reads the sh form of the ssh call', () => {
    const raw = "'ssh' '-t' '-p' '2222' 'deploy@host' 'cd '\\''/srv/app'\\'' && exec \"${SHELL:-/bin/sh}\" -l'"
    expect(isSSHSessionCommand(raw)).toBe(true)
    expect(getSSHHost(raw)).toBe('deploy@host')
    expect(formatCommandForDisplay(raw)).toBe('ssh -t -p 2222 deploy@host')
  })

  it('reads the PowerShell form of the ssh call, doubled quotes included', () => {
    const raw = "& 'ssh' '-t' '-i' 'C:\\Users\\Dan O''Neil\\.ssh\\id' 'deploy@host' 'cd ''/srv/app'' && exec \\\"${SHELL:-/bin/sh}\\\" -l'"
    expect(isSSHSessionCommand(raw)).toBe(true)
    expect(getSSHHost(raw)).toBe('deploy@host')
    expect(formatCommandForDisplay(raw)).toBe("ssh -t -i C:\\Users\\Dan O'Neil\\.ssh\\id deploy@host")
  })

  it('leaves other commands alone', () => {
    expect(isSSHSessionCommand('& npm test')).toBe(false)
    expect(formatCommandForDisplay("& 'npm' 'test'")).toBe('npm test')
  })
})
