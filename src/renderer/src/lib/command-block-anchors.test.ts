import { createRequire } from 'node:module'
import { afterEach, describe, expect, it } from 'vitest'
import type { IMarker, Terminal as XtermTerminal } from '@xterm/xterm'
import { COMMAND_ANCHOR_OSC } from '../../../shared/shell-integration'
import { commandAnchorLineOffset, markCommandEnd, markCommandStart } from './command-block-anchors'
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

/**
 * Captured from Windows PowerShell 5.1 under the inbox ConPTY of a Windows 11 arm64 build, as the
 * renderer received it (anchors already rewritten to OSC 7338); only the long working folder in the
 * prompt was shortened. Both start anchors arrive before ConPTY draws the line break that accepts the
 * command (the second even before the last typed character), and the first end anchor arrives before
 * the line break after the output.
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

describe('command block anchors', () => {
  it('moves only a mid-line anchor, and only when anchors may lag', () => {
    expect(commandAnchorLineOffset(0, true)).toBe(0)
    expect(commandAnchorLineOffset(27, true)).toBe(1)
    expect(commandAnchorLineOffset(27, false)).toBe(0)
    expect(commandAnchorLineOffset(0, false)).toBe(0)
  })

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

  it('keeps lagging anchors right when the command and its output scroll the screen', async () => {
    const terminal = blockTerminal(true, 40, 4)
    await terminal.write([
      'PS C:\\w> \r\nPS C:\\w> \r\nPS C:\\w> \r\nPS C:\\w> echo one two',
      '\x1b]7338;start;ZWNobyBvbmUgdHdv\x07',
      '\r\none\r\ntwo',
      '\x1b]7338;end;0\x07',
      '\r\nPS C:\\w> '
    ])

    const [block] = terminal.blocks
    expect(terminal.line(block.commandLine.line)).toBe('PS C:\\w> echo one two')
    expect(terminal.output(block)).toBe('one\ntwo')
  })

  it('places anchors written at the start of a line (zsh, bash) the same way either way', async () => {
    for (const anchorsMayLag of [false, true]) {
      const terminal = blockTerminal(anchorsMayLag)
      await terminal.write([
        'user@host ~ % echo hi\r\n',
        '\x1b]7338;start;ZWNobyBoaQ==\x07',
        'hi\r\n',
        '\x1b]7338;end;0\x07',
        'user@host ~ % '
      ])

      const [block] = terminal.blocks
      expect(terminal.line(block.commandLine.line)).toBe('user@host ~ % echo hi')
      expect(block.outputLine.line).toBe(1)
      expect(block.endLine.line).toBe(2)
      expect(terminal.output(block)).toBe('hi')
    }
  })
})
