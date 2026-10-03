import { GAME_SLUG } from './fetchGames'
import type { Game } from './types'

/**
 *
 * @param event
 * @returns a Game object if the event is a game, null otherwise
 * An event is a game if
 * 1. event is an object
 * 2. id, title, slug fields are strings
 * 3. the title is of the GAME_SLUG form
 */
export function toGame(event: unknown): Game | null {
  if (!isRecord(event)) return null
  const { id, title, slug } = event
  if (
    typeof id !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string'
  )
    return null
  if (!GAME_SLUG.test(slug)) return null
  return { id, slug, title }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}
