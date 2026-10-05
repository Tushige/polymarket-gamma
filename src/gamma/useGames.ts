import { useEffect, useState } from 'react'
import type { Game } from './types'
import { fetchGames } from './fetchGames'

export type GamesState =
  | { status: 'loading'; eventsCount: number }
  | { status: 'error'; message: string }
  | { status: 'ready'; games: Game[] }

const LOADING: GamesState = { status: 'loading', eventsCount: 0 }

/** The games request, from the first page to the sorted list, with a retry. */
export function useGames(): { state: GamesState; retry: () => void } {
  const [state, setState] = useState<GamesState>(LOADING)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    fetchGames({
      signal,
      onProgress: (eventsCount) => {
        if (!signal.aborted) {
          setState({ status: 'loading', eventsCount })
        }
      },
    })
      .then((games) => {
        if (signal.aborted) return
        setState({ status: 'ready', games })
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return
        setState({
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      })
    return () => {
      controller.abort()
    }
  }, [attempt])

  function retry() {
    setState(LOADING)
    setAttempt((prev) => prev + 1)
  }
  return { state, retry }
}
