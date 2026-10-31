import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { _electron as electron } from '@playwright/test'

const require = createRequire(import.meta.url)
const electronPath = require('electron')
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const mainPath = resolve(rootDir, 'out/main/index.js')

async function launchElectronExecutable({
  executablePath,
  args = [],
  testInfo,
  userDataDir,
  env = {},
  missingMessage,
  firstLaunch = false
}) {
  if (!existsSync(executablePath)) {
    throw new Error(missingMessage ?? `Missing Electron executable: ${executablePath}`)
  }

  const resolvedUserDataDir = userDataDir ?? testInfo.outputPath('user-data')
  await mkdir(resolvedUserDataDir, { recursive: true })
  if (!firstLaunch) await markWelcomeTourSeen(resolvedUserDataDir)

  const app = await electron.launch({
    executablePath,
    args,
    cwd: rootDir,
    env: {
      ...process.env,
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
      TERMINALLYSKILL_USER_DATA_DIR: resolvedUserDataDir,
      ...env
    }
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => Boolean(window.electronAPI?.getAppVersion))

  return { app, page, userDataDir: resolvedUserDataDir }
}

/**
 * A fresh user data dir counts as a first launch, which shows the welcome tour over the app.
 * Specs that are not about the tour start like an existing install: seed settings.json with the
 * tour marked as seen, unless the spec already wrote its own settings (then the app treats the
 * file as an upgrade and skips the tour anyway).
 */
async function markWelcomeTourSeen(userDataDir) {
  const dataDir = join(userDataDir, 'data')
  const settingsPath = join(dataDir, 'settings.json')
  if (existsSync(settingsPath)) return
  await mkdir(dataDir, { recursive: true })
  await writeFile(settingsPath, JSON.stringify({ hasSeenWelcomeTour: true }, null, 2))
}

export function resolvePackagedExecutablePath() {
  const configuredPath = process.env.TERMINALLYSKILL_PACKAGED_EXECUTABLE?.trim()
  if (configuredPath) return resolve(rootDir, configuredPath)

  if (process.platform === 'darwin') {
    const macDir = process.arch === 'arm64' ? 'mac-arm64' : 'mac'
    return resolve(
      rootDir,
      'dist',
      macDir,
      'TerminallySKILL.app',
      'Contents',
      'MacOS',
      'TerminallySKILL'
    )
  }

  if (process.platform === 'linux') {
    const linuxDir = process.arch === 'arm64' ? 'linux-arm64-unpacked' : 'linux-unpacked'
    return resolve(rootDir, 'dist', linuxDir, 'terminallyskill')
  }

  if (process.platform === 'win32') {
    return resolve(rootDir, 'dist', 'win-unpacked', 'TerminallySKILL.exe')
  }

  return resolve(rootDir, 'dist', 'TerminallySKILL')
}

/** Pass `{ firstLaunch: true }` to start like a brand-new install (welcome tour shows). */
export async function launchTerminallySkill(testInfo, env = {}, { firstLaunch = false } = {}) {
  if (!existsSync(mainPath)) {
    throw new Error('Missing out/main/index.js. Run npm run build before Playwright E2E tests.')
  }

  return launchElectronExecutable({
    executablePath: electronPath,
    // Fake key store: unpackaged Electron would otherwise ask the real macOS Keychain for "Electron Key".
    args: ['--use-mock-keychain', mainPath],
    testInfo,
    env,
    firstLaunch
  })
}

export async function launchPackagedTerminallySkill(testInfo, options = {}) {
  const executablePath = resolvePackagedExecutablePath()

  return launchElectronExecutable({
    executablePath,
    testInfo,
    userDataDir: options.userDataDir,
    env: options.env,
    firstLaunch: options.firstLaunch,
    missingMessage:
      `Missing packaged app executable: ${executablePath}. ` +
      'Run the matching package script before the packaged smoke test.'
  })
}
