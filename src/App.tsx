import { useEffect, useState } from 'react'
import { fetchGames } from './gamma/fetchGames'
import type { Game } from './gamma/types'

function App() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const selected = games?.find((game) => game.id === selectedId) ?? null
  console.log(selected)
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
                <li key={e.id}>
                  <button type="button" onClick={() => setSelectedId(e.id)}>
                    {e.title}
                  </button>
                </li>
              ))}
            </ul>
            {selected !== null && (
              <>
                <table>
                  <caption>{selected.title}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Outcome</th>
                      <th scope="col">Best bid</th>
                      <th scope="col">Best ask</th>
                      <th scope="col">Last traded</th>
                      <th scope="col">Spread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.rows &&
                      selected.rows.map((row) => (
                        <tr key={row.tokenId}>
                          <th scope="row">
                            <span>{row.question}</span>{' '}
                            <span>{row.outcome}</span>
                          </th>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {selected.inactiveMarketCount > 0 && (
                  <p>
                    {selected?.inactiveMarketCount} O/U lines are listed but not
                    open yet
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  )
}

export default App
