import { dirname, join } from 'path'

// Since Electron 43 an open/save dialog without `defaultPath` starts in Downloads and the OS
// no longer remembers the last folder. Remember it ourselves for the life of the app.
let lastDialogDir: string | undefined

export function dialogDefaultPath(fileName?: string): string | undefined {
  if (!lastDialogDir) return fileName
  return fileName ? join(lastDialogDir, fileName) : lastDialogDir
}

export function rememberDialogSelection(selectedPath: string): void {
  lastDialogDir = dirname(selectedPath)
}
