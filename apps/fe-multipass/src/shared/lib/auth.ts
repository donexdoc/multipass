import { create } from 'zustand'

interface AuthStore {
  accessToken: string | null
  refreshToken: string | null
  /** true while verifying a stored token on app startup */
  isVerifying: boolean
  setTokens: (access: string, refresh: string) => void
  clearTokens: () => void
  setVerified: () => void
  isAuthenticated: () => boolean
}

const initialToken = localStorage.getItem('accessToken')

export const useAuthStore = create<AuthStore>()((set, get) => ({
  accessToken: initialToken,
  refreshToken: localStorage.getItem('refreshToken'),
  isVerifying: !!initialToken,

  setTokens: (access, refresh) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    set({ accessToken: access, refreshToken: refresh, isVerifying: false })
  },

  clearTokens: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ accessToken: null, refreshToken: null, isVerifying: false })
  },

  setVerified: () => set({ isVerifying: false }),

  isAuthenticated: () => !!get().accessToken,
}))
