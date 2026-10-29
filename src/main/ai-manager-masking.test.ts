import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type AIProvider, type AppSettings } from '../shared/settings-schema'
import type { AIActionRequest } from '../shared/ai-schema'

const { mockGetSettings } = vi.hoisted(() => ({ mockGetSettings: vi.fn() }))

vi.mock('./settings-manager', () => ({ getSettings: mockGetSettings }))

import { runAIAction } from './ai-manager'
import { getSecretMaskStats, resetSecretMaskStats } from './secret-mask-stats'

const TOKEN = 'ghp_' + 'Qw7'.repeat(12)
const AWS_ID = 'AKIA' + 'Z7Y6X5W4V3U2T1S0'

const RESPONSES: Record<string, unknown> = {
  openai: { output_text: 'ok' },
  anthropic: { content: [{ type: 'text', text: 'ok' }] },
  ollama: { message: { content: 'ok' } },
  gemini: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
  openrouter: { choices: [{ message: { content: 'ok' } }] }
}

function settingsFor(providerId: AIProvider['id'], maskSecrets = true): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    maskSecrets,
    aiRouting: { primary: null, fallbacks: [] },
    activeAIProvider: providerId,
    aiProviders: DEFAULT_SETTINGS.aiProviders.map((provider) => ({
      ...provider,
      enabled: provider.id === providerId,
      apiKey: provider.id === providerId ? 'provider-key' : '',
      baseUrl: 'http://127.0.0.1:9',
      model: 'test-model'
    }))
  }
}

const requests: AIActionRequest[] = [
  {
    action: 'output-review',
    source: 'terminal',
    focus: 'command-block',
    title: `Last command: export GITHUB_TOKEN=${TOKEN}`,
    transcript: `$ echo ${TOKEN}\n${TOKEN}\naws id ${AWS_ID}\n$ false`,
    exitCode: 1
  },
  { action: 'command-review', commandName: 'curl', commandString: `curl -H "Authorization: token ${TOKEN}" https://api.github.com` },
  { action: 'command-explain', commandName: 'mysql', commandString: 'mysql --password hunter2' },
  {
    action: 'chat-followup',
    context: `PASSWORD=hunter2\n${TOKEN}`,
    conversation: `user: is ${AWS_ID} valid?`,
    question: `why does ${TOKEN} fail?`
  },
  { action: 'artifact-improvement', artifactType: 'snippet', title: 'deploy', content: `export TOKEN=${TOKEN}` }
]

describe('runAIAction secret masking', () => {
  let bodies: string[]

  beforeEach(() => {
    resetSecretMaskStats()
    bodies = []
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(providerId: string): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body))
        return new Response(JSON.stringify(RESPONSES[providerId]), { status: 200 })
      })
    )
  }

  it.each(['openai', 'anthropic', 'ollama', 'gemini', 'openrouter'] as const)(
    'sends no secret to %s for any action',
    async (providerId) => {
      mockGetSettings.mockResolvedValue(settingsFor(providerId))
      stubFetch(providerId)

      for (const request of requests) {
        await runAIAction(request)
      }

      expect(bodies).toHaveLength(requests.length)
      for (const body of bodies) {
        expect(body).not.toContain(TOKEN)
        expect(body).not.toContain(AWS_ID)
        expect(body).not.toContain('hunter2')
      }
      expect(bodies[0]).toContain('[hidden: GitHub token]')
      expect(getSecretMaskStats().ai['github-token']).toBeGreaterThanOrEqual(5)
      expect(getSecretMaskStats().ai.password).toBe(2)
    }
  )

  it('does not leak the tail of a token cut by transcript truncation', async () => {
    mockGetSettings.mockResolvedValue(settingsFor('ollama'))
    stubFetch('ollama')
    // The prompt keeps the last 12,000 characters; place the token across that boundary.
    const tail = 'x'.repeat(12_000 - 20)
    await runAIAction({
      action: 'output-review',
      source: 'terminal',
      focus: 'session',
      title: 'Session',
      transcript: `${TOKEN}\n${tail}`
    })
    expect(bodies[0]).not.toContain(TOKEN.slice(-20))
  })

  it('sends the text unchanged when masking is off', async () => {
    mockGetSettings.mockResolvedValue(settingsFor('ollama', false))
    stubFetch('ollama')
    await runAIAction(requests[2])
    expect(bodies[0]).toContain('hunter2')
    expect(getSecretMaskStats().ai).toEqual({})
  })
})
