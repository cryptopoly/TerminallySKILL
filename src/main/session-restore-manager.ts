import fs from 'node:fs'
import path from 'node:path'
import {
  buildSavedTerminalLayout,
  parseSavedTerminalLayout,
  type ReportedTerminalLayout,
  type SavedTerminalLayout
} from '../shared/session-restore'
import { getDataDir } from './user-data-path'
import { getSessionCwd } from './pty-manager'

// Keyed by webContents id, in the order windows first reported.
const layouts = new Map<number, ReportedTerminalLayout>()
const lastCwdBySession = new Map<string, string>()
let loaded: SavedTerminalLayout | null | undefined
let taken = false
let saved = false

function layoutPath(): string {
  return path.join(getDataDir(), 'terminal-layout.json')
}

function rememberCwds(layout: ReportedTerminalLayout): void {
  for (const tab of layout.tabs) {
    const cwd = getSessionCwd(tab.sessionId)
    if (cwd) lastCwdBySession.set(tab.sessionId, cwd)
  }
}

/** The tabs saved at the last quit. Given out once per run, so a reloaded window does not reopen them again. */
export function takeSavedTerminalLayout(): SavedTerminalLayout | null {
  if (taken) return null
  taken = true
  if (loaded === undefined) {
    try {
      loaded = parseSavedTerminalLayout(JSON.parse(fs.readFileSync(layoutPath(), 'utf8')))
    } catch {
      loaded = null
    }
  }
  return loaded
}

export function reportTerminalLayout(windowId: number, layout: ReportedTerminalLayout): void {
  if (saved) return
  rememberCwds(layout)
  if (layout.tabs.length === 0) layouts.delete(windowId)
  else layouts.set(windowId, layout)
}

/**
 * A window is closing. Its shells are about to end, so note their folders first. Closing one of
 * several windows drops its tabs; closing the last window keeps them (macOS keeps running after it).
 */
export function noteWindowClosing(windowId: number, otherWindowsOpen: boolean): void {
  if (saved) return
  const layout = layouts.get(windowId)
  if (!layout) return
  if (otherWindowsOpen) layouts.delete(windowId)
  else rememberCwds(layout)
}

/** Called once when the app quits, before the shells are stopped. */
export function saveTerminalLayoutOnQuit(): void {
  if (saved) return
  saved = true
  for (const layout of layouts.values()) rememberCwds(layout)
  const layout = buildSavedTerminalLayout([...layouts.values()], (id) => lastCwdBySession.get(id) ?? null)
  try {
    if (layout) {
      fs.mkdirSync(path.dirname(layoutPath()), { recursive: true })
      fs.writeFileSync(layoutPath(), JSON.stringify(layout, null, 2))
    } else {
      fs.rmSync(layoutPath(), { force: true })
    }
  } catch (error) {
    console.error('[session-restore] Could not save the terminal layout:', error)
  }
}
