// Chart chrome/ink tokens from the validated data-viz reference, plus a hook
// that resolves the active theme (light/dark/system) and applies the `dark`
// class to <html> so Tailwind's dark: variants and these tokens stay in sync.

import { useEffect, useState } from 'react'

export const CHROME = {
  light: {
    surface: '#fcfcfb',
    plane: '#f9f9f7',
    textPrimary: '#0b0b0b',
    textSecondary: '#52514e',
    muted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    good: '#006300',
    bad: '#d03b3b',
  },
  dark: {
    surface: '#1a1a19',
    plane: '#0d0d0d',
    textPrimary: '#ffffff',
    textSecondary: '#c3c2b7',
    muted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    good: '#0ca30c',
    bad: '#e66767',
  },
}

function systemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveDark(themeSetting) {
  if (themeSetting === 'dark') return true
  if (themeSetting === 'light') return false
  return systemPrefersDark()
}

// Returns { dark, chrome } and keeps the <html> class + system listener current.
export function useTheme(themeSetting) {
  const [dark, setDark] = useState(() => resolveDark(themeSetting))

  useEffect(() => {
    setDark(resolveDark(themeSetting))
    if (themeSetting !== 'system' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [themeSetting])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
  }, [dark])

  return { dark, chrome: dark ? CHROME.dark : CHROME.light }
}
