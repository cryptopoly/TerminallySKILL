import type { CommandDefinition } from '../../../../shared/command-schema'

export interface TerminalCompletionSuggestion {
  value: string
  source: 'history' | 'command' | 'directory'
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function getCompletionScore(input: string, candidate: string): number | null {
  const normalizedInput = normalize(input)
  const normalizedCandidate = normalize(candidate)

  if (!normalizedInput || normalizedCandidate === normalizedInput) {
    return null
  }

  if (normalizedCandidate.startsWith(normalizedInput)) {
    return 0
  }

  const inputTokens = normalizedInput.split(/\s+/).filter(Boolean)
  const candidateTokens = normalizedCandidate.split(/\s+/).filter(Boolean)

  if (inputTokens.length > 1 && candidateTokens.length >= inputTokens.length) {
    const head = inputTokens.slice(0, -1)
    const lastToken = inputTokens[inputTokens.length - 1]
    const candidateHead = candidateTokens.slice(0, head.length)

    const prefixMatches = head.every((token, index) => candidateHead[index] === token)
    if (prefixMatches && candidateTokens[head.length]?.startsWith(lastToken)) {
      return 1
    }
  }

  if (normalizedCandidate.includes(normalizedInput)) {
    return 2
  }

  return null
}

function buildCommandCandidates(commands: CommandDefinition[]): string[] {
  const values = new Set<string>()

  for (const command of commands) {
    values.add(command.name)
    values.add(command.executable)
    if (command.subcommands?.length) {
      values.add(`${command.executable} ${command.subcommands.join(' ')}`)
    }
  }

  return Array.from(values).filter((value) => value.trim().length > 0)
}

export function buildTerminalCompletionSuggestions(
  input: string,
  history: string[],
  commands: CommandDefinition[],
  limit = 5
): TerminalCompletionSuggestion[] {
  const normalizedInput = normalize(input)
  if (!normalizedInput) return []

  const suggestions: Array<TerminalCompletionSuggestion & { score: number; index: number }> = []
  const seen = new Set<string>()

  history.forEach((candidate, index) => {
    const score = getCompletionScore(input, candidate)
    const normalizedCandidate = normalize(candidate)
    if (score === null || seen.has(normalizedCandidate)) return
    seen.add(normalizedCandidate)
    suggestions.push({ value: candidate, source: 'history', score, index })
  })

  buildCommandCandidates(commands).forEach((candidate, index) => {
    const score = getCompletionScore(input, candidate)
    const normalizedCandidate = normalize(candidate)
    if (score === null || seen.has(normalizedCandidate)) return
    seen.add(normalizedCandidate)
    suggestions.push({ value: candidate, source: 'command', score, index })
  })

  return suggestions
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      if (a.source !== b.source) return a.source === 'history' ? -1 : 1
      if (a.value.length !== b.value.length) return a.value.length - b.value.length
      return a.index - b.index
    })
    .slice(0, limit)
    .map(({ value, source }) => ({ value, source }))
}

export function getTerminalCompletionSuffix(input: string, suggestion: string): string {
  const normalizedInput = input.trim()
  if (!normalizedInput) return ''

  return suggestion.toLowerCase().startsWith(normalizedInput.toLowerCase())
    ? suggestion.slice(normalizedInput.length)
    : ''
}
