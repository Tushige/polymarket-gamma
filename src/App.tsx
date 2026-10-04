import { useState } from 'react'
import { useGames } from './gamma/useGames'
import { GamePicker } from './ui/GamePicker'
import { MarketTable } from './ui/MarketTable'

function App() {
  const { state, retry } = useGames()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const games = state.status === 'ready' ? state.games : []
  const selected = games?.find((game) => game.id === selectedId) ?? null

  return (
    <div className="app">
      <header className="app-header">
        <h1>NFL Markets</h1>
        <p>Live prices from Polymarket</p>
      </header>
      <aside className="sidebar">
        {state.status === 'loading' && (
          <p role="status" className="notice">
            Loading games... {state.eventsCount}
          </p>
        )}
        {state.status === 'error' && (
          <div role="alert" className="notice">
            <p>Could not load the games. {state.message}</p>
            <button type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        {state.status === 'ready' && games.length === 0 && (
          <p className="notice">No NFL games are listed right now.</p>
        )}
        {games.length > 0 && (
          <GamePicker
            games={games}
            selectedId={selectedId}
            onSelect={(gameId) => setSelectedId(gameId)}
          />
        )}
      </aside>
      <main className="content">
        {selected === null ? (
          <p className="notice">Pick a game to see its markets</p>
        ) : (
          <MarketTable game={selected} />
        )}
      </main>
    </div>
  )
}

export default App
