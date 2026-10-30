import type { OutboundPurpose, OutboundRequestRecord } from '../shared/privacy-schema'

const MAX_RECORDS = 100
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

const records: OutboundRequestRecord[] = []

export function isLocalHostname(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith('.localhost')
}

/** Reduce a URL to the host a person can recognise. Returns null for non-network URLs. */
export function describeOutboundUrl(input: string | URL): { host: string; local: boolean } | null {
  try {
    const url = typeof input === 'string' ? new URL(input) : input
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return { host: url.host, local: isLocalHostname(url.hostname) }
  } catch {
    return null
  }
}

export function recordOutboundRequest(
  input: string | URL,
  purpose: OutboundPurpose,
  status: number | null
): void {
  const target = describeOutboundUrl(input)
  if (!target) return

  records.push({ at: new Date().toISOString(), host: target.host, purpose, status, local: target.local })
  if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS)
}

/** Newest first. */
export function getOutboundRequests(): OutboundRequestRecord[] {
  return [...records].reverse()
}

export function clearOutboundRequests(): void {
  records.length = 0
}
