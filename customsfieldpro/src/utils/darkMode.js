const KEY = 'customsfieldpro_dark_mode'

export function getDarkMode() {
  return localStorage.getItem(KEY) === 'true'
}

export function setDarkMode(enabled) {
  localStorage.setItem(KEY, enabled.toString())
  if (enabled) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function toggleDarkMode() {
  const current = getDarkMode()
  setDarkMode(!current)
  return !current
}

export function initDarkMode() {
  if (localStorage.getItem(KEY) === null) {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (systemDark) setDarkMode(true)
  } else if (getDarkMode()) {
    document.documentElement.classList.add('dark')
  }
}
