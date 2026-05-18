import { useState, useEffect } from 'react'
import { getDarkMode, setDarkMode, toggleDarkMode } from '../utils/darkMode'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getDarkMode)

  const toggle = () => {
    const next = toggleDarkMode()
    setIsDark(next)
  }

  const enable = () => { setDarkMode(true); setIsDark(true) }
  const disable = () => { setDarkMode(false); setIsDark(false) }

  useEffect(() => {
    const handler = () => setIsDark(getDarkMode())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return { isDark, toggle, enable, disable }
}
