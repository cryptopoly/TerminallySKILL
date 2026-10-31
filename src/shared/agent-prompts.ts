/**
 * Recognise a program that is waiting for a yes, from the last lines on its screen. Used only when
 * a busy terminal has gone quiet (or rang its bell) while nobody was looking at it. Agent-neutral:
 * every row is one tool and one pattern, so adding a tool is one line plus a test.
 *
 * `verified` says where the text comes from: true means seen in the tool's own source, binary or
 * official docs (see docs/hub/progress/agent-waiting-alerts.md); false means a reasonable guess.
 */
export interface ApprovalPromptPattern {
  tool: string
  pattern: RegExp
  verified: boolean
}

export const APPROVAL_PROMPT_PATTERNS: readonly ApprovalPromptPattern[] = [
  // Claude Code 2.1.316 (strings in the installed binary)
  { tool: 'Claude Code', pattern: /\bDo you want to (proceed|make this edit|create|allow)\b/i, verified: true },
  { tool: 'Claude Code', pattern: /\bNo, and tell Claude what to do differently\b/, verified: true },
  // OpenAI Codex CLI (codex-rs/tui/src/bottom_pane/approval_overlay.rs)
  {
    tool: 'Codex',
    pattern: /\bWould you like to (run the following command|make the following edits|grant these permissions)\?/,
    verified: true
  },
  { tool: 'Codex', pattern: /\bDo you want to approve network access to\b/, verified: true },
  { tool: 'Codex', pattern: /\bNo, and tell Codex what to do differently\b/, verified: true },
  // Google Gemini CLI (packages/cli/src/ui/components/messages/ToolConfirmationMessage.tsx)
  { tool: 'Gemini CLI', pattern: /\bApply this change\?/, verified: true },
  { tool: 'Gemini CLI', pattern: /\bAllow execution of\b/, verified: true },
  // Aider (aider/io.py confirm_ask): "Run shell command? (Y)es/(N)o [Yes]:"
  { tool: 'Aider', pattern: /\(Y\)es\/\(N\)o\b/, verified: true },
  // GitHub Copilot CLI (docs.github.com, Copilot CLI approval options)
  { tool: 'Copilot CLI', pattern: /\bNo, and tell Copilot what to do differently\b/, verified: true },
  // OpenCode: option labels seen in issues and third-party pages, not in its source
  { tool: 'OpenCode', pattern: /\b(Always allow|Allow always)\b/, verified: false },
  // Cursor CLI docs only say it asks to approve (y) or reject (n)
  { tool: 'Cursor CLI', pattern: /\(y\)[^\n]*\(n\)/i, verified: false },
  // Generic prompts any program may print (Amp and others without a known string fall here)
  { tool: 'generic', pattern: /[([]\s*y(es)?\s*\/\s*no?\s*[)\]]/i, verified: true },
  { tool: 'generic', pattern: /\bPress (Enter|Return|any key) to continue\b/i, verified: true },
  { tool: 'generic', pattern: /\b(Ok|OK|Okay) to proceed\?/, verified: true },
  { tool: 'generic', pattern: /^\s*(Allow|Approve)\b[^\n]{0,120}\?\s*$/, verified: true },
  { tool: 'generic', pattern: /\bDo you want to continue\?/i, verified: true }
]

/** Only the bottom of the screen counts: a prompt that scrolled up is not waiting any more. */
export const PROMPT_TAIL_LINES = 10

export interface ApprovalPromptMatch {
  tool: string
  /** The line that matched, raw (callers must sanitise and mask it before showing it) */
  line: string
}

/** The last non-empty lines of a screen, at most `max`. */
export function screenTail(lines: readonly string[], max = PROMPT_TAIL_LINES): string[] {
  const nonEmpty = lines.map((line) => line.replace(/\s+$/, '')).filter((line) => line.trim() !== '')
  return nonEmpty.slice(-max)
}

/**
 * The lowest of the last lines that matches a table row. A matching line that asks a question
 * ("Do you want to proceed?") wins over a matching option line below it, so the notification
 * shows the question.
 */
export function matchApprovalPrompt(
  lines: readonly string[],
  patterns: readonly ApprovalPromptPattern[] = APPROVAL_PROMPT_PATTERNS
): ApprovalPromptMatch | null {
  const tail = screenTail(lines)
  let first: ApprovalPromptMatch | null = null
  for (let index = tail.length - 1; index >= 0; index--) {
    const line = tail[index]
    const entry = patterns.find((candidate) => candidate.pattern.test(line))
    if (!entry) continue
    const match = { tool: entry.tool, line }
    if (line.includes('?')) return match
    first ??= match
  }
  return first
}
