import { create } from 'zustand'
import type { UserProfile } from './api'

export type Mode = 'guided' | 'standard'

const isFirstVisit = !localStorage.getItem('r3p_visited')

interface AppState {
  username: string
  setUsername: (name: string) => void
  isAdmin: boolean
  setIsAdmin: (v: boolean) => void
  user: UserProfile | null
  setUser: (u: UserProfile | null) => void
  mode: Mode
  setMode: (m: Mode) => void
  preferredArch: string
  setPreferredArch: (a: string) => void
  visited: boolean
  markVisited: () => void
}

export const useAppStore = create<AppState>((set) => ({
  username: localStorage.getItem('r3p_username') ?? '',
  setUsername: (name) => {
    localStorage.setItem('r3p_username', name)
    set({ username: name })
  },
  isAdmin: false,
  setIsAdmin: (v) => set({ isAdmin: v }),
  user: null,
  setUser: (u) => {
    if (u) {
      localStorage.setItem('r3p_username', u.display_name)
      set({ user: u, username: u.display_name })
    } else {
      set({ user: null })
    }
  },
  mode: (localStorage.getItem('r3p_mode') as Mode | null) ?? (isFirstVisit ? 'guided' : 'standard'),
  setMode: (m) => {
    localStorage.setItem('r3p_mode', m)
    set({ mode: m })
  },
  preferredArch: localStorage.getItem('r3p_arch') ?? 'x86_64',
  setPreferredArch: (a) => {
    localStorage.setItem('r3p_arch', a)
    set({ preferredArch: a })
  },
  visited: !isFirstVisit,
  markVisited: () => {
    localStorage.setItem('r3p_visited', '1')
    set({ visited: true })
  },
}))
