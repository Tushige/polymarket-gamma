import { useEffect, useState } from 'react'
import { fetchGames } from './gamma/fetchGames'
import type { Game } from './gamma/types'

function App() {
  const [games, setGames] = useState<Game[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    fetchGames({ signal })
      .then((games) => {
        if (signal.aborted) return
        setGames(games)
      })
      .catch((err: Error) => {
        console.log(err)
        if (err.name === 'AbortError') {
          console.log('Stale fetchGames request successfully aborted')
        } else {
          console.error(err)
        }
      })
    return () => {
      controller.abort()
    }
  }, [])

  return (
    <main>
      <h1>NFL markets</h1>
      <p>Live prices from Polymarket</p>
      <section>
        {games === null ? (
          'Loading...'
        ) : (
          <>
            <h2>Games: {games.length}</h2>
            <ul>
              {games?.map((e) => (
                <li key={e.id}>{e.title}</li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  )
}

export default App
