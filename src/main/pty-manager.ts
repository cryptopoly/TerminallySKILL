import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { createRequire } from 'node:module'
import { app, BrowserWindow } from 'electron'
import type { IPty } from 'node-pty'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { getAllScanDirs } from './command-detector'
import { saveSessionLog, shouldSaveSessionLog } from './log-manager'
import { attachLogToRuns } from './run-manager'
import { registerTerminalSession, unregisterTerminalSession } from './terminal-session-registry'
import { buildBashShellIntegrationInit, buildZshEnvForward, buildZshShellIntegrationInit } from './shell-integration-init'
import {
  appendOutputChunk,
  extractShellIntegrationEvents,
  extractWorkflowStepResults,
  prepareLogContent,
  splitIncompleteMarker,
  stripWorkflowMarkerEcho
} from './pty-output'
import type { TerminalSessionInfo } from '../shared/run-schema'

interface PtySession {
  process: IPty
  sessionId: string
  cwd: string
  startedAt: string
  shellState: 'init' | 'idle' | 'executing'
  window: BrowserWindow
  cleanupInit: () => void
  /** Project metadata — passed at creation time for auto-saving logs */
  projectId: string | null
  projectName: string | null
  projectWorkingDir: string | null
  shell: string
  /** Raw PTY output accumulated for log saving */
  outputBuffer: string[]
  outputBufferSize: number
  /** True once the oldest output was dropped to stay under the buffer cap */
  outputTrimmed: boolean
  /** Guard to prevent double-save */
  saved: boolean
  /** Hold early shell startup text so we can strip launcher-specific noise before display. */
  startupBuffer: string
  /** Trailing unterminated shell-integration marker held back until the next PTY chunk */
  markerCarry: string
  startupFlushed: boolean
  /** Timestamp (ms) until which SSH command echo lines should be stripped from output. */
  sshEchoFilterUntil: number
}

const sessions = new Map<string, PtySession>()
let nextId = 1
let ptyRuntimePromise: Promise<typeof import('node-pty')> | null = null
const nodeRequire = createRequire(import.meta.url)

/** Cached enriched PATH — resolved once, reused for all sessions */
let cachedEnrichedPath: string | null = null

async function getPtyRuntime(): Promise<typeof import('node-pty')> {
  if (!ptyRuntimePromise) {
    ptyRuntimePromise = (async () => {
      if (app.isPackaged) {
        // With asarUnpack configured for node-pty, electron's module system
        // transparently resolves native files (.node, spawn-helper) from the
        // app.asar.unpacked directory. Loading via the asar path ensures
        // node-pty's internal .replace('app.asar', 'app.asar.unpacked') logic
        // correctly locates the spawn-helper binary.
        const asarNodePtyEntry = path.join(
          process.resourcesPath,
          'app.asar',
          'node_modules',
          'node-pty',
          'lib',
          'index.js'
        )
        if (fs.existsSync(asarNodePtyEntry)) {
          return nodeRequire(asarNodePtyEntry) as typeof import('node-pty')
        }
      }

      return import('node-pty')
    })()
      .catch((error) => {
        ptyRuntimePromise = null
        throw error
      })
  }

  return ptyRuntimePromise
}

const STARTUP_FLUSH_TIMEOUT_MS = 3000
const MAX_STARTUP_BUFFER_CHARS = 256 * 1024

function stripStartupShellNoise(text: string): string {
  return text
    .replace(/^Restored session:.*(?:\r?\n)?/gm, '')
    .replace(/^nvm is not compatible with the npm config "prefix" option:.*(?:\r?\n)?/gm, '')
    .replace(/^Run [`'"]?npm config delete prefix[`'"]? or [`'"]?nvm use --delete-prefix .*?(?:\r?\n)?/gm, '')
    // Strip SSH command echo lines — PTY echo and shell-prompt+command line both contain 'ssh' '-t' or 'ssh' '-i'
    .replace(/^[^\r\n]*'ssh'\s+'[^\r\n]*(?:\r?\n)?/gm, '')
    .replace(/^(?:\r?\n)+/, '')
}

function isExecutableFile(filePath: string | undefined | null): filePath is string {
  if (!filePath?.trim()) return false

  try {
    fs.accessSync(filePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}

function getShellCandidates(): string[] {
  return process.platform === 'darwin'
    ? ['/bin/zsh', '/bin/bash', '/bin/sh']
    : ['/bin/bash', '/usr/bin/bash', '/bin/zsh', '/bin/sh']
}

function getDefaultShell(): string {
  if (process.platform === 'win32') return 'powershell.exe'
  const envShell = process.env.SHELL?.trim()
  if (isExecutableFile(envShell)) return envShell

  return getShellCandidates().find((candidate) => isExecutableFile(candidate)) ?? '/bin/sh'
}

function getSafeCwd(preferredCwd?: string): string {
  const candidates = [
    preferredCwd?.trim(),
    process.env.HOME,
    os.homedir(),
    process.cwd(),
    '/'
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    try {
      if (fs.statSync(candidate).isDirectory()) {
        return candidate
      }
    } catch {
      // ignore and continue falling back
    }
  }

  return '/'
}

function sanitizeSpawnEnv(env: Record<string, string | undefined>): Record<string, string> {
  const sanitized: Record<string, string> = {}

  for (const [key, value] of Object.entries(env)) {
    if (!key.trim() || typeof value !== 'string') continue
    sanitized[key] = value
  }

  if (!sanitized.PATH) {
    sanitized.PATH = process.env.PATH || ''
  }

  return sanitized
}

/**
 * Build an enriched PATH that includes the user's shell PATH plus
 * all extra directories TV scans (homebrew, npm global, cargo, etc.).
 * This ensures any command TV can discover will also work in the terminal.
 */
async function getEnrichedPath(): Promise<string> {
  if (cachedEnrichedPath) return cachedEnrichedPath

  try {
    const allDirs = await getAllScanDirs()
    const separator = process.platform === 'win32' ? ';' : ':'
    cachedEnrichedPath = allDirs.join(separator)
  } catch {
    cachedEnrichedPath = process.env.PATH || ''
  }

  return cachedEnrichedPath
}

/**
 * Pre-warm the PATH cache at app startup so the first terminal opens instantly.
 */
export async function initTerminalPath(): Promise<void> {
  await getEnrichedPath()
}

function bufferForLog(session: PtySession, data: string): void {
  const expectedSize = session.outputBufferSize + data.length
  const buffered = appendOutputChunk(session.outputBuffer, session.outputBufferSize, data)
  session.outputBuffer = buffered.outputBuffer
  session.outputBufferSize = buffered.outputBufferSize
  if (buffered.outputBufferSize < expectedSize) session.outputTrimmed = true
}

/**
 * Auto-save a session log from the buffered PTY output.
 * Called from both killTerminal (manual close) and onExit (natural exit).
 * The `saved` flag on the session prevents double-saves.
 */
async function autoSaveLog(session: PtySession, exitCode: number | null = null): Promise<void> {
  if (session.saved) return
  session.saved = true

  const shouldSave = await shouldSaveSessionLog(session.projectId)
  if (!shouldSave) {
    console.log(`[pty] Skipping log save for ${session.sessionId} — logging disabled`)
    return
  }

  const content = prepareLogContent(session.outputBuffer, session.outputTrimmed)
  if (!content) {
    console.log(`[pty] Skipping log save for ${session.sessionId} — empty content`)
    return
  }

  console.log(`[pty] Auto-saving log for ${session.sessionId} (${content.length} chars, exit=${exitCode})`)
  saveSessionLog({
    sessionId: session.sessionId,
    projectId: session.projectId,
    projectName: session.projectName,
    shell: session.shell,
    cwd: session.projectWorkingDir ?? session.cwd,
    startedAt: session.startedAt,
    exitCode,
    content
  })
    .then(async (meta) => {
      if (!meta) return
      await attachLogToRuns(session.sessionId, meta.logFilePath)
    })
    .catch((err) =>
      console.error(`[pty] Failed to auto-save log for ${session.sessionId}:`, err)
    )
}

/**
 * Set up invisible shell integration hooks that emit shell prompt and
 * command lifecycle markers we can consume in the renderer.
 *
 * For zsh: uses ZDOTDIR trick to inject precmd/preexec hooks via temp .zshrc
 * For bash: uses --rcfile to inject prompt-ready and command-start hooks via temp init file
 */
function setupShellIntegration(
  shell: string,
  sessionId: string
): { args: string[]; env: Record<string, string>; cleanup: () => void; hasIntegration: boolean } {
  const env = sanitizeSpawnEnv(process.env as Record<string, string | undefined>)
  let args: string[] = []
  const tempPaths: string[] = []

  // Avoid leaking parent terminal session-resume state into TV terminals.
  // When the app is launched from Apple Terminal, zsh can emit banners like
  // "Restored session: ..." for the parent shell session unless we clear them.
  delete env.TERM_SESSION_ID
  delete env.SHELL_SESSION_FILE
  delete env.SHELL_SESSION_DID_INIT
  delete env.PREFIX
  delete env.NPM_CONFIG_PREFIX
  delete env.npm_config_prefix

  // Remove Electron/Node vars that break Python venvs and other language runtimes
  delete env.PYTHONHOME
  delete env.PYTHONPATH
  delete env.ELECTRON_RUN_AS_NODE
  delete env.NODE_OPTIONS

  let hasIntegration = false

  if (shell.includes('zsh')) {
    const tmpDir = path.join(os.tmpdir(), `tv-zsh-${sessionId}`)
    fs.mkdirSync(tmpDir, { recursive: true })
    tempPaths.push(tmpDir)

    // .zshenv: forward to user's actual .zshenv
    fs.writeFileSync(path.join(tmpDir, '.zshenv'), buildZshEnvForward(tmpDir))

    // .zshrc: source user's config, THEN add our invisible prompt hooks.
    fs.writeFileSync(
      path.join(tmpDir, '.zshrc'),
      buildZshShellIntegrationInit()
    )

    // An inherited ZDOTDIR is the user's only if it is not another terminal's temp dir
    // (e.g. the app was started from a TerminallySKILL terminal).
    if (env.ZDOTDIR && !path.basename(env.ZDOTDIR).startsWith('tv-zsh-')) {
      env.TV_USER_ZDOTDIR = env.ZDOTDIR
    } else {
      delete env.TV_USER_ZDOTDIR
    }
    env.ZDOTDIR = tmpDir
    hasIntegration = true
    console.log(`[pty] Shell integration (zsh): ZDOTDIR=${tmpDir}`)
  } else if (shell.includes('bash')) {
    const tmpFile = path.join(os.tmpdir(), `tv-bash-${sessionId}.sh`)
    tempPaths.push(tmpFile)

    fs.writeFileSync(
      tmpFile,
      buildBashShellIntegrationInit()
    )

    args = ['--rcfile', tmpFile]
    hasIntegration = true
    console.log(`[pty] Shell integration (bash): rcfile=${tmpFile} (prompt-ready + command-start)`)
  } else {
    console.log(`[pty] Shell integration: unsupported shell "${shell}", no hooks installed`)
  }

  const cleanup = (): void => {
    for (const p of tempPaths) {
      try {
        const stat = fs.statSync(p)
        if (stat.isDirectory()) {
          fs.rmSync(p, { recursive: true, force: true })
        } else {
          fs.unlinkSync(p)
        }
      } catch {
        /* ignore cleanup errors */
      }
    }
  }

  return { args, env, cleanup, hasIntegration }
}

export async function createTerminal(
  window: BrowserWindow,
  cwd?: string,
  projectId?: string | null,
  projectName?: string | null,
  projectWorkingDir?: string | null,
  envOverrides?: Record<string, string>
): Promise<string> {
  const sessionId = `term-${nextId++}`
  let shell = getDefaultShell()
  const enrichedPath = await getEnrichedPath()

  let resolvedCwd = getSafeCwd(cwd)

  // Set up invisible shell integration hooks
  let { args, env, cleanup, hasIntegration } = setupShellIntegration(shell, sessionId)
  env.PATH = enrichedPath

  // Merge project-level env vars (applied after PATH so they can override)
  if (envOverrides) {
    Object.assign(env, envOverrides)
  }
  env = sanitizeSpawnEnv(env)

  console.log(`[pty] Creating terminal ${sessionId}: shell=${shell}, cwd=${resolvedCwd}`)

  const pty = await getPtyRuntime()
  const spawnOptions = {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: resolvedCwd,
    env
  }

  let ptyProcess: IPty

  try {
    ptyProcess = pty.spawn(shell, args, spawnOptions)
  } catch (error) {
    const fallbackShell = getShellCandidates().find((candidate) => candidate !== shell && isExecutableFile(candidate)) ?? shell
    const fallbackCwd = getSafeCwd()
    cleanup()
    ;({ args, env, cleanup, hasIntegration } = setupShellIntegration(fallbackShell, sessionId))
    env.PATH = enrichedPath
    if (envOverrides) {
      Object.assign(env, envOverrides)
    }
    env = sanitizeSpawnEnv(env)
    shell = fallbackShell
    resolvedCwd = fallbackCwd

    console.warn(
      `[pty] Initial spawn failed for ${sessionId}; retrying with shell=${shell}, cwd=${resolvedCwd}:`,
      error
    )

    ptyProcess = pty.spawn(shell, args, {
      ...spawnOptions,
      cwd: resolvedCwd,
      env
    })
  }

  const session: PtySession = {
    process: ptyProcess,
    sessionId,
    cwd: resolvedCwd,
    startedAt: new Date().toISOString(),
    shellState: 'init',
    window,
    cleanupInit: cleanup,
    projectId: projectId ?? null,
    projectName: projectName ?? null,
    projectWorkingDir: projectWorkingDir ?? null,
    shell,
    outputBuffer: [],
    outputBufferSize: 0,
    outputTrimmed: false,
    saved: false,
    startupBuffer: '',
    markerCarry: '',
    // Shells without integration (e.g. PowerShell on Windows) never emit a
    // prompt-ready event, so we skip startup buffering entirely for them.
    startupFlushed: !hasIntegration,
    sshEchoFilterUntil: 0
  }
  sessions.set(sessionId, session)
  registerTerminalSession(sessionId)

  // Output is held back until the first prompt-ready marker so shell startup noise can be
  // stripped. If the integration hooks never load (user rc redirects ZDOTDIR, `exec tmux`,
  // ...) that marker never comes, so flush on a timeout or size cap instead of staying blank.
  const emitFlushedData = (data: string): void => {
    if (!data) return
    bufferForLog(session, data)
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.PTY_DATA, sessionId, data)
    }
  }
  const flushStartupWithoutMarker = (reason: string): void => {
    if (session.startupFlushed) return
    console.warn(`[pty] Shell integration inactive for ${sessionId} (${reason}); flushing startup output`)
    const data = stripStartupShellNoise(session.startupBuffer)
    session.startupBuffer = ''
    session.startupFlushed = true
    emitFlushedData(data)
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.SHELL_READY, sessionId)
    }
  }
  const startupWatchdog = hasIntegration
    ? setTimeout(() => flushStartupWithoutMarker('no prompt-ready marker'), STARTUP_FLUSH_TIMEOUT_MS)
    : null

  let markerSeen = false
  // For shells without integration (e.g. PowerShell), we emit SHELL_READY
  // on the first data chunk so the renderer knows the shell is alive.
  // This unblocks the editor prompt, script execution, and shell state tracking.
  let syntheticReadySent = false

  ptyProcess.onData((rawData) => {
    const split = splitIncompleteMarker(session.markerCarry + rawData)
    session.markerCarry = split.tail
    let data = split.complete
    if (!data) return

    const shellIntegration = extractShellIntegrationEvents(data)
    if (!markerSeen && (shellIntegration.sawMarker || shellIntegration.events.length > 0)) {
      console.log(`[pty] Shell integration active for ${sessionId} — first shell marker received`)
      markerSeen = true
    }

    const promptReadyEvent = shellIntegration.events.find((event) => event.type === 'prompt-ready')
    if (promptReadyEvent?.cwd) {
      session.cwd = promptReadyEvent.cwd
    }
    if (promptReadyEvent) {
      session.shellState = 'idle'
    }
    if (shellIntegration.events.some((event) => event.type === 'command-start')) {
      session.shellState = 'executing'
    }

    if (!window.isDestroyed()) {
      for (const event of shellIntegration.events) {
        window.webContents.send(IPC_CHANNELS.SHELL_EVENT, sessionId, event)
      }

      if (shellIntegration.sawMarker || promptReadyEvent) {
        window.webContents.send(IPC_CHANNELS.SHELL_READY, sessionId)
      }

      // Shells without integration (PowerShell, fish, etc.) never emit
      // prompt-ready markers. Emit a synthetic SHELL_READY on the first
      // output so the renderer transitions to 'idle' — enabling the editor
      // prompt, script execution, and proper shell-state tracking.
      if (!hasIntegration && !syntheticReadySent) {
        syntheticReadySent = true
        session.shellState = 'idle'
        console.log(`[pty] Synthetic shell-ready for ${sessionId} (no integration)`)
        window.webContents.send(IPC_CHANNELS.SHELL_READY, sessionId)
      }
    }
    data = shellIntegration.data

    const extracted = extractWorkflowStepResults(data)
    if (extracted.results.length > 0 && !window.isDestroyed()) {
      for (const result of extracted.results) {
        window.webContents.send(IPC_CHANNELS.WORKFLOW_STEP_RESULT, sessionId, result)
      }
    }
    data = stripWorkflowMarkerEcho(extracted.data)
    if (!session.startupFlushed) {
      session.startupBuffer += data

      if (!promptReadyEvent) {
        if (session.startupBuffer.length > MAX_STARTUP_BUFFER_CHARS) {
          flushStartupWithoutMarker('startup buffer limit reached')
        }
        return
      }

      data = stripStartupShellNoise(session.startupBuffer)
      session.startupBuffer = ''
      session.startupFlushed = true
    }
    if (startupWatchdog) clearTimeout(startupWatchdog)

    if (!data) return // nothing left after stripping markers/startup noise

    // Strip SSH command echo lines (PTY echo + shell prompt line) for a short window
    // after an SSH command is written — covers the case where startupFlushed is already true.
    if (session.sshEchoFilterUntil > 0 && Date.now() < session.sshEchoFilterUntil) {
      if (/'ssh'/.test(data)) {
        data = data.replace(/[^\r\n]*'ssh'[^\r\n]*/g, '')
        data = data.replace(/(\r?\n){2,}/g, '\r\n').replace(/^\r?\n+/, '')
        if (!data) return
      }
    } else {
      session.sshEchoFilterUntil = 0
    }

    // Buffer output for auto-save on close/exit
    bufferForLog(session, data)

    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.PTY_DATA, sessionId, data)
    }
  })

  ptyProcess.onExit(({ exitCode }) => {
    if (startupWatchdog) clearTimeout(startupWatchdog)
    const sess = sessions.get(sessionId)
    if (sess) {
      // Auto-save log from buffered output
      void autoSaveLog(sess, exitCode)

      const meta = {
        cwd: sess.projectWorkingDir ?? sess.cwd,
        startedAt: sess.startedAt
      }
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.PTY_EXIT, sessionId, exitCode, meta)
      }
      sess.cleanupInit()
      unregisterTerminalSession(sessionId)
      sessions.delete(sessionId)
    }
  })

  return sessionId
}

const MAX_TERMINAL_WRITE_SIZE = 1024 * 1024 // 1MB

export function writeToTerminal(sessionId: string, data: string): void {
  const session = sessions.get(sessionId)
  if (!session || data.length > MAX_TERMINAL_WRITE_SIZE) return
  // Arm echo filter for SSH commands so the quoted-arg echo doesn't appear in the terminal
  if (data.trimStart().startsWith("'ssh'")) {
    session.sshEchoFilterUntil = Date.now() + 5000
  }

  // In a PTY the Enter key sends \r, which the shell interprets as "execute".
  // Bare \n works in bash/zsh by coincidence but PowerShell treats it as a
  // line continuation (the `>>` prompt). Normalise so all platforms behave.
  if (process.platform === 'win32') {
    data = data.replace(/\r?\n/g, '\r')
  }

  session.process.write(data)
}

export function resizeTerminal(sessionId: string, cols: number, rows: number): void {
  const session = sessions.get(sessionId)
  if (session) {
    session.process.resize(cols, rows)
  }
}

export function killTerminal(sessionId: string): void {
  const session = sessions.get(sessionId)
  if (session) {
    // Auto-save log BEFORE killing — main process handles all log persistence
    void autoSaveLog(session, null)
    session.process.kill()
    session.cleanupInit()
    unregisterTerminalSession(sessionId)
    sessions.delete(sessionId)
  }
}

export function getSessionInfo(sessionId: string): TerminalSessionInfo | null {
  const session = sessions.get(sessionId)
  if (!session) return null
  return {
    cwd: session.projectWorkingDir ?? session.cwd,
    startedAt: session.startedAt,
    shell: session.shell,
    shellState: session.shellState,
    projectId: session.projectId,
    projectName: session.projectName,
    projectWorkingDir: session.projectWorkingDir
  }
}

export function getActiveSessionCountForWindow(targetWindow: BrowserWindow): number {
  let count = 0
  for (const [, session] of sessions) {
    if (session.window === targetWindow && session.shellState === 'executing') {
      count++
    }
  }
  return count
}

export function getSessionCountForWindow(targetWindow: BrowserWindow): number {
  let count = 0
  for (const [, session] of sessions) {
    if (session.window === targetWindow) {
      count++
    }
  }
  return count
}

export function killSessionsForWindow(targetWindow: BrowserWindow): void {
  for (const [id, session] of sessions) {
    if (session.window === targetWindow) {
      void autoSaveLog(session, null)
      session.process.kill()
      session.cleanupInit()
      unregisterTerminalSession(id)
      sessions.delete(id)
    }
  }
}

export async function killAllTerminals(): Promise<void> {
  const saves: Promise<void>[] = []
  for (const [, session] of sessions) {
    saves.push(autoSaveLog(session, null).catch(() => {}))
    session.process.kill()
    session.cleanupInit()
    unregisterTerminalSession(session.sessionId)
  }
  sessions.clear()
  await Promise.allSettled(saves)
}
