import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let encryptionAvailable = true
let dataDir = ''

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable,
    encryptString: (value: string) => Buffer.from(`enc:${value}`),
    decryptString: (buffer: Buffer) => buffer.toString('utf8').replace(/^enc:/, '')
  }
}))
vi.mock('./user-data-path', () => ({ getDataDir: () => dataDir }))

import { getStoredProviderApiKeys, setStoredProviderApiKeys } from './secret-manager'

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'secrets-'))
  encryptionAvailable = true
})

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true })
})

describe('secret-manager', () => {
  it('round-trips provider keys', async () => {
    await setStoredProviderApiKeys({ openai: 'sk-1', anthropic: 'sk-2' })
    expect(await getStoredProviderApiKeys()).toEqual({ openai: 'sk-1', anthropic: 'sk-2' })
  })

  it('does not delete keys it cannot decrypt when the keyring is unavailable', async () => {
    await setStoredProviderApiKeys({ openai: 'sk-1' })
    const before = await readFile(join(dataDir, 'secrets.json'), 'utf-8')

    encryptionAvailable = false
    expect(await getStoredProviderApiKeys()).toEqual({})
    // A settings save with no decryptable keys must not rebuild the store from nothing
    await setStoredProviderApiKeys({})

    expect(await readFile(join(dataDir, 'secrets.json'), 'utf-8')).toBe(before)

    encryptionAvailable = true
    expect(await getStoredProviderApiKeys()).toEqual({ openai: 'sk-1' })
  })

  it('removes a key the user cleared', async () => {
    await setStoredProviderApiKeys({ openai: 'sk-1', groq: 'sk-g' })
    await setStoredProviderApiKeys({ openai: 'sk-1', groq: '' })
    expect(await getStoredProviderApiKeys()).toEqual({ openai: 'sk-1' })
  })

  it('does not rewrite the file when nothing changed', async () => {
    await setStoredProviderApiKeys({ openai: 'sk-1' })
    const before = await readFile(join(dataDir, 'secrets.json'), 'utf-8')
    await setStoredProviderApiKeys({ openai: 'sk-1' })
    expect(await readFile(join(dataDir, 'secrets.json'), 'utf-8')).toBe(before)
  })
})
