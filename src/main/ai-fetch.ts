import { translateNativeSync } from './native-i18n'
import { recordOutboundRequest } from './network-log'

/** Time allowed for an AI request before it is aborted. Local models load and generate slowly. */
export const AI_REQUEST_TIMEOUT_MS = 90_000
export const LOCAL_AI_REQUEST_TIMEOUT_MS = 300_000
/** Time allowed for lightweight provider checks such as listing models */
export const AI_PROBE_TIMEOUT_MS = 15_000

/**
 * fetch with a hard timeout. Without one, an unreachable or stalled provider leaves the
 * review dialog spinning indefinitely.
 */
export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = AI_PROBE_TIMEOUT_MS
): Promise<Response> {
  try {
    const response = await fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) })
    recordOutboundRequest(input, 'ai', response.status)
    return response
  } catch (error) {
    recordOutboundRequest(input, 'ai', null)
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(translateNativeSync('errors.aiTimeout', { seconds: Math.round(timeoutMs / 1000) }))
    }
    throw error
  }
}
