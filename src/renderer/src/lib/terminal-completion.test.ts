import { describe, expect, it } from 'vitest'
import { buildTerminalCompletionSuggestions, getTerminalCompletionSuffix } from './terminal-completion'
import type { CommandDefinition } from '../../../shared/command-schema'

const commands: CommandDefinition[] = [
  {
    id: 'openclaw-gateway',
    name: 'openclaw gateway',
    executable: 'openclaw',
    description: 'Gateway command',
    category: 'openclaw'
  },
  {
    id: 'openclaw-gateway-start',
    name: 'openclaw gateway start',
    executable: 'openclaw',
    description: 'Start gateway',
    category: 'openclaw'
  }
]

describe('terminal-completion helpers', () => {
  it('suggests command completions from command definitions', () => {
    expect(buildTerminalCompletionSuggestions('openclaw ga', [], commands).map((entry) => entry.value)).toEqual([
      'openclaw gateway',
      'openclaw gateway start'
    ])
  })

  it('prefers matching command history over generic command suggestions', () => {
    expect(buildTerminalCompletionSuggestions('npm ru', ['npm run dev'], commands)[0]).toEqual({
      value: 'npm run dev',
      source: 'history'
    })
  })

  it('returns only the missing completion suffix for inline hints', () => {
    expect(getTerminalCompletionSuffix('openclaw ga', 'openclaw gateway')).toBe('teway')
    expect(getTerminalCompletionSuffix('deploy', 'npm run deploy')).toBe('')
  })
})
