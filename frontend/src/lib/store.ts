import { create } from 'zustand'

interface AppState {
  username: string
  setUsername: (name: string) => void
  isAdmin: boolean
  setIsAdmin: (v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  username: localStorage.getItem('r3p_username') ?? '',
  setUsername: (name) => {
    localStorage.setItem('r3p_username', name)
    set({ username: name })
  },
  isAdmin: false,
  setIsAdmin: (v) => set({ isAdmin: v }),
}))
