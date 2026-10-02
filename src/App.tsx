import { useEffect, useState } from "react"

const GAME_SLUG: RegExp = /^nfl-[a-z]{2,4}-[a-z]{2,4}-\d{4}-\d{2}-\d{2}$/

const EVENTS_URL = `https://gamma-api.polymarket.com/events?tag_slug=nfl&active=true&clo
sed=false&limit=100&offset=300`

interface GammaEvent {
  id: string,
  slug: string,
  title: string
}

function App() {
  const [games, setGames] = useState<GammaEvent[]>()

  useEffect(() => {

    async function fetchEvents(url: string) {
      try {
        const res = await fetch(url)
        if (res.status !== 200) {
          console.error("[API] failed to fetch events")
          return;
        }
        const pageEvents: GammaEvent[] = await res.json()
        const games = pageEvents.filter((pageEvent, i) => {
          if (i === 0) console.log(pageEvent)
          return GAME_SLUG.test(pageEvent.slug)
        })
        setGames(games)
      } catch (err) {
        console.error(err)
      }

    }
    fetchEvents(EVENTS_URL)

    return () => {

    }
  }, [])
  return (
    <main>
      <h1>NFL markets</h1>
      <p>Live prices from Polymarket</p>
      <section>
        <ul>
          {games?.map(e => (
            <li key={e.id}>
              {e.title}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default App
