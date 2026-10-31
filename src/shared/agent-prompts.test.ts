import { describe, expect, it } from 'vitest'
import { APPROVAL_PROMPT_PATTERNS, matchApprovalPrompt, screenTail } from './agent-prompts'

// One real-looking screen line per table row, in table order. A new row needs a new line here.
const EXAMPLES: Array<{ tool: string; line: string }> = [
  { tool: 'Claude Code', line: ' Do you want to proceed?' },
  { tool: 'Claude Code', line: '   3. No, and tell Claude what to do differently (esc)' },
  { tool: 'Codex', line: 'Would you like to run the following command?' },
  { tool: 'Codex', line: 'Do you want to approve network access to "example.com"?' },
  { tool: 'Codex', line: '  No, and tell Codex what to do differently' },
  { tool: 'Gemini CLI', line: 'Apply this change?' },
  { tool: 'Gemini CLI', line: 'Allow execution of [rm]?' },
  { tool: 'Aider', line: 'Run shell command? (Y)es/(N)o/(D)on\'t ask again [Yes]:' },
  { tool: 'Copilot CLI', line: '3. No, and tell Copilot what to do differently (Esc)' },
  { tool: 'OpenCode', line: 'Allow once   Always allow   Reject' },
  { tool: 'Cursor CLI', line: 'Run this command? Run (once) (y)  Skip (n)' },
  { tool: 'generic', line: 'Overwrite existing file? (y/n)' },
  { tool: 'generic', line: 'Press Enter to continue' },
  { tool: 'generic', line: 'Need to install the following packages: Ok to proceed? (y)' },
  { tool: 'generic', line: 'Allow the agent to edit 3 files?' },
  { tool: 'generic', line: 'Do you want to continue? [Y/n]' }
]

describe('APPROVAL_PROMPT_PATTERNS', () => {
  it('has one example per row', () => {
    expect(EXAMPLES).toHaveLength(APPROVAL_PROMPT_PATTERNS.length)
  })

  APPROVAL_PROMPT_PATTERNS.forEach((row, index) => {
    it(`row ${index} (${row.tool}) matches its example`, () => {
      const example = EXAMPLES[index]
      expect(example.tool).toBe(row.tool)
      expect(row.pattern.test(example.line)).toBe(true)
    })
  })

  it('does not match ordinary output', () => {
    const lines = [
      '$ npm test',
      ' ✓ src/shared/attention.test.ts (12 tests) 5ms',
      'Compiled successfully in 1.2s',
      'Listening on http://localhost:3000',
      '⏺ Reading 3 files…',
      'Allowed origins: *',
      'yes/no answers are stored in answers.json'
    ]
    expect(matchApprovalPrompt(lines)).toBeNull()
  })
})

describe('matchApprovalPrompt', () => {
  it('prefers the question over the option lines below it', () => {
    const screen = [
      '╭───────────────────────────────╮',
      '│ Bash command                  │',
      '│   rm -rf build                │',
      '│ Do you want to proceed?       │',
      '│ ❯ 1. Yes                      │',
      "│   2. Yes, and don't ask again │",
      '│   3. No, and tell Claude what to do differently (esc) │',
      '╰───────────────────────────────╯',
      '',
      ''
    ]
    expect(matchApprovalPrompt(screen)).toEqual({ tool: 'Claude Code', line: '│ Do you want to proceed?       │' })
  })

  it('ignores a prompt that scrolled out of the last lines', () => {
    const screen = ['Continue? (y/n)', ...Array.from({ length: 12 }, (_, i) => `line ${i}`)]
    expect(matchApprovalPrompt(screen)).toBeNull()
  })

  it('keeps only the last non-empty lines, without trailing blanks', () => {
    expect(screenTail(['a  ', '', '  ', 'b', 'c'], 2)).toEqual(['b', 'c'])
  })
})
