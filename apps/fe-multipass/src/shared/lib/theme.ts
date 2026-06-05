import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
    }),
    { name: 'theme' },
  ),
)

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function initTheme() {
  const stored = localStorage.getItem('theme')
  let theme: Theme = 'dark'
  try {
    const parsed = JSON.parse(stored ?? '{}') as { state?: { theme?: Theme } }
    theme = parsed.state?.theme ?? 'dark'
  } catch {
    // use default
  }
  applyTheme(theme)
}
