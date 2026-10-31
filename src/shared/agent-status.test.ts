import { describe, expect, it } from 'vitest'
import {
  AGENT_TEXT_MAX_LENGTH,
  OSC_7501_SUPPORT_REPLY,
  parseOsc7501,
  parseOsc7501Activity,
  parseOsc777,
  parseOsc9,
  sanitizeAgentText
} from './agent-status'

const b64 = (text: string): string => Buffer.from(text, 'utf8').toString('base64')

describe('sanitizeAgentText', () => {
  it('removes control characters, escape sequences and bidi overrides', () => {
    expect(sanitizeAgentText('a\x1b[31mred\x07‮b\x9bc')).toBe('a [31mred b c')
  })

  it('drops markup and keeps one line', () => {
    expect(sanitizeAgentText('<b>Build</b>\nfailed <img src=x onerror=alert(1)>')).toBe('Build failed')
  })

  it('truncates long text with an ellipsis', () => {
    const result = sanitizeAgentText('x'.repeat(500))
    expect(result).toHaveLength(AGENT_TEXT_MAX_LENGTH)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('parseOsc9', () => {
  it('turns an iTerm2 notification into an amber alert', () => {
    expect(parseOsc9('Claude needs your permission to use Bash')).toEqual({
      type: 'alert',
      kind: 'approval',
      source: 'notify',
      title: '',
      body: 'Claude needs your permission to use Bash'
    })
  })

  it('ignores ConEmu sub-commands such as the 9;4 progress bar', () => {
    expect(parseOsc9('4;1;50')).toBeNull()
    expect(parseOsc9('4')).toBeNull()
  })

  it('ignores empty and oversized payloads', () => {
    expect(parseOsc9('  \x07 ')).toBeNull()
    expect(parseOsc9('a'.repeat(5000))).toBeNull()
  })
})

describe('parseOsc777', () => {
  it('reads notify with title and body, keeping semicolons in the body', () => {
    expect(parseOsc777('notify;Codex;Approve: rm -rf build; then rebuild')).toEqual({
      type: 'alert',
      kind: 'approval',
      source: 'notify',
      title: 'Codex',
      body: 'Approve: rm -rf build; then rebuild'
    })
  })

  it('ignores other OSC 777 commands and empty notifications', () => {
    expect(parseOsc777('preexec;ls')).toBeNull()
    expect(parseOsc777('notify;;')).toBeNull()
  })
})

describe('parseOsc7501', () => {
  it('recognises the support query', () => {
    expect(parseOsc7501('?')).toEqual({ type: 'query' })
    expect(OSC_7501_SUPPORT_REPLY).toBe('\x1b]7501;?\x1b\\')
  })

  it('maps blocked, done and error to the amber, green and red dots', () => {
    expect(parseOsc7501('state=blocked')).toMatchObject({ kind: 'approval', source: 'status' })
    expect(parseOsc7501('state=done')).toMatchObject({ kind: 'finished' })
    expect(parseOsc7501('state=error')).toMatchObject({ kind: 'failed' })
  })

  it('decodes the base64 message and prefixes the app name', () => {
    const signal = parseOsc7501(
      `state=blocked:kind=permission:app=terraform:msg=${b64('Apply 3 to add, 1 to change, 0 to destroy?')}`
    )
    expect(signal).toMatchObject({ body: 'terraform: Apply 3 to add, 1 to change, 0 to destroy?' })
  })

  it('accepts unpadded base64 and whitespace around pairs', () => {
    expect(parseOsc7501(` state = done : msg = ${b64('ok!').replace(/=+$/, '')} `)).toMatchObject({ body: 'ok!' })
  })

  it('does not raise for idle, working or clear', () => {
    expect(parseOsc7501('state=working:progress=40')).toBeNull()
    expect(parseOsc7501('state=idle')).toBeNull()
    expect(parseOsc7501('state=clear')).toBeNull()
  })

  it('discards reports with a missing or unknown state', () => {
    expect(parseOsc7501('msg=aGk=')).toBeNull()
    expect(parseOsc7501('state=panic')).toBeNull()
  })

  it('discards the whole report when the message is not valid base64 or holds control characters', () => {
    expect(parseOsc7501('state=blocked:msg=not_base64')).toBeNull()
    expect(parseOsc7501(`state=blocked:msg=${b64('line one\nline two')}`)).toBeNull()
    expect(parseOsc7501(`state=blocked:msg=${b64('\x1b]8;;http://evil\x07')}`)).toBeNull()
  })

  it('drops markup from the message and ignores an invalid app name', () => {
    expect(parseOsc7501(`state=error:app=${'a'.repeat(40)}:msg=${b64('<b>tests</b> failed')}`)).toMatchObject({
      body: 'tests failed'
    })
  })
})

describe('parseOsc7501Activity', () => {
  it('reports working only for the working state', () => {
    expect(parseOsc7501Activity('state=working:progress=40')).toBe('working')
    for (const state of ['idle', 'done', 'blocked', 'error', 'clear']) {
      expect(parseOsc7501Activity(`state=${state}`)).toBe('idle')
    }
  })

  it('ignores queries, unknown states and oversized payloads', () => {
    expect(parseOsc7501Activity('?')).toBeNull()
    expect(parseOsc7501Activity('state=panic')).toBeNull()
    expect(parseOsc7501Activity('msg=aGk=')).toBeNull()
    expect(parseOsc7501Activity(`state=working:x=${'a'.repeat(5000)}`)).toBeNull()
  })
})
