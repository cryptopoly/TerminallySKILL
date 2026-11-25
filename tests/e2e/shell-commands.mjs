// The app's terminal runs Windows PowerShell 5.1 on Windows and zsh or bash elsewhere. Specs keep
// their POSIX command exactly as it was and give the PowerShell equivalent next to it.

export const isWindows = process.platform === 'win32'

/** The POSIX command on macOS and Linux, the PowerShell one on Windows. */
export function shellCommand(posix, powershell) {
  return isWindows ? powershell : posix
}

/**
 * A PowerShell statement that writes `text` to the terminal as is, like `printf`. Windows
 * PowerShell 5.1 has no `e escape, so each control character becomes $([char]N).
 */
export function psWrite(text) {
  const body = Array.from(text, (ch) => {
    const code = ch.charCodeAt(0)
    if (code < 32 || code === 127) return `$([char]${code})`
    return '"$`'.includes(ch) ? `\`${ch}` : ch
  }).join('')
  return `[Console]::Write("${body}")`
}

/** A native command that exits with status 1, like POSIX `false`. */
export const PS_FAIL = 'cmd /c exit 1'
