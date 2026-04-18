import { readFile, mkdir, unlink, rm } from 'fs/promises'
import { join, extname } from 'path'
import type { DiscoveredCommand, DiscoveredCommandsData, CommandDefinition } from '../shared/command-schema'
import { writeJsonAtomic } from './atomic-write'
import { getDataDir } from './user-data-path'

// Windows executable extensions that should be stripped from user-facing names.
const WIN_EXECUTABLE_EXTENSIONS = new Set(['.exe', '.cmd', '.bat', '.com'])

function getDiscoveredFile(): string {
  return join(getDataDir(), 'discovered-commands.json')
}

function getEnrichedDir(): string {
  return join(getDataDir(), 'enriched-commands')
}

/**
 * Manifest file tracks which definition files belong to an executable.
 * e.g., openclaw.manifest.json → ["openclaw.json", "openclaw--agent.json", ...]
 */
function manifestPath(executable: string): string {
  return join(getEnrichedDir(), `${executable}.manifest.json`)
}

function buildDefinitionKey(definition: CommandDefinition): string {
  if (definition.tags?.includes('saved-command')) {
    return `saved::${definition.name}`.trim().toLowerCase()
  }

  if (definition.subcommands && definition.subcommands.length > 0) {
    return `${definition.executable} ${definition.subcommands.join(' ')}`.trim().toLowerCase()
  }

  return definition.name.trim().toLowerCase()
}

let cached: DiscoveredCommandsData = { commands: [] }

/**
 * Load discovered commands from disk
 */
export async function loadDiscoveredCommands(): Promise<DiscoveredCommandsData> {
  try {
    const discoveredFile = getDiscoveredFile()
    cached = JSON.parse(await readFile(discoveredFile, 'utf-8')) as DiscoveredCommandsData
    if (!Array.isArray(cached.commands)) {
      cached = { commands: [] }
    }

    // On Windows, normalise previously-cached executable names that still
    // carry an .exe / .cmd / .bat extension from before the strip-on-scan fix.
    if (process.platform === 'win32') {
      let dirty = false
      const seen = new Set<string>()
      const deduped: DiscoveredCommand[] = []
      for (const cmd of cached.commands) {
        const ext = extname(cmd.executable).toLowerCase()
        if (WIN_EXECUTABLE_EXTENSIONS.has(ext)) {
          cmd.executable = cmd.executable.slice(0, -ext.length)
          dirty = true
        }
        if (seen.has(cmd.executable)) continue
        seen.add(cmd.executable)
        deduped.push(cmd)
      }
      if (dirty) {
        cached.commands = deduped
        await save()
      }
    }
  } catch {
    cached = { commands: [] }
  }
  return cached
}

/**
 * Save discovered commands to disk
 */
async function save(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
  await writeJsonAtomic(getDiscoveredFile(), cached)
}

/**
 * Get all discovered commands
 */
export function getAllDiscovered(): DiscoveredCommand[] {
  return cached.commands
}

/**
 * Add multiple discovered commands (from a scan)
 */
export async function addDiscoveredCommands(commands: DiscoveredCommand[]): Promise<void> {
  const existing = new Set(cached.commands.map((c) => c.executable))
  const newOnes = commands.filter((c) => !existing.has(c.executable))
  cached.commands.push(...newOnes)
  await save()
}

/**
 * Add a single manually-added command
 */
export async function addManualCommand(
  executable: string,
  category?: string
): Promise<DiscoveredCommand> {
  const existing = cached.commands.find((c) => c.executable === executable)
  if (existing) return existing

  const cmd: DiscoveredCommand = {
    executable,
    path: executable, // manual commands may not have a known path
    source: 'manual',
    enriched: false,
    addedAt: new Date().toISOString(),
    category
  }
  cached.commands.push(cmd)
  await save()
  return cmd
}

/**
 * Remove a discovered/manual command
 */
export async function removeDiscoveredCommand(executable: string): Promise<void> {
  cached.commands = cached.commands.filter((c) => c.executable !== executable)
  await save()

  // Remove enriched definition files (including subcommand files)
  try {
    const manifest = await loadManifest(executable)
    for (const file of manifest) {
      try {
        await unlink(join(getEnrichedDir(), file))
      } catch {
        // File may not exist
      }
    }
    // Remove the manifest itself
    try {
      await unlink(manifestPath(executable))
    } catch {
      // ignore
    }
    // Also try the single file (backwards compat)
    try {
      await unlink(join(getEnrichedDir(), `${executable}.json`))
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

/**
 * Clear all user-added discovered/manual commands and their enriched command trees.
 * Leaves builtin command definitions untouched.
 */
export async function resetCommandTrees(): Promise<void> {
  cached = { commands: [] }
  await save()

  try {
    await rm(getEnrichedDir(), { recursive: true, force: true })
  } catch {
    // ignore reset cleanup failures
  }
}

/**
 * Mark a discovered command as enriched and save its generated definition
 * (single command, no subcommands — backwards compatible)
 */
export async function saveEnrichedCommand(
  executable: string,
  definition: CommandDefinition
): Promise<void> {
  // Update enriched flag
  const cmd = cached.commands.find((c) => c.executable === executable)
  if (cmd) {
    cmd.enriched = true
    await save()
  }

  // Save full definition to enriched commands directory
  await mkdir(getEnrichedDir(), { recursive: true })
  await writeJsonAtomic(join(getEnrichedDir(), `${executable}.json`), definition)
}

/**
 * Save multiple enriched definitions for an executable (parent + subcommands).
 * Creates a manifest file that lists all definition files for this executable.
 *
 * @param executable - The base executable name (e.g., "openclaw")
 * @param definitions - Array of CommandDefinitions (parent + subcommands)
 */
export async function saveEnrichedBulk(
  executable: string,
  definitions: CommandDefinition[]
): Promise<void> {
  // Update enriched flag
  const cmd = cached.commands.find((c) => c.executable === executable)
  if (cmd) {
    cmd.enriched = true
    await save()
  }

  await mkdir(getEnrichedDir(), { recursive: true })

  const dedupedDefinitions: CommandDefinition[] = []
  const seenKeys = new Set<string>()

  for (const definition of definitions) {
    const key = buildDefinitionKey(definition)
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    dedupedDefinitions.push(definition)
  }

  const previousManifest = await loadManifest(executable)

  const fileNames: string[] = []

  for (const def of dedupedDefinitions) {
    // Use id as filename to ensure uniqueness (e.g., "detected-openclaw-agent.json")
    const fileName = `${def.id}.json`
    fileNames.push(fileName)
    await writeJsonAtomic(join(getEnrichedDir(), fileName), def)
  }

  // Write manifest so loader knows which files belong to this executable
  await writeJsonAtomic(manifestPath(executable), fileNames)

  const nextFiles = new Set(fileNames)
  for (const oldFile of previousManifest) {
    if (nextFiles.has(oldFile)) continue
    try {
      await unlink(join(getEnrichedDir(), oldFile))
    } catch {
      // ignore stale files that no longer exist
    }
  }
}

/**
 * Load the manifest for an executable (list of definition file names)
 */
async function loadManifest(executable: string): Promise<string[]> {
  try {
    const raw = await readFile(manifestPath(executable), 'utf-8')
    const files = JSON.parse(raw)
    return Array.isArray(files) ? files : []
  } catch {
    // On Windows, try the legacy .exe-suffixed manifest for backwards compat
    if (process.platform === 'win32') {
      try {
        const raw = await readFile(manifestPath(`${executable}.exe`), 'utf-8')
        const files = JSON.parse(raw)
        return Array.isArray(files) ? files : []
      } catch { /* ignore */ }
    }
    return []
  }
}

/**
 * Load an enriched command definition from disk (single file)
 */
export async function loadEnrichedDefinition(
  executable: string
): Promise<CommandDefinition | null> {
  try {
    const raw = await readFile(join(getEnrichedDir(), `${executable}.json`), 'utf-8')
    return JSON.parse(raw) as CommandDefinition
  } catch {
    // On Windows, try the legacy .exe-suffixed filename for backwards compat
    if (process.platform === 'win32') {
      try {
        const raw = await readFile(join(getEnrichedDir(), `${executable}.exe.json`), 'utf-8')
        const def = JSON.parse(raw) as CommandDefinition
        def.executable = executable // normalise to bare name
        return def
      } catch { /* ignore */ }
    }
    return null
  }
}

/**
 * Load all enriched definitions for an executable.
 * First checks for a manifest (subcommand-aware), then falls back to single file.
 */
export async function loadEnrichedDefinitions(
  executable: string
): Promise<CommandDefinition[]> {
  const manifest = await loadManifest(executable)

  if (manifest.length > 0) {
    const definitions: CommandDefinition[] = []
    for (const fileName of manifest) {
      try {
        const raw = await readFile(join(getEnrichedDir(), fileName), 'utf-8')
        const def = JSON.parse(raw) as CommandDefinition
        if (def.id && def.name && def.executable) {
          // Normalise legacy .exe names inside cached definitions
          if (process.platform === 'win32') {
            const ext = extname(def.executable).toLowerCase()
            if (WIN_EXECUTABLE_EXTENSIONS.has(ext)) {
              def.executable = def.executable.slice(0, -ext.length)
              def.name = def.name.replace(/\.exe\b/gi, '')
            }
          }
          definitions.push(def)
        }
      } catch {
        // Skip files that don't exist or fail to parse
      }
    }
    return definitions
  }

  // Fallback: try single file (backwards compat with pre-subcommand enrichment)
  const single = await loadEnrichedDefinition(executable)
  return single ? [single] : []
}

/**
 * Load all enriched definitions across all discovered commands
 */
export async function loadAllEnrichedDefinitions(): Promise<CommandDefinition[]> {
  const definitions: CommandDefinition[] = []
  for (const cmd of cached.commands) {
    if (cmd.enriched) {
      const defs = await loadEnrichedDefinitions(cmd.executable)
      definitions.push(...defs)
    }
  }
  return definitions
}
