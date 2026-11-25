import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { missingConptyFiles, restoreConptyFiles } from '../../scripts/node-pty-conpty.mjs'

let nodePtyDir: string

function writeFile(relativePath: string, content = ''): void {
  const file = join(nodePtyDir, relativePath)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}

function read(relativePath: string): string {
  return readFileSync(join(nodePtyDir, relativePath), 'utf8')
}

/** node-pty as npm installs it: prebuilt modules with the bundled ConPTY next to them, and a copy in third_party. */
function installNodePty(): void {
  for (const arch of ['x64', 'arm64']) {
    writeFile(`prebuilds/win32-${arch}/conpty.node`)
    for (const file of ['conpty.dll', 'OpenConsole.exe']) {
      writeFile(`prebuilds/win32-${arch}/conpty/${file}`, `${arch} ${file}`)
      writeFile(`third_party/conpty/1.23.251008001/win10-${arch}/${file}`, `${arch} ${file}`)
    }
  }
}

/** What `node-gyp rebuild` leaves: a fresh build folder with the compiled module and nothing else. */
function rebuildNodePty(): void {
  rmSync(join(nodePtyDir, 'build'), { recursive: true, force: true })
  writeFile('build/Release/conpty.node')
}

beforeEach(() => {
  nodePtyDir = mkdtempSync(join(tmpdir(), 'tsk-node-pty-'))
  installNodePty()
})

afterEach(() => {
  rmSync(nodePtyDir, { recursive: true, force: true })
})

describe('bundled ConPTY files next to node-pty', () => {
  it('a prebuilt node-pty has them, and nothing is copied', () => {
    expect(missingConptyFiles(nodePtyDir, 'x64')).toEqual([])

    restoreConptyFiles(nodePtyDir, 'x64')
    expect(existsSync(join(nodePtyDir, 'build'))).toBe(false)
  })

  it('a rebuilt node-pty has lost them', () => {
    rebuildNodePty()

    expect(missingConptyFiles(nodePtyDir, 'x64')).toEqual([
      join(nodePtyDir, 'build', 'Release', 'conpty', 'conpty.dll'),
      join(nodePtyDir, 'build', 'Release', 'conpty', 'OpenConsole.exe')
    ])
  })

  it('restoring puts the files for the given architecture next to the rebuilt module', () => {
    rebuildNodePty()
    restoreConptyFiles(nodePtyDir, 'arm64')

    expect(missingConptyFiles(nodePtyDir, 'arm64')).toEqual([])
    expect(read('build/Release/conpty/conpty.dll')).toBe('arm64 conpty.dll')
    expect(read('build/Release/conpty/OpenConsole.exe')).toBe('arm64 OpenConsole.exe')
  })

  it('restoring replaces files left from a build for another architecture', () => {
    rebuildNodePty()
    restoreConptyFiles(nodePtyDir, 'x64')
    restoreConptyFiles(nodePtyDir, 'arm64')

    expect(read('build/Release/conpty/conpty.dll')).toBe('arm64 conpty.dll')
  })

  it('reports a file missing next to the prebuilt module when nothing was rebuilt', () => {
    rmSync(join(nodePtyDir, 'prebuilds', 'win32-arm64', 'conpty', 'OpenConsole.exe'))

    expect(missingConptyFiles(nodePtyDir, 'arm64')).toEqual([
      join(nodePtyDir, 'prebuilds', 'win32-arm64', 'conpty', 'OpenConsole.exe')
    ])
    expect(missingConptyFiles(nodePtyDir, 'x64')).toEqual([])
  })
})
