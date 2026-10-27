import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { readJsonFile, writeFileAtomic, writeJsonAtomic } from './atomic-write'

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

describe('readJsonFile', () => {
  const parse = (value: unknown): { n: number } => value as { n: number }

  it('returns the fallback when the file does not exist', async () => {
    const result = await readJsonFile(join(workDir, 'missing.json'), parse, () => ({ n: 0 }))
    expect(result).toEqual({ n: 0 })
  })

  it('parses an existing file', async () => {
    const target = join(workDir, 'data.json')
    await writeFile(target, '{"n":7}', 'utf-8')
    expect(await readJsonFile(target, parse, () => ({ n: 0 }))).toEqual({ n: 7 })
  })

  it('moves an unparseable file aside instead of letting a later save overwrite it', async () => {
    const target = join(workDir, 'data.json')
    await writeFile(target, '{"n": 7', 'utf-8')

    expect(await readJsonFile(target, parse, () => ({ n: 0 }))).toEqual({ n: 0 })

    const files = await readdir(workDir)
    const quarantined = files.find((name) => name.startsWith('data.json.corrupt-'))
    expect(quarantined).toBeDefined()
    expect(files).not.toContain('data.json')
    expect(await readFile(join(workDir, quarantined!), 'utf-8')).toBe('{"n": 7')
  })

  it('moves the file aside when the parse callback throws', async () => {
    const target = join(workDir, 'data.json')
    await writeFile(target, '{}', 'utf-8')
    const strict = (): { n: number } => {
      throw new Error('bad shape')
    }

    expect(await readJsonFile(target, strict, () => ({ n: 0 }))).toEqual({ n: 0 })
    expect((await readdir(workDir)).some((name) => name.startsWith('data.json.corrupt-'))).toBe(true)
  })

  it('rethrows non-ENOENT read errors rather than reporting empty data', async () => {
    // A directory at the path makes readFile fail with EISDIR
    await expect(readJsonFile(workDir, parse, () => ({ n: 0 }))).rejects.toThrow()
  })
})
