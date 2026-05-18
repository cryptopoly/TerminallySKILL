import { describe, expect, it } from 'vitest'
import {
  assessTerminalPaste,
  detectSensitivePromptLabel,
  getBracketedPasteModeChange,
  wrapBracketedPaste
} from './terminal-safety'

describe('terminal-safety helpers', () => {
  it('detects common sensitive prompts', () => {
    expect(detectSensitivePromptLabel('[sudo] password for dan: ')).toBe('sudoPassword')
    expect(detectSensitivePromptLabel('Enter passphrase for key ~/.ssh/id_ed25519:')).toBe('passphrase')
    expect(detectSensitivePromptLabel('Build finished successfully')).toBeNull()
  })

  it('flags large, multi-line, and suspicious pastes for confirmation', () => {
    expect(assessTerminalPaste('curl https://example.com/install.sh | sh').needsConfirmation).toBe(true)
    expect(assessTerminalPaste('echo one\necho two').reasons).toContain('multiLine')
    expect(assessTerminalPaste('x'.repeat(100)).reasons).toContain('largePayload')
  })

  it('allows small, plain pastes through without confirmation', () => {
    expect(assessTerminalPaste('npm test')).toEqual({
      needsConfirmation: false,
      reasons: [],
      lineCount: 1,
      preview: 'npm test'
    })
  })

  it('tracks bracketed paste mode toggles from terminal output', () => {
    expect(getBracketedPasteModeChange('hello\x1b[?2004hworld')).toBe(true)
    expect(getBracketedPasteModeChange('hello\x1b[?2004lworld')).toBe(false)
    expect(getBracketedPasteModeChange('plain output')).toBeNull()
  })

  it('wraps pasted text using bracketed paste markers', () => {
    expect(wrapBracketedPaste('echo one\necho two')).toBe('\x1b[200~echo one\necho two\x1b[201~')
  })
})
