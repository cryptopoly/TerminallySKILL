import { execFile } from 'child_process'
import { ipcMain } from 'electron'
import * as fs from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import {
  listDirectoryContents,
  createEmptyFile,
  openInSystemExplorer,
  revealInSystemExplorer
} from '../project-manager'
import { approveExternalPath } from '../path-approvals'
import { ALL_KNOWN_PATH_ROOT_KINDS, observePathAccess } from '../path-access'
import {
  optionalBoolean,
  requirePlainObject,
  requireString
} from './validation'

type ReadFileContentResult =
  | { content: string; truncated: boolean; size: number; modifiedAt: number }
  | { tooLarge: true; size: number; modifiedAt: number }
  | { error: string }

async function resolveObservedFilePath(
  pathValue: string,
  purpose: string,
  options: {
    mode?: 'allow' | 'enforce'
    warnIfOutsideKnownRoots?: boolean
  } = {}
): Promise<string> {
  const observed = await observePathAccess(pathValue, {
    purpose,
    expectedKinds: [...ALL_KNOWN_PATH_ROOT_KINDS],
    mode: options.mode,
    warnIfOutsideKnownRoots: options.warnIfOutsideKnownRoots
  })
  return observed.path
}

function readFileContentFromDisk(filePath: string): ReadFileContentResult {
  const PREVIEW_BYTES = 5 * 1024 * 1024
  const MAX_BYTES = 50 * 1024 * 1024
  const stat = fs.statSync(filePath)
  if (stat.size > MAX_BYTES) {
    return { tooLarge: true, size: stat.size, modifiedAt: stat.mtimeMs }
  }
  if (stat.size > PREVIEW_BYTES) {
    const fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(PREVIEW_BYTES)
    fs.readSync(fd, buf, 0, PREVIEW_BYTES, 0)
    fs.closeSync(fd)
    return {
      content: buf.toString('utf8'),
      truncated: true,
      size: stat.size,
      modifiedAt: stat.mtimeMs
    }
  }

  const content = fs.readFileSync(filePath, 'utf8')
  return { content, truncated: false, size: stat.size, modifiedAt: stat.mtimeMs }
}

export function registerFileIpcHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.FILES_LIST_DIR,
    async (_event, dirPath: string, includeHidden?: boolean) => {
      return listDirectoryContents(
        await resolveObservedFilePath(requireString(dirPath, 'dirPath'), 'files:list-dir'),
        optionalBoolean(includeHidden, 'includeHidden')
      )
    }
  )

  ipcMain.handle(IPC_CHANNELS.FILES_CREATE_FILE, async (_event, filePath: string) => {
    try {
      await createEmptyFile(
        await resolveObservedFilePath(requireString(filePath, 'filePath'), 'files:create-file', {
          mode: 'enforce'
        })
      )
      return { success: true }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_GET_METADATA, async (_event, filePath: string) => {
    try {
      const stat = fs.statSync(
        await resolveObservedFilePath(requireString(filePath, 'filePath'), 'files:get-metadata')
      )
      return { size: stat.size, modifiedAt: stat.mtimeMs }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_READ_CONTENT, async (_event, filePath: string) => {
    try {
      const safeFilePath = await resolveObservedFilePath(
        requireString(filePath, 'filePath'),
        'files:read-content'
      )
      return readFileContentFromDisk(safeFilePath)
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_READ_SCOPED_CONTENT, async (_event, filePath: string) => {
    try {
      const safeFilePath = await resolveObservedFilePath(
        requireString(filePath, 'filePath'),
        'files:read-scoped-content',
        { mode: 'enforce' }
      )
      return readFileContentFromDisk(safeFilePath)
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_READ_APPROVED_CONTENT, async (_event, filePath: string) => {
    try {
      const requestedPath = requireString(filePath, 'filePath')
      // This channel is only reachable after the user picked a file via a native
      // open dialog (consent happens in the renderer). Register the approval
      // before enforce so the path becomes a known root and passes the check.
      approveExternalPath(requestedPath, 'file')
      const safeFilePath = await resolveObservedFilePath(
        requestedPath,
        'files:read-approved-content',
        { mode: 'enforce' }
      )
      return readFileContentFromDisk(safeFilePath)
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_WRITE_CONTENT, async (_event, filePath: string, content: string) => {
    try {
      const safeFilePath = await resolveObservedFilePath(
        requireString(filePath, 'filePath'),
        'files:write-content',
        { mode: 'enforce' }
      )
      const safeContent = requireString(content, 'content')
      fs.writeFileSync(safeFilePath, safeContent, 'utf8')
      const stat = fs.statSync(safeFilePath)
      return {
        success: true,
        size: Buffer.byteLength(safeContent, 'utf8'),
        modifiedAt: stat.mtimeMs
      }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.FILES_OPEN_IN_EXPLORER, async (_event, dirPath: string) => {
    return openInSystemExplorer(
      await resolveObservedFilePath(requireString(dirPath, 'dirPath'), 'files:open-in-explorer')
    )
  })

  ipcMain.handle(IPC_CHANNELS.FILES_REVEAL_IN_EXPLORER, async (_event, filePath: string) => {
    return revealInSystemExplorer(
      await resolveObservedFilePath(requireString(filePath, 'filePath'), 'files:reveal-in-explorer')
    )
  })

  ipcMain.handle(IPC_CHANNELS.FILES_CHECK_EXECUTABLE, async (_event, filePath: string): Promise<boolean> => {
    try {
      fs.accessSync(
        await resolveObservedFilePath(requireString(filePath, 'filePath'), 'files:check-executable'),
        fs.constants.X_OK
      )
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.FILES_SEARCH,
    async (
      _event,
      rootDir: string,
      query: string,
      options: { caseSensitive?: boolean; regex?: boolean; glob?: string } = {}
    ): Promise<{
      results: Array<{ filePath: string; matches: Array<{ lineNumber: number; lineText: string }> }>
      error?: string
      usedRipgrep: boolean
    }> => {
      const safeRootDir = await resolveObservedFilePath(
        requireString(rootDir, 'rootDir'),
        'files:search-root'
      )
      const safeQuery = requireString(query, 'query')
      const rawOptions = options === undefined ? {} : requirePlainObject(options, 'options')
      const safeOptions = {
        caseSensitive: optionalBoolean(rawOptions.caseSensitive, 'options.caseSensitive'),
        regex: optionalBoolean(rawOptions.regex, 'options.regex'),
        glob: rawOptions.glob === undefined ? undefined : requireString(rawOptions.glob, 'options.glob')
      }

      if (!safeQuery.trim() || !safeRootDir) return { results: [], usedRipgrep: false }

      const tryRipgrep = (): Promise<string | null> => new Promise((resolve) => {
        const args = ['--json', '--max-count', '50', '--max-filesize', '1M']
        if (!safeOptions.caseSensitive) args.push('--ignore-case')
        if (!safeOptions.regex) args.push('--fixed-strings')
        if (safeOptions.glob) args.push('--glob', safeOptions.glob)
        args.push('--', safeQuery, safeRootDir)

        execFile('rg', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
          if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
            resolve(null)
          } else {
            resolve(stdout)
          }
        })
      })

      const rgOutput = await tryRipgrep()

      if (rgOutput !== null) {
        const fileMap = new Map<string, Array<{ lineNumber: number; lineText: string }>>()
        for (const line of rgOutput.split('\n')) {
          if (!line.trim()) continue
          try {
            const obj = JSON.parse(line) as {
              type: string
              data: { path?: { text: string }; line_number?: number; lines?: { text: string } }
            }
            if (obj.type === 'match' && obj.data.path?.text && obj.data.line_number && obj.data.lines?.text) {
              const fp = obj.data.path.text
              if (!fileMap.has(fp)) fileMap.set(fp, [])
              fileMap.get(fp)!.push({
                lineNumber: obj.data.line_number,
                lineText: obj.data.lines.text.replace(/\r?\n$/, '')
              })
            }
          } catch {
            // skip malformed lines
          }
        }
        return {
          results: [...fileMap.entries()].map(([filePath, matches]) => ({ filePath, matches })),
          usedRipgrep: true
        }
      }

      const skipDirs = new Set([
        '.git',
        'node_modules',
        '.venv',
        'venv',
        '__pycache__',
        'dist',
        'build',
        '.next',
        'out',
        'coverage'
      ])
      const maxFiles = 2000
      const maxFileBytes = 512 * 1024
      const results: Array<{ filePath: string; matches: Array<{ lineNumber: number; lineText: string }> }> = []
      const queryStr = safeOptions.caseSensitive ? safeQuery : safeQuery.toLowerCase()
      let fileCount = 0

      const walkDir = (dir: string): void => {
        if (fileCount >= maxFiles) return
        let entries: fs.Dirent[]
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true })
        } catch {
          return
        }

        for (const entry of entries) {
          if (fileCount >= maxFiles) return
          if (entry.isDirectory()) {
            if (!skipDirs.has(entry.name)) walkDir(`${dir}/${entry.name}`)
          } else if (entry.isFile()) {
            fileCount++
            const fp = `${dir}/${entry.name}`
            try {
              const stat = fs.statSync(fp)
              if (stat.size > maxFileBytes) continue
              const content = fs.readFileSync(fp, 'utf8')
              const lines = content.split('\n')
              const matches: Array<{ lineNumber: number; lineText: string }> = []
              for (let i = 0; i < lines.length; i++) {
                const line = safeOptions.caseSensitive ? lines[i] : lines[i].toLowerCase()
                if (line.includes(queryStr)) {
                  matches.push({ lineNumber: i + 1, lineText: lines[i].replace(/\r$/, '') })
                  if (matches.length >= 50) break
                }
              }
              if (matches.length > 0) results.push({ filePath: fp, matches })
            } catch {
              // skip unreadable files
            }
          }
        }
      }

      try {
        walkDir(safeRootDir)
        return { results, usedRipgrep: false }
      } catch (err) {
        return { results: [], error: String(err), usedRipgrep: false }
      }
    }
  )
}
