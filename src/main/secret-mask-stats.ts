import type { SecretMaskStats } from '../shared/privacy-schema'
import { addSecretCounts, type SecretCounts } from '../shared/secret-mask'

// Session-only counts per kind. Secret values are never kept; the counts clear when the app quits.
const aiCounts: SecretCounts = {}
const logCounts: SecretCounts = {}
// A workflow run record is saved again on every step change, so keep the latest count per run
// instead of adding it up each time.
const runCounts = new Map<string, SecretCounts>()

export function recordMaskedForAI(counts: SecretCounts): void {
  addSecretCounts(aiCounts, counts)
}

export function recordMaskedForLog(counts: SecretCounts): void {
  addSecretCounts(logCounts, counts)
}

export function recordMaskedForRun(runId: string, counts: SecretCounts): void {
  if (Object.keys(counts).length === 0) {
    runCounts.delete(runId)
    return
  }
  runCounts.set(runId, counts)
}

export function getSecretMaskStats(): SecretMaskStats {
  const logs = addSecretCounts({}, logCounts)
  for (const counts of runCounts.values()) addSecretCounts(logs, counts)
  return { ai: { ...aiCounts }, logs }
}

export function resetSecretMaskStats(): void {
  for (const key of Object.keys(aiCounts)) delete aiCounts[key as keyof SecretCounts]
  for (const key of Object.keys(logCounts)) delete logCounts[key as keyof SecretCounts]
  runCounts.clear()
}
