import { mkdir } from 'fs/promises'
import { join } from 'path'
import { safeStorage } from 'electron'
import { readJsonFile, writeJsonAtomic } from './atomic-write'
import { getDataDir } from './user-data-path'

export interface SecretEnvelope {
  mode: 'safeStorage' | 'plain-base64'
  value: string
}

interface SecretStore {
  aiProviderKeys: Record<string, SecretEnvelope>
}

const EMPTY_STORE: SecretStore = { aiProviderKeys: {} }

function getSecretsFile(): string {
  return join(getDataDir(), 'secrets.json')
}

// Electron 45 deprecates the synchronous safeStorage calls (removed in 46). The async ones use
// the same OS key store and still decrypt values written by the synchronous API.
export async function encodeSecretValue(secret: string): Promise<SecretEnvelope> {
  if (await safeStorage.isAsyncEncryptionAvailable()) {
    return {
      mode: 'safeStorage',
      value: (await safeStorage.encryptStringAsync(secret)).toString('base64')
    }
  }

  return {
    mode: 'plain-base64',
    value: Buffer.from(secret, 'utf8').toString('base64')
  }
}

export async function decodeSecretValue(envelope: SecretEnvelope): Promise<string> {
  if (envelope.mode === 'plain-base64') {
    return Buffer.from(envelope.value, 'base64').toString('utf8')
  }

  if (!(await safeStorage.isAsyncEncryptionAvailable())) {
    return ''
  }

  return (await safeStorage.decryptStringAsync(Buffer.from(envelope.value, 'base64'))).result
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function loadStore(): Promise<SecretStore> {
  return readJsonFile(
    getSecretsFile(),
    (value) => ({ aiProviderKeys: (value as Partial<SecretStore>).aiProviderKeys ?? {} }),
    () => structuredClone(EMPTY_STORE)
  )
}

async function saveStore(store: SecretStore): Promise<void> {
  await ensureDataDir()
  await writeJsonAtomic(getSecretsFile(), store)
}

export async function getStoredProviderApiKeys(): Promise<Record<string, string>> {
  const store = await loadStore()
  const apiKeys: Record<string, string> = {}

  for (const [providerId, envelope] of Object.entries(store.aiProviderKeys)) {
    try {
      const apiKey = await decodeSecretValue(envelope)
      if (!apiKey) continue
      apiKeys[providerId] = apiKey
    } catch {
      // Skip unreadable entries so one bad record does not break settings.
    }
  }

  return apiKeys
}

async function tryDecode(envelope: SecretEnvelope): Promise<string | null> {
  try {
    return await decodeSecretValue(envelope)
  } catch {
    return null
  }
}

export async function setStoredProviderApiKeys(apiKeys: Record<string, string>): Promise<void> {
  const existing = (await loadStore()).aiProviderKeys
  const store: SecretStore = { aiProviderKeys: {} }

  for (const [providerId, apiKey] of Object.entries(apiKeys)) {
    if (!apiKey.trim()) continue
    const current = existing[providerId]
    // Keep the stored envelope when the value is unchanged so a settings save does not
    // re-encrypt (and rewrite) every key.
    store.aiProviderKeys[providerId] =
      current && (await tryDecode(current)) === apiKey ? current : await encodeSecretValue(apiKey)
  }

  // A key we cannot decrypt right now (keyring locked or unavailable) never reaches the
  // caller, so its absence from `apiKeys` does not mean the user removed it. Keep it.
  for (const [providerId, envelope] of Object.entries(existing)) {
    if (providerId in apiKeys || providerId in store.aiProviderKeys) continue
    if (!(await tryDecode(envelope))) store.aiProviderKeys[providerId] = envelope
  }

  if (JSON.stringify(store) === JSON.stringify({ aiProviderKeys: existing })) return
  await saveStore(store)
}
