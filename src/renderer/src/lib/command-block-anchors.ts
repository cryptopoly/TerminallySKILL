import type { IMarker } from '@xterm/xterm'

interface AnchorTerminal {
  buffer: { active: { cursorX: number } }
  registerMarker(cursorYOffset?: number): IMarker
}

/**
 * Both command anchors belong at the start of a line: the shell writes command-start after the newline
 * that accepts the command, and prompt-ready just before the prompt. Some Windows ConPTY builds pass an
 * anchor through before they draw what was written just before it, so it can arrive while the cursor still
 * sits at the end of the command or of the last output line, the line break not drawn yet. When anchors
 * may lag that way, one that arrives mid-line belongs to the next line.
 */
export function commandAnchorLineOffset(cursorX: number, anchorsMayLag: boolean): number {
  return anchorsMayLag && cursorX > 0 ? 1 : 0
}

/** Markers for the line of the typed command (where the mark is drawn) and the first line of its output */
export function markCommandStart(
  terminal: AnchorTerminal,
  anchorsMayLag: boolean
): { commandLine: IMarker; outputLine: IMarker } {
  const offset = commandAnchorLineOffset(terminal.buffer.active.cursorX, anchorsMayLag)
  return {
    commandLine: terminal.registerMarker(offset - 1),
    outputLine: terminal.registerMarker(offset)
  }
}

/** Marker for the prompt line that ends the command's output */
export function markCommandEnd(terminal: AnchorTerminal, anchorsMayLag: boolean): IMarker {
  return terminal.registerMarker(commandAnchorLineOffset(terminal.buffer.active.cursorX, anchorsMayLag))
}
