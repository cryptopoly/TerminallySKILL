import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'
import type { IMarker, Terminal as XtermTerminal } from '@xterm/xterm'
import { COMMAND_ANCHOR_OSC } from '../../../shared/shell-integration'
import { markCommandEnd, markCommandStart } from './command-block-anchors'
import { extractCommandTranscriptFromLines } from './terminal-transcript'

// The xterm bundle is CommonJS; Node's ESM loader does not see its named exports
const { Terminal } = createRequire(import.meta.url)('@xterm/xterm') as typeof import('@xterm/xterm')

interface Block {
  commandLine: IMarker
  outputLine: IMarker
  endLine: IMarker
}

const terminals: XtermTerminal[] = []
afterEach(() => {
  terminals.splice(0).forEach((terminal) => terminal.dispose())
})

/** A terminal that places block markers the way TerminalPanel does */
function blockTerminal(anchorsMayLag: boolean, cols = 80, rows = 8) {
  const terminal = new Terminal({ cols, rows, allowProposedApi: true })
  terminals.push(terminal)
  const blocks: Block[] = []
  let pending: Omit<Block, 'endLine'> | null = null
  terminal.parser.registerOscHandler(COMMAND_ANCHOR_OSC, (payload) => {
    const kind = payload.split(';')[0]
    if (kind === 'start') {
      pending = markCommandStart(terminal, anchorsMayLag)
    } else if (kind === 'end' && pending) {
      blocks.push({ ...pending, endLine: markCommandEnd(terminal, anchorsMayLag) })
      pending = null
    }
    return true
  })
  const write = async (chunks: string[]): Promise<void> => {
    for (const chunk of chunks) await new Promise<void>((resolve) => terminal.write(chunk, resolve))
  }
  const line = (index: number): string | undefined => terminal.buffer.active.getLine(index)?.translateToString(true)
  const output = (block: Block): string | null => {
    const lines: string[] = []
    for (let index = 0; index < terminal.buffer.active.length; index += 1) lines.push(line(index) ?? '')
    return extractCommandTranscriptFromLines(lines, block.outputLine.line, block.endLine.line)
  }
  return { blocks, write, line, output }
}

// Captured from Windows PowerShell 5.1 under the inbox ConPTY of a Windows 11 arm64 build (26300), as the
// renderer received it (anchors already rewritten to OSC 7338). Only the long working folder in the prompt
// was shortened, with the cursor moves that depend on its length.

/**
 * Both start anchors arrive before ConPTY draws the line break that accepts the command (the second even
 * before the last typed character), and the first end anchor before the line break after the output.
 */
const CONPTY_SESSION = [
  '\x1b[?25l\x1b[2J\x1b[m\x1b[H\x1b[?25h\x1b]7338;end;0\x07',
  'PS C:\\w> ',
  '\x1b[?25l',
  '\x1b[93mech\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[1;10Hecho \x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[1;10Hecho \x1b[36m"bloc\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[1;10Hecho \x1b[36m"block-$\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[1;10Hecho \x1b[36m"block-\x1b[37m$(\x1b[97m40\x1b[?25h',
  '\x1b[m\x1b[?25l',
  '\x1b[93m\x1b[1;10Hecho \x1b[36m"block-\x1b[37m$(\x1b[97m40\x1b[90m+\x1b[97m2\x1b[37m)\x1b[36m"\x1b[?25h',
  '\x1b]7338;start;ZWNobyAiYmxvY2stJCg0MCsyKSI=\x07',
  '\x1b[m\r\n',
  'block-42',
  '\x1b]7338;end;0\x07',
  '\r\nPS C:\\w> ',
  '\x1b[?25l',
  '\x1b[93mc\x1b[?25h',
  '\x1b[m\x1b[93m\bcmd \x1b[37m/c',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[3;10Hcmd \x1b[37m/c ex\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[3;10Hcmd \x1b[37m/c exit\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[3;10Hcmd \x1b[37m/c exit \x1b[?25h',
  '\x1b]7338;start;Y21kIC9jIGV4aXQgMQ==\x07',
  '\x1b[?25l\x1b[m\x1b[93m\x1b[3;10Hcmd \x1b[37m/c exit \x1b[97m1\r\n\x1b[?25h',
  '\x1b[m',
  '\x1b]7338;end;1\x07',
  'PS C:\\w> '
]

/**
 * A command typed on the bottom line whose output scrolls the screen, then a short one. ConPTY ends each
 * output line with a carriage return and draws the line feed only with the next text, so both end anchors
 * arrive at the start of the last output line, which already holds text.
 */
const CONPTY_SCROLLING = [
  'PS C:\\w> \r\n'.repeat(7) + 'PS C:\\w> ',
  '\x1b[?25l',
  '\x1b[97m1\x1b[90m..\x1b[97m30\x1b[?25h',
  '\x1b[?25l\x1b[m\x1b[97m\x1b[8;10H1\x1b[90m..\x1b[97m30 \x1b[37m| \x1b[93m% \x1b[37m{ \x1b[36m"row\x1b[92m$_',
  '\x1b[m\x1b[97m\x1b[8;10H1\x1b[90m..\x1b[97m30 \x1b[37m| \x1b[93m% \x1b[37m{ \x1b[36m"row\x1b[92m$_\x1b[36m" \x1b[37m}\x1b[?25h',
  '\x1b]7338;start;MS4uMzAgfCAlIHsgInJvdyRfIiB9\x07',
  '\x1b[m\r\nrow1\r',
  ...Array.from({ length: 29 }, (_, index) => `\nrow${index + 2}\r`),
  '\x1b]7338;end;0\x07',
  '\nPS C:\\w>\x1b[1C',
  '\x1b[?25l',
  '\x1b[93mecho \x1b[36m"a1"\x1b[?25h',
  '\x1b]7338;start;ZWNobyAiYTEi\x07',
  '\x1b[m\r\n',
  'a1\r',
  '\x1b]7338;end;0\x07',
  '\nPS C:\\w>\x1b[1C'
]

describe('command block anchors', () => {
  it('marks the typed command and its output when ConPTY draws line breaks after the anchors', async () => {
    const terminal = blockTerminal(true)
    await terminal.write(CONPTY_SESSION)

    expect(terminal.blocks).toHaveLength(2)
    const [echo, fail] = terminal.blocks
    expect(terminal.line(echo.commandLine.line)).toBe('PS C:\\w> echo "block-$(40+2)"')
    expect(terminal.output(echo)).toBe('block-42')
    expect(terminal.line(fail.commandLine.line)).toBe('PS C:\\w> cmd /c exit 1')
    // No output: the range ends where it starts, on the next prompt
    expect(fail.outputLine.line).toBe(fail.endLine.line)
    expect(terminal.line(fail.endLine.line)).toBe('PS C:\\w> ')
  })

  it('reproduces the misplaced marks when lagging anchors are taken at the cursor line', async () => {
    const terminal = blockTerminal(false)
    await terminal.write(CONPTY_SESSION)

    const [echo, fail] = terminal.blocks
    // Above the first line: the mark is never drawn
    expect(echo.commandLine.line).toBe(-1)
    // The second mark lands on the previous command's output
    expect(terminal.line(fail.commandLine.line)).toBe('block-42')
  })

  it('keeps the last output line when ConPTY has not drawn its line feed yet, also while scrolling', async () => {
    const terminal = blockTerminal(true)
    await terminal.write(CONPTY_SCROLLING)

    const [rows, echo] = terminal.blocks
    expect(terminal.line(rows.commandLine.line)).toBe('PS C:\\w> 1..30 | % { "row$_" }')
    expect(terminal.output(rows)).toBe(Array.from({ length: 30 }, (_, index) => `row${index + 1}`).join('\n'))
    expect(terminal.line(echo.commandLine.line)).toBe('PS C:\\w> echo "a1"')
    expect(terminal.output(echo)).toBe('a1')
    expect(terminal.line(echo.endLine.line)).toBe('PS C:\\w>')
  })

  it('places anchors written at the start of an empty line (zsh, bash) the same way either way', async () => {
    for (const anchorsMayLag of [false, true]) {
      const terminal = blockTerminal(anchorsMayLag)
      await terminal.write([
        'user@host ~ % printf "a\\nb\\n"\r\n',
        '\x1b]7338;start;cHJpbnRmICJhXG5iXG4i\x07',
        'a\r\nb\r\n',
        '\x1b]7338;end;0\x07',
        'user@host ~ % '
      ])

      const [block] = terminal.blocks
      expect(terminal.line(block.commandLine.line)).toBe('user@host ~ % printf "a\\nb\\n"')
      expect(block.outputLine.line).toBe(1)
      expect(block.endLine.line).toBe(3)
      expect(terminal.output(block)).toBe('a\nb')
    }
  })
})
