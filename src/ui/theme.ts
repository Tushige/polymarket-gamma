export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'nfl-markets-theme'

/** The viewer's own choice wins; without one, the OS setting decides. */
export function resolveTheme(
  stored: Theme | null,
  prefersDark: boolean,
): Theme {
  return stored ?? (prefersDark ? 'dark' : 'light')
}

/** Storage can be missing or blocked (private windows, tests): never throw. */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // The choice then lasts for this page only.
  }
}

/** null leaves the page to the OS setting. */
export function applyTheme(theme: Theme | null): void {
  if (theme === null) delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
}
