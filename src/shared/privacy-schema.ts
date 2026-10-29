export type OutboundPurpose = 'ai' | 'update' | 'other'

export interface OutboundRequestRecord {
  at: string
  /** Host (and port when not default) only. Paths, queries, headers and bodies are never kept. */
  host: string
  purpose: OutboundPurpose
  /** HTTP status, or null when the request failed before a response */
  status: number | null
  /** True when the host is this computer (Ollama, LM Studio, a local proxy) */
  local: boolean
}
