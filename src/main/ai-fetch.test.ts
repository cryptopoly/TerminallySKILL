import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWithTimeout } from './ai-fetch'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchWithTimeout', () => {
  it('aborts a request that never answers and reports the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
        })
    )

    await expect(fetchWithTimeout('http://localhost:1', {}, 20)).rejects.toThrow(
      'AI provider did not respond within 0 seconds'
    )
  })

  it('passes responses through untouched', async () => {
    const response = new Response('ok')
    vi.stubGlobal('fetch', async () => response)
    await expect(fetchWithTimeout('http://localhost:1')).resolves.toBe(response)
  })
})
