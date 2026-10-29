import type { ShellIntegrationEvent } from '../shared/shell-integration'

export const SHELL_READY_MARKER = '\x1b]7337;ready\x07'
export const SHELL_READY_RE = /\x1b\]7337;ready\x07/g
export const SHELL_EVENT_RE = /\x1b\]7337;shell;([^;\x07]+)(?:;([^;\x07]*))?(?:;([^;\x07]*))?\x07/g
export const WORKFLOW_STEP_RESULT_RE = /\x1b\]7337;workflow-step;([^;\x07]+);([^;\x07]+);(-?\d+)\x07/g
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
        return ''
      }

      if (type === 'command-start') {
        const command = decodeShellPayload(payload1)
        if (command?.trim()) {
          events.push({
            type: 'command-start',
            command,
            receivedAt: new Date().toISOString()
          })
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

/** Remove the terminal's echo of the step-marker command line ("printf '\\033]7337;workflow-step;...") */
export function stripWorkflowMarkerEcho(data: string): string {
  if (!data.includes('workflow-step;')) return data
  return data.replace(/[^\r\n]*printf '\\033\]7337;workflow-step;[^\r\n]*(\r?\n)?/g, '')
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
