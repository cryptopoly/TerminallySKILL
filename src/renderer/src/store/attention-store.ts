import { create } from 'zustand'
import type { AttentionEntry } from '../../../shared/attention'

interface AttentionStore {
  entries: Record<string, AttentionEntry>
  keepTipVisible: boolean
  setKeepTipVisible: (visible: boolean) => void
  raise: (sessionId: string, entry: AttentionEntry) => void
  clear: (sessionId: string) => void
}

export const useAttentionStore = create<AttentionStore>((set) => ({
  entries: {},
  keepTipVisible: false,
  setKeepTipVisible: (visible) => set({ keepTipVisible: visible }),
  raise: (sessionId, entry) =>
    set((state) => ({ entries: { ...state.entries, [sessionId]: entry } })),
  clear: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.entries)) return state
      const { [sessionId]: _removed, ...rest } = state.entries
      return { entries: rest }
    })
}))
