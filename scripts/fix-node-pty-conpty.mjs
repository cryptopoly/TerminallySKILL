// `electron-builder install-app-deps` has just rebuilt node-pty, which removed the bundled ConPTY that
// Windows terminals need. Put it back (see node-pty-conpty.mjs).
import { join } from 'node:path'
import { restoreConptyFiles } from './node-pty-conpty.mjs'

if (process.platform === 'win32') {
  restoreConptyFiles(join(process.cwd(), 'node_modules', 'node-pty'), process.arch)
}
