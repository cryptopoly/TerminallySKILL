// Windows terminals run on node-pty's bundled ConPTY: conpty.dll and OpenConsole.exe (decision D0041).
//
// node-pty loads build/Release/conpty.node when there is one, and its prebuilt
// prebuilds/win32-<arch>/conpty.node otherwise. It then looks for conpty\conpty.dll next to the module
// it loaded. The prebuilt module ships with the two files next to it. A rebuilt one does not:
// @electron/rebuild (run by `electron-builder install-app-deps`, and again when packaging for another
// architecture) runs `node-gyp rebuild`, which deletes build/ first, and with it the copies node-pty's
// own install step made. Every terminal then fails with "Cannot find conpty.dll".
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const CONPTY_FILES = ['conpty.dll', 'OpenConsole.exe']

function rebuiltModuleDir(nodePtyDir) {
  return join(nodePtyDir, 'build', 'Release')
}

function isRebuilt(nodePtyDir) {
  return existsSync(join(rebuiltModuleDir(nodePtyDir), 'conpty.node'))
}

/** After a rebuild, puts the bundled ConPTY back next to the rebuilt conpty.node, like node-pty's install step. */
export function restoreConptyFiles(nodePtyDir, arch) {
  if (!isRebuilt(nodePtyDir)) return
  const versionsDir = join(nodePtyDir, 'third_party', 'conpty')
  const sourceDir = join(versionsDir, readdirSync(versionsDir)[0], `win10-${arch}`)
  const targetDir = join(rebuiltModuleDir(nodePtyDir), 'conpty')
  mkdirSync(targetDir, { recursive: true })
  for (const file of CONPTY_FILES) copyFileSync(join(sourceDir, file), join(targetDir, file))
}

/** The bundled ConPTY files missing next to the conpty.node that node-pty will load. Empty when terminals can open. */
export function missingConptyFiles(nodePtyDir, arch) {
  const moduleDir = isRebuilt(nodePtyDir) ? rebuiltModuleDir(nodePtyDir) : join(nodePtyDir, 'prebuilds', `win32-${arch}`)
  return CONPTY_FILES.map((file) => join(moduleDir, 'conpty', file)).filter((file) => !existsSync(file))
}
