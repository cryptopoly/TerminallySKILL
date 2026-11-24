/**
 * Builders for command lines the app types into a local shell. On Windows the local shell is
 * PowerShell (see getDefaultShell in the main process); everywhere else it is a POSIX shell.
 */

/** Windows PowerShell (powershell.exe) or PowerShell 7 (pwsh). */
export function isPowerShell(shell: string | null | undefined): boolean {
  return /(^|[\\/])(powershell|pwsh)(\.exe)?$/i.test(shell?.trim() ?? '')
}

/** Windows PowerShell 5.1, which passes native arguments without escaping embedded double quotes. */
function isWindowsPowerShell(shell: string | null | undefined): boolean {
  return /(^|[\\/])powershell(\.exe)?$/i.test(shell?.trim() ?? '')
}

export function posixSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

/** PowerShell also ends a single-quoted string at the typographic single quotes, so those are doubled too. */
export function powerShellSingleQuote(value: string): string {
  return `'${value.replace(/['‘’‚‛]/g, '$&$&')}'`
}

export function quoteForShell(value: string, shell: string | null | undefined): string {
  return isPowerShell(shell) ? powerShellSingleQuote(value) : posixSingleQuote(value)
}

export function buildChangeDirectoryCommand(folder: string, shell: string | null | undefined): string {
  return isPowerShell(shell)
    ? `Set-Location -LiteralPath ${powerShellSingleQuote(folder)}`
    : `cd ${posixSingleQuote(folder)}`
}

/** Runs `command` in `folder`, and only when changing to the folder worked (Windows PowerShell 5.1 has no `&&`) */
export function buildCommandInFolder(folder: string, command: string, shell: string | null | undefined): string {
  const changeDirectory = buildChangeDirectoryCommand(folder, shell)
  return isPowerShell(shell) ? `${changeDirectory}; if ($?) { ${command} }` : `${changeDirectory} && ${command}`
}

/** Windows PowerShell 5.1 wraps an argument in double quotes when it has whitespace outside "..." pairs. */
function legacyNativeArgumentNeedsQuotes(value: string): boolean {
  let inQuotes = false
  for (const char of value) {
    if (char === '"') inQuotes = !inQuotes
    else if (/\s/.test(char) && !inQuotes) return true
  }
  return false
}

/**
 * Escape double quotes (and the backslashes before them) the way a program's C runtime reads its
 * command line, because Windows PowerShell 5.1 does not. PowerShell 7.3+ does it itself.
 */
function escapeLegacyNativeArgument(value: string): string {
  const escaped = value.replace(/(\\*)"/g, '$1$1\\"')
  // A trailing backslash would escape the closing quote PowerShell adds
  return legacyNativeArgumentNeedsQuotes(escaped) ? escaped.replace(/(\\+)$/, '$1$1') : escaped
}

/** A native program call with every argument passed literally, e.g. `'ssh' '-p' '22' 'host'` in sh. */
export function buildNativeInvocation(args: string[], shell: string | null | undefined): string {
  if (!isPowerShell(shell)) return args.map(posixSingleQuote).join(' ')
  const legacy = isWindowsPowerShell(shell)
  // A quoted string at the start of a PowerShell line is a value, not a command, without the call operator
  return `& ${args.map((arg) => powerShellSingleQuote(legacy ? escapeLegacyNativeArgument(arg) : arg)).join(' ')}`
}
