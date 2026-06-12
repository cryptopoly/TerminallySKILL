import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn()
  }
}))

import { shell } from 'electron'
import { isSafeExternalUrl, openSafeExternalUrl } from './external-url'

describe('external-url policy', () => {
  it('allows normal HTTPS URLs', () => {
    expect(isSafeExternalUrl('https://terminallyskill.com')).toBe(true)
    expect(isSafeExternalUrl('https://github.com/cryptopoly/TerminallySKILL?tab=readme')).toBe(true)
  })

  it('blocks non-HTTPS and malformed URLs', () => {
    expect(isSafeExternalUrl('http://terminallyskill.com')).toBe(false)
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeExternalUrl('not a url')).toBe(false)
  })

  it('only opens safe URLs through Electron shell', async () => {
    await expect(openSafeExternalUrl('file:///tmp/example')).resolves.toBe(false)
    expect(shell.openExternal).not.toHaveBeenCalled()

    await expect(openSafeExternalUrl('https://terminallyskill.com')).resolves.toBe(true)
    expect(shell.openExternal).toHaveBeenCalledWith('https://terminallyskill.com')
  })
})
