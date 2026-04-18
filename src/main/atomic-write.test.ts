import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileAtomic, writeJsonAtomic } from './atomic-write'

let workDir: string

beforeEach(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'atomic-write-'))
})

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true })
})

describe('writeFileAtomic', () => {
  it('writes the data to the target file', async () => {
    const target = join(workDir, 'out.txt')
    await writeFileAtomic(target, 'hello world')
    expect(await readFile(target, 'utf-8')).toBe('hello world')
  })

  it('replaces existing content, not appends', async () => {
    const target = join(workDir, 'out.txt')
    await writeFile(target, 'old content', 'utf-8')
    await writeFileAtomic(target, 'new content')
    expect(await readFile(target, 'utf-8')).toBe('new content')
  })

  it('leaves no temp file behind on success', async () => {
    const target = join(workDir, 'out.txt')
    await writeFileAtomic(target, 'payload')
    const entries = await readdir(workDir)
    expect(entries).toEqual(['out.txt'])
  })

  it('does not corrupt the target if the write fails', async () => {
    const target = join(workDir, 'out.txt')
    await writeFile(target, 'original', 'utf-8')
    await expect(
      writeFileAtomic(join(workDir, 'missing-dir', 'x.txt'), 'boom')
    ).rejects.toBeDefined()
    expect(await readFile(target, 'utf-8')).toBe('original')
  })
})

describe('writeJsonAtomic', () => {
  it('writes pretty-printed JSON', async () => {
    const target = join(workDir, 'data.json')
    await writeJsonAtomic(target, { a: 1, b: [2, 3] })
    expect(await readFile(target, 'utf-8')).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })
})
