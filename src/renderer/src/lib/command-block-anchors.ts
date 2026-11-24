import type { IMarker } from '@xterm/xterm'

interface AnchorTerminal {
  buffer: {
    active: {
      baseY: number
      cursorY: number
      getLine(y: number): { translateToString(trimRight?: boolean): string } | undefined
    }
  }
  registerMarker(cursorYOffset?: number): IMarker
}

/**
 * Both command anchors belong at the start of an empty line: the shell writes command-start after the
 * newline that accepts the command, and prompt-ready just before the prompt. Some Windows ConPTY builds
 * pass an anchor through before they draw what was written just before it, so it can arrive while the
 * cursor is still on the command or on the last output line, the line feed not drawn yet. When anchors
 * may lag that way, one that arrives on a line with text belongs to the next line.
 */
function anchorLineOffset(terminal: AnchorTerminal, anchorsMayLag: boolean): number {
  if (!anchorsMayLag) return 0
  const buffer = terminal.buffer.active
  const text = buffer.getLine(buffer.baseY + buffer.cursorY)?.translateToString(true) ?? ''
  return text.trim().length > 0 ? 1 : 0
}

/** Markers for the line of the typed command (where the mark is drawn) and the first line of its output */
export function markCommandStart(
  terminal: AnchorTerminal,
  anchorsMayLag: boolean
): { commandLine: IMarker; outputLine: IMarker } {
  const offset = anchorLineOffset(terminal, anchorsMayLag)
  return {
    commandLine: terminal.registerMarker(offset - 1),
    outputLine: terminal.registerMarker(offset)
  }
}

/** Marker for the prompt line that ends the command's output */
export function markCommandEnd(terminal: AnchorTerminal, anchorsMayLag: boolean): IMarker {
  return terminal.registerMarker(anchorLineOffset(terminal, anchorsMayLag))
}
