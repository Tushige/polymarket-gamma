import { useState } from 'react'
import styles from './App.module.css'
import type { Game } from './gamma/types'
import { useGames } from './gamma/useGames'
import { Board } from './ui/Board'
import { Rail } from './ui/Rail'
import { StatusPill } from './ui/StatusPill'
import { ThemeToggle } from './ui/ThemeToggle'

const NO_GAMES: Game[] = []

function App() {
  const { state, retry } = useGames()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const games = state.status === 'ready' ? state.games : NO_GAMES
  const selected = games.find((game) => game.id === selectedId) ?? null

  return (
    <div className={styles.desk}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <h1>NFL Markets</h1>
          <p>Polymarket</p>
        </div>
        <StatusPill games={state} selected={selected} />
        <div className={styles.tools}>
          <ThemeToggle />
        </div>
      </header>
      <aside className={styles.rail}>
        <Rail
          state={state}
          retry={retry}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </aside>
      <main className={styles.board}>
        <Board state={state} selected={selected} />
      </main>
    </div>
  )
}

export default App
