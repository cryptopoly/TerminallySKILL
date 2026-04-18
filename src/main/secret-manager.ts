import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { safeStorage } from 'electron'
import { writeJsonAtomic } from './atomic-write'
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

export function encodeSecretValue(secret: string): SecretEnvelope {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      mode: 'safeStorage',
      value: safeStorage.encryptString(secret).toString('base64')
    }
  }

  return {
    mode: 'plain-base64',
    value: Buffer.from(secret, 'utf8').toString('base64')
  }
}

export function decodeSecretValue(envelope: SecretEnvelope): string {
  if (envelope.mode === 'plain-base64') {
    return Buffer.from(envelope.value, 'base64').toString('utf8')
  }

  if (!safeStorage.isEncryptionAvailable()) {
    return ''
  }

  return safeStorage.decryptString(Buffer.from(envelope.value, 'base64'))
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function loadStore(): Promise<SecretStore> {
  try {
    const raw = await readFile(getSecretsFile(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<SecretStore>
    return {
      aiProviderKeys: parsed.aiProviderKeys ?? {}
    }
  } catch {
    return structuredClone(EMPTY_STORE)
  }
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
      const apiKey = decodeSecretValue(envelope)
      if (!apiKey) continue
      apiKeys[providerId] = apiKey
    } catch {
      // Skip unreadable entries so one bad record does not break settings.
    }
  }

  return apiKeys
}

export async function setStoredProviderApiKeys(apiKeys: Record<string, string>): Promise<void> {
  const store: SecretStore = { aiProviderKeys: {} }

  for (const [providerId, apiKey] of Object.entries(apiKeys)) {
    if (!apiKey.trim()) continue
    store.aiProviderKeys[providerId] = encodeSecretValue(apiKey)
  }

  await saveStore(store)
}
