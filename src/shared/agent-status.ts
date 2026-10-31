/**
 * Parsers for the escape sequences programs (coding agents above all) use to ask a terminal for
 * attention: OSC 9 (iTerm2 notification), OSC 777;notify (urxvt / foot / Ghostty) and the
 * OSC 7501 Program Status Protocol. Everything here is terminal output, so it is untrusted:
 * the text is cleaned, shortened and only ever shown as plain text.
 */
import type { AgentActivity, AttentionKind } from './attention'

export const AGENT_TEXT_MAX_LENGTH = 140
/** OSC payloads longer than this are dropped before any parsing. */
export const OSC_PAYLOAD_MAX_LENGTH = 4096
/** Reply to `OSC 7501 ; ? ST`: "supported", with the default state and kind lists. */
export const OSC_7501_SUPPORT_REPLY = '\x1b]7501;?\x1b\\'

export type AgentSignal =
  | { type: 'query' }
  | { type: 'alert'; kind: AttentionKind; source: 'notify' | 'status'; title: string; body: string }

// C0, DEL, C1 controls, plus bidi overrides/isolates that can make text read differently than it is.
const UNSAFE_CHARS_RE = /[\u0000-\u001f\u007f-\u009f‪-‮⁦-⁩]/g
const TAG_RE = /<[^>]*>/g

/** Plain single-line text: no control characters, no markup, at most `max` characters. */
export function sanitizeAgentText(text: string, max = AGENT_TEXT_MAX_LENGTH): string {
  const plain = text
    .slice(0, OSC_PAYLOAD_MAX_LENGTH)
    .replace(UNSAFE_CHARS_RE, ' ')
    .replace(TAG_RE, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain
}

/** OSC 9 ; message. ConEmu reuses OSC 9 with a numeric sub-command (9;4 is a progress bar), so skip those. */
export function parseOsc9(data: string): AgentSignal | null {
  if (data.length > OSC_PAYLOAD_MAX_LENGTH) return null
  if (/^\d+(;|$)/.test(data)) return null
  const body = sanitizeAgentText(data)
  if (!body) return null
  return { type: 'alert', kind: 'approval', source: 'notify', title: '', body }
}

/** OSC 777 ; notify ; title ; body */
export function parseOsc777(data: string): AgentSignal | null {
  if (data.length > OSC_PAYLOAD_MAX_LENGTH) return null
  const [command, title = '', ...rest] = data.split(';')
  if (command !== 'notify') return null
  const cleanTitle = sanitizeAgentText(title)
  const body = sanitizeAgentText(rest.join(';'))
  if (!cleanTitle && !body) return null
  return { type: 'alert', kind: 'approval', source: 'notify', title: cleanTitle, body }
}

const STATUS_STATES = new Set(['idle', 'working', 'done', 'blocked', 'error', 'clear'])
const STATUS_KIND_BY_STATE: Record<string, AttentionKind> = {
  blocked: 'approval',
  done: 'finished',
  error: 'failed'
}
const MSG_MAX_ENCODED = 2732
const MSG_MAX_DECODED = 2048
const VALUE_RE = /^[A-Za-z0-9_.,+/=-]*$/
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/
const APP_RE = /^[A-Za-z0-9_.+-]{1,32}$/
// Decoded text must not contain C0 or C1 controls (spec: the whole report is discarded).
const DECODED_CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/

function decodeBase64Utf8(value: string): string | null {
  if (value.length > MSG_MAX_ENCODED || !BASE64_RE.test(value)) return null
  try {
    const binary = atob(value)
    if (binary.length > MSG_MAX_DECODED) return null
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

function parseOsc7501Pairs(trimmed: string): Map<string, string> {
  const pairs = new Map<string, string>()
  for (const raw of trimmed.split(':')) {
    const eq = raw.indexOf('=')
    if (eq <= 0) continue
    const key = raw.slice(0, eq).trim()
    const value = raw.slice(eq + 1).trim()
    if (!/^[a-z]{1,16}$/.test(key) || !VALUE_RE.test(value)) continue
    pairs.set(key, value)
  }
  return pairs
}

/**
 * Whether an OSC 7501 report says the program is working. Every other known state (idle, done,
 * blocked, error, clear) means it is not; queries and malformed reports give null.
 */
export function parseOsc7501Activity(data: string): AgentActivity | null {
  if (data.length > OSC_PAYLOAD_MAX_LENGTH) return null
  const state = parseOsc7501Pairs(data.trim()).get('state')
  if (!state || !STATUS_STATES.has(state)) return null
  return state === 'working' ? 'working' : 'idle'
}

/**
 * OSC 7501 ; key=value:key=value ST (Program Status Protocol). Returns a query for `?`, an alert
 * for the states that need the user (blocked, done, error), and null for everything else,
 * including malformed reports. Record ids are not modelled: the terminal has one status.
 */
export function parseOsc7501(data: string): AgentSignal | null {
  if (data.length > OSC_PAYLOAD_MAX_LENGTH) return null
  const trimmed = data.trim()
  if (trimmed === '?' || trimmed.startsWith('?:')) return { type: 'query' }

  const pairs = parseOsc7501Pairs(trimmed)
  const state = pairs.get('state')
  if (!state || !STATUS_STATES.has(state)) return null

  let message = ''
  const encoded = pairs.get('msg')
  if (encoded) {
    const decoded = decodeBase64Utf8(encoded)
    if (decoded === null || DECODED_CONTROL_RE.test(decoded)) return null
    message = decoded
  }

  const kind = STATUS_KIND_BY_STATE[state]
  if (!kind) return null

  const app = pairs.get('app')
  const appName = app && APP_RE.test(app) ? app : ''
  const text = sanitizeAgentText(message)
  const body = appName && text ? `${appName}: ${text}` : appName || text
  return { type: 'alert', kind, source: 'status', title: '', body: sanitizeAgentText(body) }
}
