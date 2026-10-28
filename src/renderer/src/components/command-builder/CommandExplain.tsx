import { useTranslation } from 'react-i18next'
import type { CommandDefinition } from '../../../../shared/command-schema'

interface CommandExplainProps {
  command: CommandDefinition
  values: Record<string, unknown>
  commandString: string
}

interface Segment {
  text: string
  kind: 'executable' | 'subcommand' | 'flag' | 'value' | 'positional'
  label?: string
  description?: string
}

export function CommandExplain({ command, values, commandString }: CommandExplainProps): JSX.Element {
  const { t } = useTranslation('commandBuilder')
  const segments = parseSegments(command, values, commandString, {
    command: t('explainSegments.command'),
    subcommand: t('explainSegments.subcommand')
  })

  return (
    <div className="mb-3 p-3 rounded-lg bg-surface-light border border-surface-border">
      <div className="flex flex-wrap gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex flex-col items-start">
            <span className={segmentClass(seg.kind)}>{seg.text}</span>
            {seg.label && (
              <span className="text-[10px] text-gray-500 mt-0.5 max-w-[140px] truncate">
                {seg.label}
              </span>
            )}
          </div>
        ))}
      </div>
      {segments.some((s) => s.description) && (
        <div className="mt-3 pt-2 border-t border-surface-border space-y-1.5">
          {segments
            .filter((s) => s.description)
            .map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <code className={segmentClass(s.kind) + ' shrink-0'}>{s.text}</code>
                <span className="text-gray-400">{s.description}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function segmentClass(kind: Segment['kind']): string {
  const base = 'px-1.5 py-0.5 rounded font-mono text-xs'
  switch (kind) {
    case 'executable':
      return `${base} bg-accent/20 text-accent-light font-semibold`
    case 'subcommand':
      return `${base} bg-accent/10 text-accent-light`
    case 'flag':
      return `${base} bg-caution/15 text-caution`
    case 'value':
      return `${base} bg-safe/15 text-safe`
    case 'positional':
      return `${base} bg-blue-500/15 text-blue-400`
  }
}

function parseSegments(
  command: CommandDefinition,
  values: Record<string, unknown>,
  commandString: string,
  labels: { command: string; subcommand: string }
): Segment[] {
  const segments: Segment[] = []

  // Executable
  segments.push({
    text: command.executable,
    kind: 'executable',
    label: labels.command,
    description: command.description || undefined
  })

  // Subcommands
  if (command.subcommands) {
    for (const sub of command.subcommands) {
      segments.push({ text: sub, kind: 'subcommand', label: labels.subcommand })
    }
  }

  // Options — match against what's actually in the serialized command
  const opts = [...(command.options || [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  for (const opt of opts) {
    const val = values[opt.id]
    if (val === undefined || val === null || val === '' || val === false) continue
    if (opt.type === 'enum' && val === opt.defaultValue) continue

    const flag = opt.long ?? opt.short
    if (!flag) continue

    if (opt.type === 'boolean') {
      segments.push({
        text: flag,
        kind: 'flag',
        label: opt.label,
        description: opt.description
      })
    } else if (opt.type === 'repeatable' || opt.type === 'multi-select') {
      const arr = val as string[]
      for (const entry of arr) {
        if (!entry) continue
        segments.push({ text: flag, kind: 'flag', label: opt.label, description: opt.description })
        segments.push({ text: entry, kind: 'value' })
      }
    } else {
      segments.push({ text: flag, kind: 'flag', label: opt.label, description: opt.description })
      segments.push({ text: String(val), kind: 'value' })
    }
  }

  // Positional args
  const posArgs = [...(command.positionalArgs || [])].sort((a, b) => a.position - b.position)
  for (const posArg of posArgs) {
    const val = values[posArg.id]
    if (!val) continue
    if (posArg.variadic && Array.isArray(val)) {
      for (const v of val as string[]) {
        if (v) segments.push({ text: v, kind: 'positional', label: posArg.label, description: posArg.description })
      }
    } else if (typeof val === 'string' && val) {
      segments.push({ text: val, kind: 'positional', label: posArg.label, description: posArg.description })
    }
  }

  return segments
}
