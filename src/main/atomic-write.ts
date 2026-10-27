import { randomUUID } from 'crypto'
import { open, readFile, rename, unlink } from 'fs/promises'

/**
 * Write data to a file atomically: write to a sibling temp file, fsync it, then rename
 * over the target. rename is atomic on POSIX — an interrupted write (crash, sign-out,
 * power loss) can never leave the target file truncated or half-written.
 */
export async function writeFileAtomic(
  filePath: string,
  data: string | Uint8Array,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`
  try {
    const handle = await open(tmpPath, 'w')
    try {
      await handle.writeFile(data, encoding)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await rename(tmpPath, filePath)
  } catch (err) {
    try {
      await unlink(tmpPath)
    } catch {
      // Temp file may not exist; that's fine.
    }
    throw err
  }
}

export async function writeJsonAtomic(filePath: string, data: unknown): Promise<void> {
  await writeFileAtomic(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Read a JSON data file, returning `fallback()` when it does not exist yet.
 *
 * A file that exists but cannot be parsed is renamed to `<file>.corrupt-<timestamp>.json`
 * before falling back, so the next routine save cannot overwrite the user's only copy.
 * Other read errors (permissions, I/O) are rethrown: treating those as "empty" would let
 * the next save wipe data that is merely unreadable right now.
 */
export async function readJsonFile<T>(
  filePath: string,
  parse: (value: unknown) => T,
  fallback: () => T
): Promise<T> {
  let raw: string
  try {
    raw = await readFile(filePath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback()
    throw err
  }

  try {
    return parse(JSON.parse(raw))
  } catch (err) {
    const quarantinePath = `${filePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    console.error(`[data] ${filePath} is unreadable (${(err as Error).message}); moving it to ${quarantinePath}`)
    await rename(filePath, quarantinePath)
    return fallback()
  }
}
