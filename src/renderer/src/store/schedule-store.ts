import { create } from 'zustand'
import type { Schedule } from '../../../shared/schedule-schema'

interface ScheduleStore {
  schedules: Schedule[]
  refresh: () => Promise<void>
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  schedules: [],
  refresh: async () => {
    set({ schedules: await window.electronAPI.getSchedules() })
  }
}))
