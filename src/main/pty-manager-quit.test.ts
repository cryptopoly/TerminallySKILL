import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ExitListener = (e: { exitCode: number; signal?: number }) => void

/** Kills and exits of every fake shell, in the order they happened */
const events: string[] = []

class FakePty {
  pid = 4242
  exitListeners: ExitListener[] = []
  kills: (string | undefined)[] = []
  /** Signals this fake shell dies from; others are ignored (like `trap '' HUP`). */
  constructor(private diesFrom: string[], private index: number) {}
  onData() {
    return { dispose() {} }
  }
  onExit(listener: ExitListener) {
    this.exitListeners.push(listener)
    return { dispose() {} }
  }
  write() {}
  resize() {}
  kill(signal?: string) {
    this.kills.push(signal)
    events.push(`kill ${this.index}`)
    if (this.diesFrom.includes(signal ?? 'SIGHUP')) {
      setTimeout(() => this.exit(), 50)
    }
  }
  exit() {
    events.push(`exit ${this.index}`)
    this.exitListeners.forEach((l) => l({ exitCode: 0 }))
  }
}

const spawned: FakePty[] = []
let nextDiesFrom: string[] = ['SIGHUP']
const spawn = vi.fn(() => {
  const p = new FakePty(nextDiesFrom, spawned.length)
  spawned.push(p)
  return p
})
/** Stands in for Windows with node-pty's bundled conpty.dll, on any platform */
let bundledConpty = false

vi.mock('electron', () => ({ app: { isPackaged: false, getVersion: () => '0.0.0' }, BrowserWindow: class {} }))
vi.mock('node-pty', () => ({ spawn }))
vi.mock('../shared/conpty-mode', () => ({ usesBundledConpty: () => bundledConpty }))
vi.mock('./command-detector', () => ({ getAllScanDirs: async () => ['/usr/bin', '/bin'] }))
vi.mock('./log-manager', () => ({ saveSessionLog: vi.fn(), shouldSaveSessionLog: async () => false }))
vi.mock('./run-manager', () => ({ attachLogToRuns: vi.fn() }))

const window = { isDestroyed: () => false, webContents: { send: vi.fn() } }

async function loadManager() {
  vi.resetModules()
  return import('./pty-manager')
}

beforeEach(() => {
  spawned.length = 0
  events.length = 0
  nextDiesFrom = ['SIGHUP']
  bundledConpty = false
  spawn.mockClear()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('stopping terminals at quit', () => {

  it('waits until every shell has reported its exit', async () => {
    const pty = await loadManager()
    await pty.createTerminal(window as never)
    await pty.createTerminal(window as never)
    expect(pty.hasRunningTerminalProcesses()).toBe(true)

    await pty.stopAllTerminalsForQuit()

    expect(spawned.map((p) => p.kills)).toEqual([[undefined], [undefined]])
    expect(pty.hasRunningTerminalProcesses()).toBe(false)
  })

  it('also waits for a shell killed earlier with its window', async () => {
    const pty = await loadManager()
    await pty.createTerminal(window as never)
    pty.killSessionsForWindow(window as never)
    expect(pty.hasRunningTerminalProcesses()).toBe(true)

    await pty.stopAllTerminalsForQuit()
    expect(pty.hasRunningTerminalProcesses()).toBe(false)
  })

  it.skipIf(process.platform === 'win32')('kills a shell that ignores SIGHUP outright', async () => {
    nextDiesFrom = ['SIGKILL']
    const pty = await loadManager()
    await pty.createTerminal(window as never)
    vi.useFakeTimers()

    const stopping = pty.stopAllTerminalsForQuit()
    await vi.advanceTimersByTimeAsync(1600)
    expect(spawned[0].kills).toEqual([undefined, 'SIGKILL'])
    await vi.advanceTimersByTimeAsync(100)
    await stopping
    expect(pty.hasRunningTerminalProcesses()).toBe(false)
  })

  it('refuses to start a shell once quitting has begun', async () => {
    const pty = await loadManager()
    await pty.stopAllTerminalsForQuit()
    await expect(pty.createTerminal(window as never)).rejects.toThrow(/quitting/)
    expect(spawn).not.toHaveBeenCalled()
  })
})

// node-pty 1.1.0 crashes or hangs when shells end at the same moment, which conpty.dll's kill makes them do.
describe('ending terminals with conpty.dll', () => {
  beforeEach(() => {
    bundledConpty = true
  })

  it('ends them one at a time at quit, each after the exit before it was reported', async () => {
    const pty = await loadManager()
    for (let i = 0; i < 3; i++) await pty.createTerminal(window as never)

    await pty.stopAllTerminalsForQuit()

    expect(events).toEqual(['kill 0', 'exit 0', 'kill 1', 'exit 1', 'kill 2', 'exit 2'])
    expect(pty.hasRunningTerminalProcesses()).toBe(false)
  })

  it('ends them all at once without conpty.dll', async () => {
    bundledConpty = false
    const pty = await loadManager()
    for (let i = 0; i < 3; i++) await pty.createTerminal(window as never)

    await pty.stopAllTerminalsForQuit()

    expect(events).toEqual(['kill 0', 'kill 1', 'kill 2', 'exit 0', 'exit 1', 'exit 2'])
  })

  it('keeps the order across a closed tab, a closed window and quitting', async () => {
    const pty = await loadManager()
    for (let i = 0; i < 3; i++) await pty.createTerminal(window as never)

    pty.killTerminal('term-1')
    pty.killSessionsForWindow(window as never)
    await pty.stopAllTerminalsForQuit()

    expect(events).toEqual(['kill 0', 'exit 0', 'kill 1', 'exit 1', 'kill 2', 'exit 2'])
  })

  it('moves on to the next terminal when an exit is not reported', async () => {
    const pty = await loadManager()
    nextDiesFrom = []
    await pty.createTerminal(window as never)
    nextDiesFrom = ['SIGHUP']
    await pty.createTerminal(window as never)
    vi.useFakeTimers()

    const stopping = pty.stopAllTerminalsForQuit()
    await vi.advanceTimersByTimeAsync(200)
    expect(events).toEqual(['kill 0'])
    await vi.advanceTimersByTimeAsync(150)
    expect(events.slice(0, 3)).toEqual(['kill 0', 'kill 1', 'exit 1'])

    await vi.advanceTimersByTimeAsync(3000)
    await stopping
  })

  it('does not kill a terminal that ended by itself while waiting its turn', async () => {
    const pty = await loadManager()
    for (let i = 0; i < 2; i++) await pty.createTerminal(window as never)

    pty.killSessionsForWindow(window as never)
    spawned[1].exit()
    await pty.stopAllTerminalsForQuit()

    expect(events).toEqual(['exit 1', 'kill 0', 'exit 0'])
    expect(spawned[1].kills).toEqual([])
  })

  it('still ends the other terminals when node-pty throws on one', async () => {
    const pty = await loadManager()
    for (let i = 0; i < 2; i++) await pty.createTerminal(window as never)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(spawned[0], 'kill').mockImplementationOnce(() => {
      throw new Error('node-pty failed')
    })
    vi.useFakeTimers()

    const stopping = pty.stopAllTerminalsForQuit()
    await vi.advanceTimersByTimeAsync(400)
    expect(events).toEqual(['kill 1', 'exit 1'])

    await vi.advanceTimersByTimeAsync(3000)
    await stopping
    expect(warn).toHaveBeenCalledWith('[pty] Could not end a terminal:', expect.any(Error))
    warn.mockRestore()
  })
})
