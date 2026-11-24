import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type ExitListener = (e: { exitCode: number; signal?: number }) => void

class FakePty {
  pid = 4242
  exitListeners: ExitListener[] = []
  kills: (string | undefined)[] = []
  /** Signals this fake shell dies from; others are ignored (like `trap '' HUP`). */
  constructor(private diesFrom: string[]) {}
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
    if (this.diesFrom.includes(signal ?? 'SIGHUP')) {
      setTimeout(() => this.exitListeners.forEach((l) => l({ exitCode: 0 })), 50)
    }
  }
}

const spawned: FakePty[] = []
let nextDiesFrom: string[] = ['SIGHUP']
const spawn = vi.fn(() => {
  const p = new FakePty(nextDiesFrom)
  spawned.push(p)
  return p
})

vi.mock('electron', () => ({ app: { isPackaged: false, getVersion: () => '0.0.0' }, BrowserWindow: class {} }))
vi.mock('node-pty', () => ({ spawn }))
vi.mock('./command-detector', () => ({ getAllScanDirs: async () => ['/usr/bin', '/bin'] }))
vi.mock('./log-manager', () => ({ saveSessionLog: vi.fn(), shouldSaveSessionLog: async () => false }))
vi.mock('./run-manager', () => ({ attachLogToRuns: vi.fn() }))

const window = { isDestroyed: () => false, webContents: { send: vi.fn() } }

async function loadManager() {
  vi.resetModules()
  return import('./pty-manager')
}

describe('stopping terminals at quit', () => {
  beforeEach(() => {
    spawned.length = 0
    nextDiesFrom = ['SIGHUP']
    spawn.mockClear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

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
