export type SensitivePromptKind =
  | 'sudoPassword'
  | 'password'
  | 'passphrase'
  | 'pin'
  | 'verificationCode'
  | 'token'
  | 'apiKey'

export type TerminalPasteReason =
  | 'multiLine'
  | 'largePayload'
  | 'controlCharacters'
  | 'dangerousCommand'

export interface TerminalPasteAssessment {
  needsConfirmation: boolean
  reasons: TerminalPasteReason[]
  lineCount: number
  preview: string
}

export function getBracketedPasteModeChange(output: string): boolean | null {
  let nextMode: boolean | null = null

  if (output.includes('\x1b[?2004h')) {
    nextMode = true
  }

  if (output.includes('\x1b[?2004l')) {
    nextMode = false
  }

  return nextMode
}

export function wrapBracketedPaste(text: string): string {
  return `\x1b[200~${text}\x1b[201~`
}

const SENSITIVE_PROMPT_PATTERNS: Array<{ re: RegExp; kind: SensitivePromptKind }> = [
  { re: /\[sudo\]\s+password\s+for\b.*:\s*$/i, kind: 'sudoPassword' },
  { re: /password(?:\s+for\b.*)?:\s*$/i, kind: 'password' },
  { re: /passphrase(?:\s+for\b.*)?:\s*$/i, kind: 'passphrase' },
  { re: /enter\s+pin\b.*:\s*$/i, kind: 'pin' },
  { re: /verification\s+code\b.*:\s*$/i, kind: 'verificationCode' },
  { re: /token\b.*:\s*$/i, kind: 'token' },
  { re: /api\s+key\b.*:\s*$/i, kind: 'apiKey' }
]

const SUSPICIOUS_PASTE_PATTERNS = [
  /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sh|bash|zsh)\b/i,
  /\brm\s+-rf\b/i,
  /\bsudo\b/i
]

export function detectSensitivePromptLabel(outputTail: string): SensitivePromptKind | null {
  const normalized = outputTail.replace(/\r/g, '')
  const lines = normalized.split('\n')
  const lastLine = lines[lines.length - 1]?.trimStart() ?? normalized.trimStart()

  for (const pattern of SENSITIVE_PROMPT_PATTERNS) {
    if (pattern.re.test(lastLine)) {
      return pattern.kind
    }
  }

  return null
}

export function assessTerminalPaste(text: string): TerminalPasteAssessment {
  const normalized = text.replace(/\r/g, '')
  const preview = normalized.length > 280 ? `${normalized.slice(0, 280)}...` : normalized
  const lineCount = normalized.length === 0 ? 0 : normalized.split('\n').length
  const reasons: TerminalPasteReason[] = []

  if (lineCount > 1) {
    reasons.push('multiLine')
  }

  if (normalized.length >= 80) {
    reasons.push('largePayload')
  }

  // Check for control characters but exclude \r (\x0d) and \n (\x0a) which
  // are normal line-ending characters, not dangerous control sequences.
  if (/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text)) {
    reasons.push('controlCharacters')
  }

  if (SUSPICIOUS_PASTE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    reasons.push('dangerousCommand')
  }

  return {
    needsConfirmation: reasons.length > 0,
    reasons,
    lineCount,
    preview
  }
}
