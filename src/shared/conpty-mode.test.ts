import { describe, expect, it } from 'vitest'
import { usesBundledConpty } from './conpty-mode'

describe('usesBundledConpty', () => {
  it('is on by default on Windows', () => {
    expect(usesBundledConpty('win32', {})).toBe(true)
    expect(usesBundledConpty('win32', { TSK_CONPTY_DLL: '1' })).toBe(true)
  })

  it('TSK_CONPTY_DLL=0 goes back to the ConPTY built into Windows', () => {
    expect(usesBundledConpty('win32', { TSK_CONPTY_DLL: '0' })).toBe(false)
  })

  it('is off on macOS and Linux', () => {
    expect(usesBundledConpty('darwin', {})).toBe(false)
    expect(usesBundledConpty('linux', { TSK_CONPTY_DLL: '1' })).toBe(false)
  })
})
