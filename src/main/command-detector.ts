import { readdir, access, constants, stat } from 'fs/promises'
import { join, extname } from 'path'
import { execFile } from 'child_process'
import { homedir } from 'os'
import type { DiscoveredCommand } from '../shared/command-schema'

// Windows executable extensions to strip when normalising detected command names.
// The user types `ipconfig`, not `ipconfig.exe`, and PowerShell resolves both.
const WIN_EXECUTABLE_EXTENSIONS = new Set(['.exe', '.cmd', '.bat', '.com'])

// Executables to skip (system internals, not useful as user-facing commands)
const SKIP_PATTERNS = [
  /^\./,          // hidden files
  /\.d$/,         // .d directories
  /^_/,           // internal helpers
  /\.py[co]$/,    // Python compiled files
  /\.dll$/,       // Windows dynamic libraries — not user-facing commands
  /\.sys$/,       // Windows drivers
  /\.msc$/,       // Windows management console snap-ins
  /\.cpl$/,       // Windows control-panel items
]

const SKIP_EXACT = new Set([
  '[', '[[', 'test', 'true', 'false', 'yes', 'env', 'printenv',
  'arch', 'nproc', 'uname', 'hostname', 'whoami', 'id', 'groups',
  'tty', 'stty', 'reset', 'clear', 'tput', 'infocmp', 'tic', 'toe',
  'tabs', 'col', 'colrm', 'column', 'rev', 'fold', 'fmt', 'pr',
  'lp', 'lpr', 'lpq', 'lprm', 'cancel', 'lpstat',
  'cal', 'date', 'uptime', 'w', 'who', 'last', 'lastb',
  'login', 'su', 'sudo', 'passwd', 'chsh', 'chfn',
  'mesg', 'write', 'wall', 'talk',
])

/**
 * Common directories to scan beyond PATH — many macOS/Linux installs
 * put binaries in these locations even if they're not in PATH.
 */
const EXTRA_SCAN_DIRS = [
  '/usr/local/bin',
  '/usr/local/sbin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/Applications/Docker.app/Contents/Resources/bin',
  '/Applications/OrbStack.app/Contents/MacOS/bin',
  join(homedir(), '.npm-global/bin'),
  join(homedir(), '.nvm/versions/node'),  // we'll recurse into current
  join(homedir(), '.cargo/bin'),
  join(homedir(), '.local/bin'),
  join(homedir(), '.local/pipx/bin'),
  join(homedir(), '.pyenv/shims'),
  join(homedir(), '.asdf/shims'),
  join(homedir(), '.deno/bin'),
  join(homedir(), 'go/bin'),
  join(homedir(), '.bun/bin'),
  '/snap/bin',
  '/usr/local/go/bin',
]

const EXECUTABLE_ALIASES: Record<string, string[]> = {
  python: ['python3'],
  pip: ['pip3'],
  docker: ['com.docker.cli'],
  '7zz': ['7z']
}

const EXECUTABLE_PATTERNS: Record<string, RegExp[]> = {
  python: [/^python3(?:\.\d+)?$/],
  pip: [/^pip3(?:\.\d+)?$/]
}

const SHELL_PATH_START_MARKER = '__TV_PATH_START__'
const SHELL_PATH_END_MARKER = '__TV_PATH_END__'

let cachedShellPath: string | null = null
let cachedScanDirs: string[] | null = null
// In-flight probes are shared so concurrent callers do not each spawn a login shell
let shellPathProbe: Promise<string> | null = null
let scanDirsProbe: Promise<string[]> | null = null
const commandLookupCache = new Map<string, string | null>()
let lastCacheResetAt = 0
/** A miss re-probes PATH once in case it changed, but not on every miss */
const CACHE_RESET_MIN_INTERVAL_MS = 30_000

function clearCommandDetectorCaches(): void {
  cachedShellPath = null
  cachedScanDirs = null
  shellPathProbe = null
  scanDirsProbe = null
  commandLookupCache.clear()
  lastCacheResetAt = Date.now()
}

export function getShellPathProbeArgs(shell: string): string[] {
  const probe = `printf '${SHELL_PATH_START_MARKER}%s${SHELL_PATH_END_MARKER}' "$PATH"`
  const normalized = shell.toLowerCase()

  // On Linux, avoid the -i (interactive) flag. Interactive shells load the
  // full .bashrc/.zshrc which can hang in a non-TTY context (nvm, conda,
  // prompt toolkits, etc.) and starve the Electron main-process event loop.
  // A login shell (-l) alone sources .profile / .zprofile where PATH
  // additions belong for non-interactive sessions — this covers both
  // terminal launches and .deb / .desktop-file launches.
  const interactive = process.platform !== 'linux'

  if (normalized.includes('zsh') || normalized.includes('bash')) {
    return interactive ? ['-i', '-l', '-c', probe] : ['-l', '-c', probe]
  }

  if (normalized.includes('fish')) {
    return interactive ? ['-i', '-c', probe] : ['-l', '-c', probe]
  }

  return ['-l', '-c', probe]
}

export function extractShellPath(output: string): string | null {
  const startIndex = output.indexOf(SHELL_PATH_START_MARKER)
  if (startIndex === -1) return null

  const valueStart = startIndex + SHELL_PATH_START_MARKER.length
  const endIndex = output.indexOf(SHELL_PATH_END_MARKER, valueStart)
  if (endIndex === -1) return null

  const resolvedPath = output.slice(valueStart, endIndex).trim()
  return resolvedPath.length > 0 ? resolvedPath : null
}

/**
 * Get the user's REAL shell PATH by launching their shell directly.
 * On macOS, Electron apps launched from Finder only see a minimal PATH.
 * We probe an interactive shell when supported so PATH additions from
 * files like ~/.zshrc match what the integrated terminal sees.
 *
 * On Linux the -i (interactive) flag is avoided because it loads the full
 * .bashrc/.zshrc, which can hang in a non-TTY context (nvm, conda, prompt
 * toolkits, etc.) and starve the Electron main-process event loop.
 * A login shell (-l) without -i still sources .profile/.zprofile where
 * PATH additions belong, covering both terminal and .deb/.desktop launches.
 */
export function getShellPath(): Promise<string> {
  if (cachedShellPath !== null) return Promise.resolve(cachedShellPath)
  shellPathProbe ??= probeShellPath()
  return shellPathProbe
}

function probeShellPath(): Promise<string> {
  const shell = process.env.SHELL || '/bin/zsh'

  return new Promise((resolve) => {
    execFile(shell, getShellPathProbeArgs(shell), { timeout: 5000 }, (error, stdout, stderr) => {
      const resolvedPath = extractShellPath(`${stdout || ''}\n${stderr || ''}`)

      if (error || !resolvedPath) {
        // Fallback to process PATH
        cachedShellPath = process.env.PATH || ''
        resolve(cachedShellPath)
      } else {
        cachedShellPath = resolvedPath
        resolve(cachedShellPath)
      }
    })
  })
}

/**
 * Get all directories to scan for executables.
 * Combines the user's shell PATH + common extra directories.
 */
export function getAllScanDirs(): Promise<string[]> {
  if (cachedScanDirs !== null) return Promise.resolve(cachedScanDirs)
  scanDirsProbe ??= collectScanDirs()
  return scanDirsProbe
}

async function collectScanDirs(): Promise<string[]> {
  const shellPath = await getShellPath()
  const separator = process.platform === 'win32' ? ';' : ':'
  const pathDirs = shellPath
    .split(separator)
    .filter((dir) => dir.trim().length > 0)

  // Also try npm global prefix
  let npmGlobalBin = ''
  try {
    npmGlobalBin = await new Promise<string>((resolve) => {
      execFile('npm', ['prefix', '-g'], { timeout: 5000 }, (err, stdout) => {
        if (err || !stdout.trim()) resolve('')
        else resolve(join(stdout.trim(), 'bin'))
      })
    })
  } catch {
    // npm not available
  }

  const allDirs = [...pathDirs, ...EXTRA_SCAN_DIRS]
  if (npmGlobalBin) allDirs.push(npmGlobalBin)

  // Deduplicate
  cachedScanDirs = [...new Set(allDirs)]
  return cachedScanDirs
}

/**
 * Check if a file is executable
 */
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK)
    const s = await stat(filePath)
    return s.isFile()
  } catch {
    return false
  }
}

/**
 * On Windows, strip common executable extensions so the user-facing name
 * matches what they would actually type (e.g. `ipconfig` not `ipconfig.exe`).
 * On other platforms this is a no-op.
 */
function normalizeExecutableName(name: string): string {
  if (process.platform !== 'win32') return name
  const ext = extname(name).toLowerCase()
  return WIN_EXECUTABLE_EXTENSIONS.has(ext) ? name.slice(0, -ext.length) : name
}

/**
 * Check if a name should be skipped
 */
function shouldSkip(name: string): boolean {
  if (SKIP_EXACT.has(name)) return true
  return SKIP_PATTERNS.some((p) => p.test(name))
}

/**
 * Scan all directories for executable files
 */
export async function scanPath(): Promise<Map<string, string>> {
  const dirs = await getAllScanDirs()
  const executables = new Map<string, string>() // name -> first path found

  for (const dir of dirs) {
    try {
      const entries = await readdir(dir)
      for (const entry of entries) {
        if (shouldSkip(entry)) continue

        const name = normalizeExecutableName(entry)
        if (executables.has(name)) continue // first path wins

        const fullPath = join(dir, entry)
        if (await isExecutable(fullPath)) {
          executables.set(name, fullPath)
        }
      }
    } catch {
      // Directory doesn't exist or not readable — skip silently
    }
  }

  return executables
}

/**
 * Scan PATH and detect commands not already in the builtin library.
 * Returns discovered executables as lightweight DiscoveredCommand entries.
 */
export async function detectNewCommands(
  knownExecutables: Set<string>
): Promise<DiscoveredCommand[]> {
  const pathExecutables = await scanPath()
  const discovered: DiscoveredCommand[] = []

  for (const [name, path] of pathExecutables) {
    // Skip if already known from builtin JSON defs
    if (knownExecutables.has(name)) continue

    discovered.push({
      executable: name,
      path,
      source: 'detected',
      enriched: false,
      addedAt: new Date().toISOString()
    })
  }

  // Sort alphabetically
  discovered.sort((a, b) => a.executable.localeCompare(b.executable))

  return discovered
}

/**
 * Check if a specific command exists and where it is.
 * Searches the full shell PATH + extra dirs.
 * Returns the full path if found, null otherwise.
 */
export async function findCommand(executable: string): Promise<string | null> {
  if (commandLookupCache.has(executable)) {
    const cachedPath = commandLookupCache.get(executable)
    if (cachedPath) return cachedPath
  }

  // On Windows, also look for the executable with common extensions appended
  // so that a bare name like `ipconfig` resolves to `ipconfig.exe` on disk.
  const winExtensions = process.platform === 'win32'
    ? [...WIN_EXECUTABLE_EXTENSIONS].map((ext) => executable + ext)
    : []
  const directCandidates = [executable, ...winExtensions, ...(EXECUTABLE_ALIASES[executable] ?? [])]
  const patterns = EXECUTABLE_PATTERNS[executable]

  const locate = async (): Promise<string | null> => {
    const dirs = await getAllScanDirs()

    for (const candidate of directCandidates) {
      for (const dir of dirs) {
        const fullPath = join(dir, candidate)
        if (await isExecutable(fullPath)) {
          return fullPath
        }
      }
    }

    if (!patterns || patterns.length === 0) {
      return null
    }

    const matches: Array<{ name: string; path: string }> = []

    for (const dir of dirs) {
      try {
        const entries = await readdir(dir)
        for (const entry of entries) {
          if (!patterns.some((pattern) => pattern.test(entry))) continue

          const fullPath = join(dir, entry)
          if (await isExecutable(fullPath)) {
            matches.push({ name: entry, path: fullPath })
          }
        }
      } catch {
        // Directory doesn't exist or not readable — skip silently
      }
    }

    if (matches.length === 0) {
      return null
    }

    matches.sort((a, b) => {
      const lengthDelta = a.name.length - b.name.length
      if (lengthDelta !== 0) return lengthDelta
      return a.name.localeCompare(b.name)
    })

    return matches[0].path
  }

  let resolvedPath = await locate()
  if (resolvedPath) {
    commandLookupCache.set(executable, resolvedPath)
    return resolvedPath
  }

  // Retry with a fresh PATH snapshot in case the first lookup used stale caches, but at most
  // once per interval: checking many uninstalled commands must not re-run the shell probe each time.
  if (Date.now() - lastCacheResetAt < CACHE_RESET_MIN_INTERVAL_MS) return null
  clearCommandDetectorCaches()
  resolvedPath = await locate()
  if (resolvedPath) {
    commandLookupCache.set(executable, resolvedPath)
    return resolvedPath
  }

  return null
}

/**
 * Get the user's shell config file path
 */
export function getShellConfigPath(): string {
  const shell = process.env.SHELL || '/bin/zsh'
  const home = homedir()

  if (shell.endsWith('/zsh')) return join(home, '.zshrc')
  if (shell.endsWith('/bash')) return join(home, '.bashrc')
  if (shell.endsWith('/fish')) return join(home, '.config/fish/config.fish')

  return join(home, '.zshrc') // default to zsh on macOS
}

/**
 * Check if a directory is already in the user's shell PATH
 */
export async function isDirInShellPath(dir: string): Promise<boolean> {
  const shellPath = await getShellPath()
  const separator = process.platform === 'win32' ? ';' : ':'
  const dirs = shellPath.split(separator)
  return dirs.includes(dir)
}

/**
 * Add a directory to the user's shell PATH by appending to their config file
 */
export async function addDirToShellPath(dir: string): Promise<{ success: boolean; configFile: string }> {
  const configFile = getShellConfigPath()
  const { readFile, appendFile } = await import('fs/promises')

  try {
    // Check if already there
    const content = await readFile(configFile, 'utf-8').catch(() => '')
    if (content.includes(dir)) {
      return { success: true, configFile }
    }

    // Append export line
    const exportLine = `\n# Added by TerminallySKILL\nexport PATH="${dir}:$PATH"\n`
    await appendFile(configFile, exportLine, 'utf-8')

    return { success: true, configFile }
  } catch {
    return { success: false, configFile }
  }
}
