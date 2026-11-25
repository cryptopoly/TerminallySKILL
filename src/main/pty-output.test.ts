import { describe, expect, it } from 'vitest'
import {
  MAX_OUTPUT_BUFFER_BYTES,
  SHELL_READY_MARKER,
  TARGET_OUTPUT_BUFFER_BYTES,
  appendOutputChunk,
  extractShellIntegrationEvents,
  extractWorkflowStepResults,
  prepareLogContent,
  splitIncompleteMarker,
  stripAnsi,
  stripWorkflowMarkerEcho,
  MarkerEchoFilter,
  STEP_MARKER_COMMAND_RE
} from './pty-output'
import { buildWorkflowStepMarkerCommand } from '../shared/workflow-shell'

describe('pty-output', () => {
  it('strips ANSI escapes and normalizes carriage returns', () => {
    expect(
      stripAnsi('\u001b[31merror\u001b[0m\r\nline 2\r\u001b]7337;ready\u0007')
    ).toBe('error\nline 2')
  })

  it('extracts shell integration events and removes their markers from output', () => {
    const promptPayload = Buffer.from('/tmp/app').toString('base64')
    const commandPayload = Buffer.from('npm test').toString('base64')

    const extracted = extractShellIntegrationEvents(
      `before${SHELL_READY_MARKER}\x1b]7337;shell;command-start;${commandPayload}\x07` +
        `middle\x1b]7337;shell;prompt-ready;0;${promptPayload}\x07after`
    )

    expect(extracted.data).toBe(
      `before\x1b]7338;start;${commandPayload}\x07middle\x1b]7338;end;0\x07after`
    )
    expect(extracted.sawMarker).toBe(true)
    expect(extracted.events).toHaveLength(2)
    expect(extracted.events[0]).toMatchObject({
      type: 'command-start',
      command: 'npm test'
    })
    expect(extracted.events[1]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/tmp/app',
      exitCode: 0
    })
  })

  it('extracts prompt-ready with non-zero exit code', () => {
    const cwdPayload = Buffer.from('/home/user').toString('base64')
    const extracted = extractShellIntegrationEvents(
      `\x1b]7337;shell;prompt-ready;127;${cwdPayload}\x07`
    )
    expect(extracted.events).toHaveLength(1)
    expect(extracted.events[0]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/home/user',
      exitCode: 127
    })
  })

  it('handles legacy prompt-ready format without exit code', () => {
    const cwdPayload = Buffer.from('/tmp').toString('base64')
    const extracted = extractShellIntegrationEvents(
      `\x1b]7337;shell;prompt-ready;${cwdPayload}\x07`
    )
    expect(extracted.events).toHaveLength(1)
    expect(extracted.events[0]).toMatchObject({
      type: 'prompt-ready',
      cwd: '/tmp',
      exitCode: null
    })
  })

  it('leaves plain output untouched when no shell markers are present', () => {
    expect(extractShellIntegrationEvents('plain output')).toEqual({
      data: 'plain output',
      sawMarker: false,
      events: []
    })
  })

  it('extracts workflow step-result markers without leaking them into terminal output', () => {
    expect(
      extractWorkflowStepResults(
        `before\x1b]7337;workflow-step;run-1;step-2;17\x07after`
      )
    ).toEqual({
      data: 'beforeafter',
      results: [
        {
          runId: 'run-1',
          stepId: 'step-2',
          exitCode: 17
        }
      ]
    })
  })

  it('caps the buffered output by dropping old chunks once the limit is exceeded', () => {
    const chunks = [
      'a'.repeat(4 * 1024 * 1024),
      'b'.repeat(4 * 1024 * 1024),
      'c'.repeat(3 * 1024 * 1024)
    ]

    let state = { outputBuffer: [] as string[], outputBufferSize: 0 }
    for (const chunk of chunks) {
      state = appendOutputChunk(state.outputBuffer, state.outputBufferSize, chunk)
    }

    expect(state.outputBufferSize).toBeLessThanOrEqual(MAX_OUTPUT_BUFFER_BYTES)
    expect(state.outputBufferSize).toBeLessThanOrEqual(TARGET_OUTPUT_BUFFER_BYTES)
    expect(state.outputBuffer).toHaveLength(2)
    expect(state.outputBuffer[0][0]).toBe('b')
    expect(state.outputBuffer[1][0]).toBe('c')
  })

  it('returns null for empty log content after stripping control sequences', () => {
    expect(prepareLogContent(['\u001b[31m\u001b[0m', '\r', SHELL_READY_MARKER])).toBeNull()
    expect(prepareLogContent(['ok\r\n'])).toBe('ok\n')
  })

  it('drops the partial first line when older output was trimmed', () => {
    expect(prepareLogContent(['_tail_of_a_token rest\nnext line\n'], true)).toBe('next line\n')
    expect(prepareLogContent(['no newline at all'], true)).toBeNull()
  })

  it('holds back a marker that is split across PTY chunks', () => {
    const first = splitIncompleteMarker('output\x1b]7337;workflow-step;wf-1;step-1;')
    expect(first).toEqual({ complete: 'output', tail: '\x1b]7337;workflow-step;wf-1;step-1;' })

    const joined = first.tail + '0\x07done'
    expect(splitIncompleteMarker(joined)).toEqual({ complete: joined, tail: '' })
    expect(extractWorkflowStepResults(joined).results).toEqual([{ runId: 'wf-1', stepId: 'step-1', exitCode: 0 }])
  })

  it('holds back a chunk that ends inside the marker prefix', () => {
    expect(splitIncompleteMarker('text\x1b]73')).toEqual({ complete: 'text', tail: '\x1b]73' })
    expect(splitIncompleteMarker('plain output')).toEqual({ complete: 'plain output', tail: '' })
  })

  it('removes the echoed workflow step marker command line', () => {
    const echoed = "npm test\r\nprintf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-1' 'step-1' $?\r\nok\r\n"
    expect(stripWorkflowMarkerEcho(echoed)).toBe('npm test\r\nok\r\n')
  })

  it('removes a marker line that bash 3.2 readline wraps with a space and a carriage return', () => {
    // Bytes from /bin/bash 3.2 on macOS, 80 columns, picking up a typed-ahead marker at its prompt
    const wrapped =
      "bash-3.2$ printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-5027f432-9b8e-4443-9 \r0c0-360bb1379231' '7f34a700-a826-462c-aee1-a0399e74cdcc' $?\r\nok\r\n"
    expect(stripWorkflowMarkerEcho(wrapped)).toBe('ok\r\n')
  })

  it('leaves a marker line without its newline to the echo filter', () => {
    const firstRow = "bash-3.2$ printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf"
    expect(stripWorkflowMarkerEcho(firstRow)).toBe(firstRow)
  })

  it('never strips the prompt anchor in front of a marker line', () => {
    const line = "\x1b]7338;end;0\x07bash-3.2$ printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-1' 'st-1' $?\r\n"
    expect(stripWorkflowMarkerEcho(line)).toBe('\x1b]7338;end;0\x07')
  })

  it('arms the echo filter for the zsh/bash marker only; PowerShell erases its own step line', () => {
    const shMarker = buildWorkflowStepMarkerCommand('wf-1', 'step-1', '/bin/zsh', 0)!
    expect(`npm test\n${shMarker}\n`.match(STEP_MARKER_COMMAND_RE)?.[0]).toBe(shMarker)
    const psMarker = buildWorkflowStepMarkerCommand('wf-1', 'step-1', 'powershell.exe', 0)!
    expect(`npm test\n${psMarker}\n`.match(STEP_MARKER_COMMAND_RE)).toBeNull()
    expect(stripWorkflowMarkerEcho(`PS C:\\> ${psMarker}\r\n`)).toBe(`PS C:\\> ${psMarker}\r\n`)
  })

  it('reads the exit code the PowerShell marker prints (checked on Windows PowerShell 5.1)', () => {
    // Bytes printed on Windows by `cmd /c exit 3` followed by the marker command
    expect(extractWorkflowStepResults('\x1b]7337;workflow-step;1a2b3c4d;2;3\x07').results).toEqual([
      { runId: '1a2b3c4d', stepId: '2', exitCode: 3 }
    ])
  })
})

describe('MarkerEchoFilter', () => {
  const marker = "printf '\\033]7337;workflow-step;%s;%s;%d\\007' 'wf-1' 'st-1' $?"
  const start = (command: string) => `\x1b]7338;start;${Buffer.from(command).toString('base64')}\x07`
  const end = '\x1b]7338;end;0\x07'
  const stepStart = start('npm test')
  const markerStart = start(marker)
  // Chunks captured from zsh picking up a typed-ahead marker after a command ended
  const zleChunks = ['\rP% \x1b[?2004hp', 'r', 'i', 'n', 't', "f '", '\\', '03', '3', ']', '7', '3', '3', '7', ';w', 'o', 'rk', 'fl', 'o', 'w-', 'st', 'e', 'p', ';%', "s;%s;%d\\007' 'wf-1' 'st", "-1'", ' $?', '\x1b[?2004l\r\r\n']

  const running = () => {
    const filter = new MarkerEchoFilter()
    filter.arm(marker)
    expect(filter.push(`${stepStart}ok\r\n`)).toBe(`${stepStart}ok\r\n`)
    return filter
  }

  it('drops the prompt and the marker the line editor draws a few characters per chunk', () => {
    const filter = running()
    const out = [end, ...zleChunks, markerStart, end, '\rP% '].map((chunk) => filter.push(chunk)).join('')
    expect(out).toBe(`${end}${markerStart}${end}\rP% `)
  })

  it('drops a marker line wrapped inside its start, with a long prompt (zsh on CI)', () => {
    // zsh at the window edge: " \r", erase, the next character, then the row again from its start
    const prompt = 'runner@sat12-bq165-ee9ebc1c-cd16-42fd-b463-b074e0e23356-36AEEBC4AED3 ~ % '
    const wrapAt = 100 - prompt.length
    const drawn = `${prompt}\x1b[?2004h${marker.slice(0, wrapAt)} \r\x1b[K${marker[wrapAt]}\r${marker.slice(wrapAt)}\x1b[?2004l\r\r\n`
    const filter = running()
    const out = [end, ...drawn.match(/[\s\S]{1,3}/g)!, markerStart, end].map((chunk) => filter.push(chunk)).join('')
    expect(out).toBe(`${end}${markerStart}${end}`)
  })

  it('drops a marker line bash 3.2 readline wraps with " \\r"', () => {
    const filter = running()
    const drawn = `bash-3.2$ ${marker.slice(0, 20)} \r${marker.slice(20)}\r\n`
    expect(filter.push(`${end}${drawn}${markerStart}`)).toBe(`${end}${markerStart}`)
  })

  it('clears the row when a slow prompt went out before the marker came', () => {
    const filter = running()
    expect(filter.push(`${end}bash-3.2$ `)).toBe(end)
    expect(filter.flush()).toBe('bash-3.2$ ')
    expect(filter.push(`${marker}\r\n${markerStart}`)).toBe(`\r\x1b[K${markerStart}`)
  })

  it('gives the prompt back when another command starts instead (marker flushed by sudo)', () => {
    const filter = running()
    expect(filter.push(`${end}P% ls\r\n`)).toBe(end)
    expect(filter.push(`${start('ls')}a\r\n`)).toBe(`P% ls\r\n${start('ls')}a\r\n`)
    expect(filter.push(`${end}P% `)).toBe(`${end}P% `)
  })

  it('gives the prompt back at a second prompt (Ctrl+C)', () => {
    const filter = running()
    expect(filter.push(`${end}P% ^C\r\n`)).toBe(end)
    expect(filter.push(`${end}P% `)).toBe(`P% ^C\r\n${end}P% `)
  })

  it('passes everything through when not armed', () => {
    const filter = new MarkerEchoFilter()
    expect(filter.push(`printf hello\r\n${end}P% `)).toBe(`printf hello\r\n${end}P% `)
    expect(filter.hasHeld).toBe(false)
  })

  it('gives back text that stops matching while the step runs', () => {
    const filter = running()
    expect(filter.push('pri')).toBe('')
    expect(filter.push('ce: 3\r\n')).toBe('price: 3\r\n')
  })

  it('lets the caller flush a held prefix so output is not lost', () => {
    const filter = running()
    expect(filter.push('p')).toBe('')
    expect(filter.hasHeld).toBe(true)
    expect(filter.flush()).toBe('p')
  })

  it('removes the terminal echo during a step, colour codes included', () => {
    const filter = running()
    expect(filter.push(`output pri\x1b[32mntf '\\033]7337;workflow-step;%s' x\r\nmore\r\n`)).toBe('output more\r\n')
  })

  it('drops the marker after an empty step, which has a prompt but no start', () => {
    const filter = new MarkerEchoFilter()
    filter.arm(marker)
    expect(filter.push(`P% \r\r\n${end}P% ${marker}\r\r\n${markerStart}${end}P% `)).toBe(`P% \r\r\n${end}${markerStart}${end}P% `)
  })

  it('stays armed through the previous marker prompt that arrives before the step starts', () => {
    const filter = new MarkerEchoFilter()
    filter.arm(marker)
    expect(filter.push(`${start(marker)}${end}P% `)).toBe(`${start(marker)}${end}P% `)
    expect(filter.push(`${stepStart}ok\r\n${end}P% ${marker}\r\n${markerStart}`)).toBe(`${stepStart}ok\r\n${end}${markerStart}`)
  })
})
