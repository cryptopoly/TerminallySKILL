import { shell } from 'electron'

const SAFE_EXTERNAL_PROTOCOLS = new Set(['https:'])

export function isSafeExternalUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) return false
    if (!parsed.hostname) return false
    return true
  } catch {
    return false
  }
}

export async function openSafeExternalUrl(value: string): Promise<boolean> {
  if (!isSafeExternalUrl(value)) return false
  await shell.openExternal(value)
  return true
}
