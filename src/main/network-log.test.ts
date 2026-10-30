import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearOutboundRequests,
  describeOutboundUrl,
  getOutboundRequests,
  recordOutboundRequest
} from './network-log'

describe('network log', () => {
  beforeEach(() => clearOutboundRequests())

  it('keeps only the host, never the path, query or credentials', () => {
    recordOutboundRequest('https://user:pw@api.openai.com/v1/responses?key=secret', 'ai', 200)
    const [record] = getOutboundRequests()
    expect(record.host).toBe('api.openai.com')
    expect(JSON.stringify(record)).not.toMatch(/secret|pw|responses/)
  })

  it('flags local hosts', () => {
    expect(describeOutboundUrl('http://localhost:11434/api/chat')).toEqual({ host: 'localhost:11434', local: true })
    expect(describeOutboundUrl('http://127.0.0.1:1234/v1')?.local).toBe(true)
    expect(describeOutboundUrl('https://github.com/x')?.local).toBe(false)
  })

  it('ignores non-network URLs', () => {
    recordOutboundRequest('file:///Users/x/index.html', 'other', null)
    recordOutboundRequest('not a url', 'other', null)
    expect(getOutboundRequests()).toHaveLength(0)
  })

  it('returns newest first and caps the list', () => {
    for (let i = 0; i < 120; i += 1) recordOutboundRequest(`https://h${i}.example.com/`, 'other', 200)
    const all = getOutboundRequests()
    expect(all).toHaveLength(100)
    expect(all[0].host).toBe('h119.example.com')
  })
})
