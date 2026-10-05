import { useState } from 'react'
import tool from './shared/tool.module.css'
import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  type Theme,
} from './theme'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

/** Shows the theme it switches to. The choice is remembered. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(
      readStoredTheme(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  )
  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  function toggle() {
    applyTheme(next)
    storeTheme(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      className={tool.button}
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
    >
      {next === 'light' ? <SunIcon /> : <MoonIcon />}
      <span>{next === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  )
}
