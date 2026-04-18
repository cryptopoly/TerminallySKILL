import { readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { writeJsonAtomic } from './atomic-write'
import type { AppSettings, AIProvider } from '../shared/settings-schema'
import { DEFAULT_SETTINGS } from '../shared/settings-schema'
import { getStoredProviderApiKeys, setStoredProviderApiKeys } from './secret-manager'
import {
  applyProviderApiKeys,
  backfillSettings,
  extractProviderApiKeys,
  stripProviderApiKeys
} from './settings-persistence'
import { getDataDir } from './user-data-path'

let cached: AppSettings | null = null

function getSettingsFile(): string {
  return join(getDataDir(), 'settings.json')
}

const OPENAI_COMPATIBLE_PROVIDER_IDS = new Set<AIProvider['id']>([
  'openrouter',
  'groq',
  'mistral',
  'together',
  'fireworks',
  'xai',
  'deepseek',
  'openai-compatible',
  'lmstudio'
])

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true })
}

async function load(): Promise<AppSettings> {
  if (cached) return cached
  let migratedPersistedKeys = false
  let data = structuredClone(DEFAULT_SETTINGS)
  let mergedApiKeys: Record<string, string> = {}

  try {
    const raw = await readFile(getSettingsFile(), 'utf-8')
    data = backfillSettings(JSON.parse(raw) as Partial<AppSettings>)
    const storedApiKeys = await getStoredProviderApiKeys()
    const legacyApiKeys = extractProviderApiKeys(data)
    mergedApiKeys = { ...storedApiKeys, ...legacyApiKeys }

    if (Object.keys(legacyApiKeys).length > 0) {
      await setStoredProviderApiKeys(mergedApiKeys)
      migratedPersistedKeys = true
    }
  } catch {
    mergedApiKeys = await getStoredProviderApiKeys()
  }

  cached = applyProviderApiKeys(stripProviderApiKeys(data), mergedApiKeys)

  if (migratedPersistedKeys) {
    await save()
  }

  return cached
}

async function save(): Promise<void> {
  if (!cached) return
  await ensureDataDir()
  await setStoredProviderApiKeys(extractProviderApiKeys(cached))
  const persistable = stripProviderApiKeys(cached)
  await writeJsonAtomic(getSettingsFile(), persistable)
}

export async function getSettings(): Promise<AppSettings> {
  return load()
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const settings = await load()
  Object.assign(settings, updates)
  await save()
  return settings
}

export async function updateProvider(
  providerId: string,
  updates: Partial<AIProvider>
): Promise<AppSettings> {
  const settings = await load()
  const provider = settings.aiProviders.find((p) => p.id === providerId)
  if (provider) {
    Object.assign(provider, updates)
  }
  await save()
  return settings
}

export async function testAIConnection(
  providerId: string
): Promise<{ success: boolean; error?: string }> {
  const settings = await load()
  const provider = settings.aiProviders.find((p) => p.id === providerId)
  if (!provider) return { success: false, error: 'Provider not found' }

  try {
    if (provider.id === 'ollama') {
      const res = await fetch(`${provider.baseUrl}/api/tags`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { success: true }
    }

    if (provider.id === 'openai') {
      if (!provider.apiKey) return { success: false, error: 'API key required' }
      const res = await fetch(`${provider.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      return { success: true }
    }

    if (provider.id === 'anthropic') {
      if (!provider.apiKey) return { success: false, error: 'API key required' }
      const res = await fetch(`${provider.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: provider.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }]
        })
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      return { success: true }
    }

    if (provider.id === 'gemini') {
      if (!provider.apiKey) return { success: false, error: 'API key required' }
      const res = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'x-goog-api-key': provider.apiKey
        }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      return { success: true }
    }

    if (OPENAI_COMPATIBLE_PROVIDER_IDS.has(provider.id)) {
      const headers: Record<string, string> = {}
      if (provider.connectionType !== 'local') {
        if (!provider.apiKey) return { success: false, error: 'API key required' }
        headers.Authorization = `Bearer ${provider.apiKey}`
      } else if (provider.apiKey.trim()) {
        headers.Authorization = `Bearer ${provider.apiKey}`
      }

      const res = await fetch(`${provider.baseUrl}/models`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      return { success: true }
    }

    return { success: false, error: 'Unknown provider' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function uniqueSortedModels(models: string[]): string[] {
  return [...new Set(models.map((model) => model.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  )
}

export async function listAIModels(
  providerId: string
): Promise<{ success: boolean; models: string[]; error?: string }> {
  const settings = await load()
  const provider = settings.aiProviders.find((p) => p.id === providerId)
  if (!provider) return { success: false, models: [], error: 'Provider not found' }
  if (!provider.enabled) return { success: false, models: [], error: 'Connect the provider first' }

  try {
    if (provider.id === 'ollama') {
      const res = await fetch(`${provider.baseUrl}/api/tags`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as { models?: Array<{ name?: string }> }
      return {
        success: true,
        models: uniqueSortedModels((body.models ?? []).map((entry) => entry.name ?? ''))
      }
    }

    if (provider.connectionType !== 'local' && !provider.apiKey.trim()) {
      return { success: false, models: [], error: 'API key required' }
    }

    if (provider.id === 'openai') {
      const res = await fetch(`${provider.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const body = (await res.json()) as { data?: Array<{ id?: string }> }
      return {
        success: true,
        models: uniqueSortedModels((body.data ?? []).map((entry) => entry.id ?? ''))
      }
    }

    if (provider.id === 'anthropic') {
      const res = await fetch(`${provider.baseUrl}/v1/models`, {
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01'
        }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const body = (await res.json()) as { data?: Array<{ id?: string; display_name?: string }> }
      return {
        success: true,
        models: uniqueSortedModels((body.data ?? []).map((entry) => entry.id ?? entry.display_name ?? ''))
      }
    }

    if (provider.id === 'gemini') {
      const res = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'x-goog-api-key': provider.apiKey
        }
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const body = (await res.json()) as { models?: Array<{ name?: string }> }
      return {
        success: true,
        models: uniqueSortedModels(
          (body.models ?? []).map((entry) =>
            (entry.name ?? '').replace(/^models\//, '')
          )
        )
      }
    }

    if (OPENAI_COMPATIBLE_PROVIDER_IDS.has(provider.id)) {
      const headers: Record<string, string> = {}
      if (provider.connectionType !== 'local') {
        headers.Authorization = `Bearer ${provider.apiKey}`
      } else if (provider.apiKey.trim()) {
        headers.Authorization = `Bearer ${provider.apiKey}`
      }

      const res = await fetch(`${provider.baseUrl}/models`, { headers })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`)
      }
      const body = (await res.json()) as { data?: Array<{ id?: string }> }
      return {
        success: true,
        models: uniqueSortedModels((body.data ?? []).map((entry) => entry.id ?? ''))
      }
    }

    return { success: false, models: [], error: 'Unknown provider' }
  } catch (err) {
    return { success: false, models: [], error: err instanceof Error ? err.message : String(err) }
  }
}
