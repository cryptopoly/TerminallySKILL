import { COMMAND_ANCHOR_OSC, commandAnchor, type ShellIntegrationEvent } from '../shared/shell-integration'
import { isWorkflowStepMarkerLine } from '../shared/workflow-shell'

export const SHELL_READY_MARKER = '\x1b]7337;ready\x07'
export const SHELL_READY_RE = /\x1b\]7337;ready\x07/g
export const SHELL_EVENT_RE = /\x1b\]7337;shell;([^;\x07]+)(?:;([^;\x07]*))?(?:;([^;\x07]*))?\x07/g
export const WORKFLOW_STEP_RESULT_RE = /\x1b\]7337;workflow-step;([^;\x07]+);([^;\x07]+);(-?\d+)\x07/g
/**
 * The zsh/bash step-marker command line, whose echo the main process removes. PowerShell's step line
 * (__TvStep) is erased by the shell itself: ConPTY keeps its own copy of the screen and redraws it, so
 * text taken out of the stream here would leave the two out of step.
 */
export const STEP_MARKER_COMMAND_RE = /printf '\\033\]7337;workflow-step;[^\r\n]*/
export const MAX_OUTPUT_BUFFER_BYTES = 10 * 1024 * 1024
export const TARGET_OUTPUT_BUFFER_BYTES = 8 * 1024 * 1024

/**
 * Strip ANSI/xterm escape sequences from raw PTY output for clean log text.
 */
export function stripAnsi(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/\x1b\][^\x1b]*\x1b\\/g, '')
    .replace(/\x1b[()][A-Z0-9]/g, '')
    .replace(/\x1b[>=]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '')
}

export function appendOutputChunk(
  outputBuffer: string[],
  outputBufferSize: number,
  chunk: string
): { outputBuffer: string[]; outputBufferSize: number } {
  // Mutates in place: copying the whole array per chunk made output cost grow with buffer length
  outputBuffer.push(chunk)
  let nextSize = outputBufferSize + chunk.length

  if (nextSize > MAX_OUTPUT_BUFFER_BYTES) {
    let dropCount = 0
    while (nextSize > TARGET_OUTPUT_BUFFER_BYTES && dropCount < outputBuffer.length - 1) {
      nextSize -= outputBuffer[dropCount].length
      dropCount += 1
    }
    if (dropCount > 0) outputBuffer.splice(0, dropCount)
  }

  return { outputBuffer, outputBufferSize: nextSize }
}

function decodeShellPayload(payload: string | undefined): string | null {
  if (!payload) return null
  const decoded = Buffer.from(payload, 'base64').toString('utf8')
  return decoded.length > 0 ? decoded : null
}

export function extractShellIntegrationEvents(data: string): {
  data: string
  sawMarker: boolean
  events: ShellIntegrationEvent[]
} {
  let sawMarker = false
  const events: ShellIntegrationEvent[] = []
  let cleaned = data

  if (cleaned.includes(SHELL_READY_MARKER)) {
    sawMarker = true
    cleaned = cleaned.replace(SHELL_READY_RE, '')
  }

  cleaned = cleaned.replace(
    SHELL_EVENT_RE,
    (_match, type: string, payload1: string | undefined, payload2: string | undefined) => {
      if (type === 'prompt-ready') {
        sawMarker = true
        // New format: prompt-ready;EXIT_CODE;BASE64_CWD
        // Old format: prompt-ready;BASE64_CWD
        let exitCode: number | null = null
        let cwd: string | null = null
        if (payload2 !== undefined) {
          // New format — payload1 is exit code, payload2 is base64 cwd
          const parsed = parseInt(payload1 ?? '', 10)
          exitCode = Number.isFinite(parsed) ? parsed : null
          cwd = decodeShellPayload(payload2)
        } else {
          // Old format — payload1 is base64 cwd
          cwd = decodeShellPayload(payload1)
        }
        events.push({
          type: 'prompt-ready',
          cwd,
          exitCode,
          receivedAt: new Date().toISOString()
        })
        return commandAnchor(`end;${exitCode ?? ''}`)
      }

      if (type === 'command-start') {
        const command = decodeShellPayload(payload1)
        if (command?.trim()) {
          events.push({
            type: 'command-start',
            command,
            receivedAt: new Date().toISOString()
          })
          return commandAnchor(`start;${payload1}`)
        }
        return ''
      }

      return ''
    }
  )

  if (!sawMarker && events.length === 0) {
    return { data, sawMarker: false, events: [] }
  }

  return {
    data: cleaned,
    sawMarker,
    events
  }
}

const MARKER_PREFIX = '\x1b]7337;'
const MAX_MARKER_LENGTH = 1024

/**
 * PTY reads can end in the middle of a marker. Hold a trailing unterminated marker back so the
 * next chunk can complete it; otherwise a split marker leaks into the terminal and is lost.
 */
export function splitIncompleteMarker(data: string): { complete: string; tail: string } {
  const start = data.lastIndexOf(MARKER_PREFIX)
  if (start === -1) {
    // A bare ESC (or a prefix of it) at the very end may be the start of a marker
    for (let keep = Math.min(MARKER_PREFIX.length - 1, data.length); keep > 0; keep--) {
      if (data.endsWith(MARKER_PREFIX.slice(0, keep))) {
        return { complete: data.slice(0, -keep), tail: data.slice(-keep) }
      }
    }
    return { complete: data, tail: '' }
  }
  if (data.indexOf('\x07', start) !== -1 || data.length - start > MAX_MARKER_LENGTH) {
    return { complete: data, tail: '' }
  }
  return { complete: data.slice(0, start), tail: data.slice(start) }
}

/**
 * Remove the terminal's echo of the step-marker command line ("printf '\\033]7337;workflow-step;...").
 * Only a whole line, up to its newline: readline in macOS bash 3.2 wraps a long line with " \r" instead
 * of a newline, and draws it over several chunks. A line cut short here is left to MarkerEchoFilter.
 * The line never takes a command anchor with it, so the prompt's end mark stays.
 */
export function stripWorkflowMarkerEcho(data: string): string {
  if (!data.includes('workflow-step;')) return data
  return data.replace(/[^\r\n]*printf '\\033\]7337;workflow-step;[^\n]*\n/g, (line) => line.match(ANCHOR_RE)?.join('') ?? '')
}

const MARKER_ECHO_UNIQUE = 'workflow-step;'
const ECHO_ESCAPE_RE = /\x1b(?:\[[0-?]*[ -/]*[@-~]|[()][A-Z0-9]|[@-Z\\-_=>])/y
const ANCHOR_PREFIX = `\x1b]${COMMAND_ANCHOR_OSC};`
const ANCHOR_RE = new RegExp(`\\x1b\\]${COMMAND_ANCHOR_OSC};(start|end);([^\\x07]*)\\x07`, 'g')

type MarkerEchoPhase = 'idle' | 'waiting-step' | 'running' | 'prompt'

/**
 * Removes the shell's echoes of a typed-ahead step marker. Works on the command anchors in the stream:
 * - While the step runs, the terminal echoes the typed-ahead marker as plain text. That copy is matched
 *   by its start and dropped through to its newline.
 * - At the step's prompt the line editor (zsh ZLE, readline) draws the prompt and the marker again, a
 *   few characters per chunk and, when the line wraps, with carriage returns and redrawn characters in
 *   between. Everything from the prompt's end anchor is held until the next command starts: when that
 *   command is the marker, the held prompt and line are dropped; anything else is given back.
 * The caller flushes held text after a short wait, so a program's output or a user's typing is never lost.
 */
export class MarkerEchoFilter {
  private expected: string | null = null
  private phase: MarkerEchoPhase = 'idle'
  private matched = 0
  private held = ''
  private swallowingLineEnd = false
  private promptShown = false
  private markerRunning = false

  /** Only the start of the marker is matched in the terminal's echo: it cannot be anything else. */
  arm(markerCommand: string): void {
    const unique = markerCommand.indexOf(MARKER_ECHO_UNIQUE)
    this.expected = unique === -1 ? markerCommand : markerCommand.slice(0, unique + MARKER_ECHO_UNIQUE.length)
    this.phase = 'waiting-step'
    this.matched = 0
    this.promptShown = false
  }

  get hasHeld(): boolean {
    return this.held.length > 0
  }

  flush(): string {
    const held = this.held
    this.held = ''
    this.matched = 0
    if (held && this.phase === 'prompt') this.promptShown = true
    return held
  }

  push(data: string): string {
    if (this.phase === 'idle' && !this.swallowingLineEnd && !this.held) {
      if (data.includes(ANCHOR_PREFIX)) {
        for (const anchor of data.matchAll(ANCHOR_RE)) this.noteAnchor(anchor[1], anchor[2])
      }
      return data
    }
    let out = ''
    let last = 0
    for (const anchor of data.matchAll(ANCHOR_RE)) {
      out += this.pushText(data.slice(last, anchor.index))
      out += this.pushAnchor(anchor[1], anchor[2], anchor[0])
      last = anchor.index + anchor[0].length
    }
    return out + this.pushText(data.slice(last))
  }

  private disarm(): void {
    this.phase = 'idle'
    this.expected = null
  }

  /** True for the prompt a marker draws once it ran; it can come after the next step was typed. */
  private noteAnchor(kind: string, payload: string): boolean {
    const markerPrompt = kind === 'end' && this.markerRunning
    this.markerRunning = kind === 'start' && isMarkerPayload(payload)
    return markerPrompt
  }

  private pushAnchor(kind: string, payload: string, anchor: string): string {
    const markerPrompt = this.noteAnchor(kind, payload)
    if (this.phase === 'waiting-step') {
      if (kind === 'start' && !this.markerRunning) this.phase = 'running'
      // An empty step has no start of its own, only its prompt
      if (kind !== 'end' || markerPrompt) return anchor
    }
    if (this.phase === 'running' || this.phase === 'waiting-step') {
      if (kind !== 'end') return anchor
      const pending = this.flush()
      this.swallowingLineEnd = false
      this.phase = 'prompt'
      this.promptShown = false
      return pending + anchor
    }
    if (this.phase === 'prompt') {
      const shown = this.promptShown
      const held = this.flush()
      this.disarm()
      if (kind === 'start' && isMarkerPayload(payload)) {
        // Part of the prompt went out before the marker came: clear its row
        return (shown ? '\r\x1b[K' : '') + anchor
      }
      return held + anchor
    }
    return anchor
  }

  private pushText(data: string): string {
    if (!data) return ''
    if (this.phase === 'prompt') {
      this.held += data
      return ''
    }
    return this.matchEcho(data)
  }

  private matchEcho(data: string): string {
    let out = ''
    let i = 0
    while (i < data.length) {
      if (this.swallowingLineEnd) {
        const newline = data.indexOf('\n', i)
        if (newline === -1) return out
        this.swallowingLineEnd = false
        i = newline + 1
        continue
      }
      if (!this.expected) {
        out += this.flush() + data.slice(i)
        return out
      }
      const char = data[i]
      if (this.matched > 0 && char === '\x1b') {
        ECHO_ESCAPE_RE.lastIndex = i
        const escape = ECHO_ESCAPE_RE.exec(data)
        if (escape) {
          this.held += escape[0]
          i += escape[0].length
          continue
        }
      }
      if (char === this.expected[this.matched]) {
        this.held += char
        this.matched += 1
        i += 1
        if (this.matched === this.expected.length) {
          this.held = ''
          this.matched = 0
          this.swallowingLineEnd = true
        }
        continue
      }
      if (this.matched > 0) {
        out += this.flush()
        continue
      }
      out += char
      i += 1
    }
    return out
  }
}

function isMarkerPayload(payload: string): boolean {
  return isWorkflowStepMarkerLine(decodeShellPayload(payload) ?? '')
}

export function extractWorkflowStepResults(data: string): {
  data: string
  results: Array<{
    runId: string
    stepId: string
    exitCode: number
  }>
} {
  const results: Array<{
    runId: string
    stepId: string
    exitCode: number
  }> = []

  const cleaned = data.replace(
    WORKFLOW_STEP_RESULT_RE,
    (_match, runId: string, stepId: string, exitCodeRaw: string) => {
      results.push({
        runId,
        stepId,
        exitCode: Number(exitCodeRaw)
      })
      return ''
    }
  )

  return {
    data: cleaned,
    results
  }
}

export function prepareLogContent(outputBuffer: string[], trimmed = false): string | null {
  let content = stripAnsi(outputBuffer.join(''))
  // When old chunks were dropped, the first kept line may start mid-token; a secret cut in half
  // no longer matches a mask pattern, so drop that partial line.
  if (trimmed) {
    const newline = content.indexOf('\n')
    content = newline >= 0 ? content.slice(newline + 1) : ''
  }
  return content.trim().length > 0 ? content : null
}
