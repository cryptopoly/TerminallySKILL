import { i18n } from '../i18n'
import { resources } from '../i18n/resources'

export interface ExitDiagnosticInput {
  title?: string | null
  commandString?: string | null
  exitCode: number | null
  error?: string | null
  shell?: string | null
}

export interface ExitDiagnostics {
  summary: string
  suspectedIssues: string[]
  nextChecks: string[]
}

type Options = Record<string, string | number>

function lookupEnglish(key: string): string {
  let node: unknown = (resources.en as unknown as Record<string, unknown>).logs
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown> | undefined)?.[part]
  }
  return typeof node === 'string' ? node : key
}

// Falls back to the English resources when i18n has not been initialized (e.g. in unit tests).
function tr(key: string, options: Options = {}): string {
  if (i18n.isInitialized) return i18n.t(`diagnostics.${key}`, { ns: 'logs', ...options })
  return lookupEnglish(`diagnostics.${key}`).replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(options[name] ?? '')
  )
}

function unique(items: string[]): string[] {
  return [...new Set(items.filter(Boolean))]
}

function buildGenericSuspicions(exitCode: number): string[] {
  switch (exitCode) {
    case 1:
      return [tr('suspect.exit1a'), tr('suspect.exit1b')]
    case 126:
      return [tr('suspect.exit126a'), tr('suspect.exit126b')]
    case 127:
      return [tr('suspect.exit127a'), tr('suspect.exit127b')]
    case 130:
      return [tr('suspect.exit130')]
    case 137:
      return [tr('suspect.exit137')]
    case 143:
      return [tr('suspect.exit143')]
    default:
      return [tr('suspect.exitDefault')]
  }
}

function buildGenericChecks(exitCode: number, shell?: string | null): string[] {
  const checks = [tr('check.openLog'), tr('check.rerun')]

  if (exitCode === 127) {
    checks.push(tr('check.path'))
  }

  if (exitCode === 126) {
    checks.push(tr('check.permissions'))
  }

  if (shell) {
    checks.push(tr('check.shell', { shell }))
  }

  return unique(checks)
}

function buildCommandSpecificSuspicions(command: string, error?: string | null): string[] {
  const normalized = command.toLowerCase()
  const normalizedError = error?.toLowerCase() ?? ''
  const issues: string[] = []

  if (normalized.includes('npm run package:mac') || normalized.includes('electron-builder --mac')) {
    issues.push(tr('suspect.macPackaging1'), tr('suspect.macPackaging2'), tr('suspect.macPackaging3'))
  }

  if (normalized.includes('npm run build') || normalized.includes('vite build') || normalized.includes('tsc')) {
    issues.push(tr('suspect.build1'), tr('suspect.build2'))
  }

  if (normalized.startsWith('npm ') || normalized.includes(' npm ')) {
    issues.push(tr('suspect.npm1'), tr('suspect.npm2'))
  }

  if (normalized.includes('.sh') || normalized.startsWith('bash ') || normalized.startsWith('sh ')) {
    issues.push(tr('suspect.shell'))
  }

  if (normalized.startsWith('python') || normalized.includes(' python')) {
    issues.push(tr('suspect.python'))
  }

  if (normalizedError.includes('codesign') || normalizedError.includes('notar')) {
    issues.unshift(tr('suspect.signing'))
  }

  if (normalizedError.includes('command not found')) {
    issues.unshift(tr('suspect.notFound'))
  }

  return unique(issues)
}

function buildCommandSpecificChecks(command: string): string[] {
  const normalized = command.toLowerCase()
  const checks: string[] = []

  if (normalized.includes('package:mac') || normalized.includes('electron-builder --mac')) {
    checks.push(tr('check.macPackaging1'), tr('check.macPackaging2'))
  }

  if (normalized.startsWith('npm ') || normalized.includes(' npm ')) {
    checks.push(tr('check.npm1'), tr('check.npm2'))
  }

  return unique(checks)
}

export function buildExitDiagnostics(input: ExitDiagnosticInput): ExitDiagnostics | null {
  if (input.exitCode === null) return null

  const summary =
    input.exitCode === 0
      ? tr('summary.success')
      : input.commandString
        ? tr('summary.command', { command: input.commandString, code: input.exitCode })
        : tr('summary.title', { title: input.title ?? tr('summary.fallbackTitle'), code: input.exitCode })

  const suspectedIssues = unique([
    ...buildGenericSuspicions(input.exitCode),
    ...(input.commandString ? buildCommandSpecificSuspicions(input.commandString, input.error) : [])
  ])

  const nextChecks = unique([
    ...buildGenericChecks(input.exitCode, input.shell),
    ...(input.commandString ? buildCommandSpecificChecks(input.commandString) : [])
  ])

  return {
    summary,
    suspectedIssues,
    nextChecks
  }
}
