import { open, rename, unlink } from 'fs/promises'

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
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`
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
