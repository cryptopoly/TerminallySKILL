import { create } from 'zustand'
import type { SessionLogMeta } from '../../../shared/log-schema'

interface LogStore {
  logs: SessionLogMeta[]
  loading: boolean
  selectedLog: SessionLogMeta | null
  selectedLogContent: string | null
  searchQuery: string
  /** A run to open in Runs & Logs as soon as the list has loaded (set by the schedule history) */
  pendingRunId: string | null
  setLogs: (logs: SessionLogMeta[]) => void
  setLoading: (loading: boolean) => void
  setSelectedLog: (log: SessionLogMeta | null) => void
  setSelectedLogContent: (content: string | null) => void
  setSearchQuery: (query: string) => void
  setPendingRunId: (runId: string | null) => void
}

export const useLogStore = create<LogStore>((set) => ({
  logs: [],
  loading: false,
  selectedLog: null,
  selectedLogContent: null,
  searchQuery: '',
  pendingRunId: null,
  setLogs: (logs) => set({ logs }),
  setLoading: (loading) => set({ loading }),
  setSelectedLog: (log) => set({ selectedLog: log }),
  setSelectedLogContent: (content) => set({ selectedLogContent: content }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPendingRunId: (runId) => set({ pendingRunId: runId })
}))
