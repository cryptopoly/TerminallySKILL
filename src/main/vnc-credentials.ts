import { safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { getUserDataDir } from './user-data-path'

const CREDS_FILE = 'vnc-credentials.json'

function getCredsPath(): string {
  return path.join(getUserDataDir(), CREDS_FILE)
}

function loadStore(): Record<string, string> {
  try {
    const raw = fs.readFileSync(getCredsPath(), 'utf-8')
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function saveStore(store: Record<string, string>): void {
  const filePath = getCredsPath()
  fs.writeFileSync(filePath, JSON.stringify(store), { encoding: 'utf-8', mode: 0o600 })
}

export async function getVncPassword(storageKey: string): Promise<string | null> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) return null
  const store = loadStore()
  const encrypted = store[storageKey]
  if (!encrypted) return null
  try {
    return (await safeStorage.decryptStringAsync(Buffer.from(encrypted, 'base64'))).result
  } catch {
    return null
  }
}

export async function saveVncPassword(storageKey: string, password: string): Promise<void> {
  if (!(await safeStorage.isAsyncEncryptionAvailable())) return
  const encrypted = await safeStorage.encryptStringAsync(password)
  const store = loadStore()
  store[storageKey] = encrypted.toString('base64')
  saveStore(store)
}

export function deleteVncPassword(storageKey: string): void {
  const store = loadStore()
  delete store[storageKey]
  saveStore(store)
}
