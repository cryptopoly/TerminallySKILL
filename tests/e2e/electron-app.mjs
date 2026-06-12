import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
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
  missingMessage
}) {
  if (!existsSync(executablePath)) {
    throw new Error(missingMessage ?? `Missing Electron executable: ${executablePath}`)
  }

  const resolvedUserDataDir = userDataDir ?? testInfo.outputPath('user-data')
  await mkdir(resolvedUserDataDir, { recursive: true })

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
    return resolve(rootDir, 'dist', 'linux-unpacked', 'terminallyskill')
  }

  if (process.platform === 'win32') {
    return resolve(rootDir, 'dist', 'win-unpacked', 'TerminallySKILL.exe')
  }

  return resolve(rootDir, 'dist', 'TerminallySKILL')
}

export async function launchTerminallySkill(testInfo, env = {}) {
  if (!existsSync(mainPath)) {
    throw new Error('Missing out/main/index.js. Run npm run build before Playwright E2E tests.')
  }

  return launchElectronExecutable({
    executablePath: electronPath,
    args: [mainPath],
    testInfo,
    env
  })
}

export async function launchPackagedTerminallySkill(testInfo, options = {}) {
  const executablePath = resolvePackagedExecutablePath()

  return launchElectronExecutable({
    executablePath,
    testInfo,
    userDataDir: options.userDataDir,
    env: options.env,
    missingMessage:
      `Missing packaged app executable: ${executablePath}. ` +
      'Run the matching package script before the packaged smoke test.'
  })
}
