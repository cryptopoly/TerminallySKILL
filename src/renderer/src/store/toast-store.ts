import { create } from 'zustand'

/** A short error message in the corner of the window. The text is an i18n key, translated when shown. */
export interface Toast {
  id: number
  /** i18n key with its namespace, for example 'terminal:openFailed.message' */
  messageKey: string
  values?: Record<string, string>
}

interface ToastStore {
  toasts: Toast[]
  showError: (messageKey: string, values?: Record<string, string>) => void
  dismiss: (id: number) => void
}

let nextToastId = 1

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showError: (messageKey, values) =>
    set((state) => ({ toasts: [...state.toasts, { id: nextToastId++, messageKey, values }] })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
}))
