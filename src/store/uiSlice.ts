import type { StateCreator } from 'zustand'

export type AppView = 'home' | 'editor'

export interface Toast {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

export interface UiSlice {
  view: AppView
  toasts: Toast[]
  setView: (view: AppView) => void
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  view: 'home',
  toasts: [],
  setView: (view) => set({ view }),
  addToast: (message, type = 'info') =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
})
