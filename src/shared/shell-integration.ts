export interface ShellPromptReadyEvent {
  type: 'prompt-ready'
  cwd: string | null
  exitCode: number | null
  receivedAt: string
}

export interface ShellCommandStartEvent {
  type: 'command-start'
  command: string
  receivedAt: string
}

export type ShellIntegrationEvent = ShellPromptReadyEvent | ShellCommandStartEvent

/**
 * OSC number of the invisible anchor left in terminal output where a command starts and where its prompt
 * returns, so the terminal view can mark command blocks at the exact line.
 * Payloads: `start;BASE64_COMMAND` and `end;EXIT_CODE` (exit code may be empty).
 */
export const COMMAND_ANCHOR_OSC = 7338

export function commandAnchor(payload: string): string {
  return `\x1b]${COMMAND_ANCHOR_OSC};${payload}\x07`
}
