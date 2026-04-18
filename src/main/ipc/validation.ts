import type { SSHProjectWorkspaceTarget } from '../../shared/project-schema'
import type { AIActionRequest } from '../../shared/ai-schema'

function invalid(name: string, expected: string): never {
  throw new Error(`Invalid ${name}: expected ${expected}`)
}

export function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    invalid(name, 'string')
  }
  return value
}

export function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined
  return requireString(value, name)
}

export function nullableString(value: unknown, name: string): string | null {
  if (value === null) return null
  return requireString(value, name)
}

export function optionalBoolean(value: unknown, name: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    invalid(name, 'boolean')
  }
  return value
}

export function requireInteger(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    invalid(name, 'integer')
  }
  return value
}

export function nullableInteger(value: unknown, name: string): number | null {
  if (value === null) return null
  return requireInteger(value, name)
}

export function requirePlainObject<T extends Record<string, unknown> = Record<string, unknown>>(
  value: unknown,
  name: string
): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalid(name, 'object')
  }
  return value as T
}

export function optionalStringRecord(
  value: unknown,
  name: string
): Record<string, string> | undefined {
  if (value === undefined) return undefined
  const record = requirePlainObject(value, name)
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== 'string') {
      invalid(`${name}.${key}`, 'string')
    }
  }
  return record as Record<string, string>
}

const AI_ACTION_TYPES = [
  'command-review',
  'command-explain',
  'command-help',
  'command-generation',
  'command-tree-generation',
  'output-review',
  'artifact-improvement',
  'chat-followup'
] as const

export function requireAIActionRequest(value: unknown, name: string): AIActionRequest {
  const obj = requirePlainObject<Record<string, unknown>>(value, name)
  if (typeof obj.action !== 'string' || !AI_ACTION_TYPES.includes(obj.action as AIActionRequest['action'])) {
    invalid(`${name}.action`, `one of: ${AI_ACTION_TYPES.join(', ')}`)
  }
  return obj as unknown as AIActionRequest
}

export function requireSSHWorkspaceTarget(
  value: unknown,
  name = 'target'
): SSHProjectWorkspaceTarget {
  const target = requirePlainObject<Record<string, unknown>>(value, name)

  if (target.type !== 'ssh') {
    invalid(`${name}.type`, `'ssh'`)
  }

  return {
    type: 'ssh',
    host: requireString(target.host, `${name}.host`),
    user: requireString(target.user, `${name}.user`),
    port: nullableInteger(target.port, `${name}.port`),
    cwd: requireString(target.cwd, `${name}.cwd`),
    identityFile: nullableString(target.identityFile, `${name}.identityFile`),
    label: nullableString(target.label, `${name}.label`),
    vncPort: nullableInteger(target.vncPort, `${name}.vncPort`)
  }
}
