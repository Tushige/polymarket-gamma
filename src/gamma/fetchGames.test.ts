import { expect, test } from 'vitest'
import events from './fixtures/events.sample.json'
import { fetchGames } from './fetchGames'
import { GAME_SLUG } from './toGame'

/**
 * small stand-in for the gamma API to be used for testing
 */
function fakeGamma(pages: unknown[], status = 200) {
  const offsets: (string | null)[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    init?.signal?.throwIfAborted()
    offsets.push(new URL(String(input)).searchParams.get('offset'))
    const body = pages[offsets.length - 1] ?? []
    return new Response(JSON.stringify(body), { status })
  }
  return { fetchFn, offsets }
}

test('the first request is the URL in the brief, character for character', async () => {
  let requested = ''

  const fetchFn: typeof fetch = async (input) => {
    requested = String(input)
    return new Response('[]')
  }

  await fetchGames({ fetchFn })

  expect(requested).toBe(
    'https://gamma-api.polymarket.com/events?tag_slug=nfl&active=true&closed=false&limit=100&offset=0',
  )
})

test('advances by what arrived last time and stops the walk on an empty page', async () => {
  const gamma = fakeGamma([events.slice(0, 3), events.slice(3, 5)])

  await fetchGames({ fetchFn: gamma.fetchFn })

  expect(gamma.offsets).toEqual(['0', '3', '5'])
})

test('keeps the games and drops everything else', async () => {
  const gamma = fakeGamma([events.slice(0, 6), events.slice(6)])

  const games = await fetchGames({ fetchFn: gamma.fetchFn })

  expect(games).toHaveLength(6)
  expect(games.every((game) => GAME_SLUG.test(game.slug))).toBe(true)
})

test('rejects when Gamma answers with an error status', async () => {
  const gamma = fakeGamma([events], 503)

  await expect(fetchGames({ fetchFn: gamma.fetchFn })).rejects.toThrow('503')
})

test('rejects when the body is not an array', async () => {
  const gamma = fakeGamma([{ error: 'nope' }])

  await expect(fetchGames({ fetchFn: gamma.fetchFn })).rejects.toThrow(
    `didn't return a list`,
  )
})

test('deduplicates games when the list shifts between requests', async () => {
  const gamma = fakeGamma([events.slice(0, 3), events.slice(2, 4)])

  const games = await fetchGames({ fetchFn: gamma.fetchFn })

  const slugs = games.map((game) => game.slug)
  expect(
    slugs.filter((slug) => slug === 'nfl-pit-cle-2026-10-02'),
  ).toHaveLength(1)
})

test('fetch throws when it is aborted', async () => {
  const gamma = fakeGamma([events])
  const controller = new AbortController()
  controller.abort()

  await expect(
    fetchGames({ fetchFn: gamma.fetchFn, signal: controller.signal }),
  ).rejects.toThrow()
  expect(gamma.offsets).toEqual([])
})

test('keeps only the games, upcoming by kickoff and finished last', async () => {
  const gamma = fakeGamma([events.slice(0, 6), events.slice(6)])

  const games = await fetchGames({ fetchFn: gamma.fetchFn })

  expect(games.map((game) => game.slug)).toEqual([
    'nfl-pit-cle-2026-10-02',
    'nfl-den-sf-2026-10-04',
    'nfl-chi-gb-2026-10-11',
    'nfl-ne-chi-2026-10-23',
    'nfl-nyg-hou-2026-10-25',
    'nfl-sea-was-2026-09-27',
  ])
})
