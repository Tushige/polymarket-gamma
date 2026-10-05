import { describe, expect, test } from 'vitest'
import {
  kickerLabel,
  marketLabel,
  startLabel,
  unopenedNote,
  updatedText,
  weeksLabel,
} from './labels'

const START = '2026-10-02T00:15:00Z'

test('marketLabel names the market briefly', () => {
  expect(marketLabel({ line: null })).toBe('Moneyline')
  expect(marketLabel({ line: 41.5 })).toBe('O/U 41.5')
})

describe('startLabel', () => {
  test('words the start time for the game status', () => {
    expect(startLabel({ status: 'LIVE', startTime: START })).toMatch(
      /^Kicked off /,
    )
    expect(startLabel({ status: 'ENDED', startTime: START })).toMatch(
      /^Final · /,
    )
    expect(startLabel({ status: 'PENDING', startTime: null })).toBe(
      'Time to be announced',
    )
    expect(startLabel({ status: 'ENDED', startTime: null })).toBe('Final')
  })
})

test('kickerLabel puts the week first when there is one', () => {
  expect(
    kickerLabel({ status: 'PENDING', startTime: null, eventWeek: 4 }),
  ).toBe('Week 4 · Time to be announced')
  expect(
    kickerLabel({ status: 'PENDING', startTime: null, eventWeek: null }),
  ).toBe('Time to be announced')
})

describe('updatedText', () => {
  const base = {
    now: 100_000,
    shownAt: 99_000,
    lastChange: null,
    hasBook: true,
    ended: false,
  }

  test('waits for the book, then says it is still waiting after 2.5 s', () => {
    expect(updatedText({ ...base, hasBook: false })).toBe(
      'Waiting for the book…',
    )
    expect(updatedText({ ...base, hasBook: false, shownAt: 97_500 })).toBe(
      'Still waiting for the first prices…',
    )
  })

  test('counts up from the last change', () => {
    expect(updatedText({ ...base, lastChange: 99_000 })).toBe(
      'Updated just now',
    )
    expect(updatedText({ ...base, lastChange: 86_000 })).toBe(
      'Updated 14 s ago',
    )
    expect(updatedText({ ...base, lastChange: 0 })).toBe('Updated 2 min ago')
  })

  test('a finished game does not trade', () => {
    expect(updatedText({ ...base, ended: true })).toBe(
      'Settled · nothing trades',
    )
  })
})

test('unopenedNote gets the plural right', () => {
  expect(unopenedNote(1)).toBe('1 O/U line is listed but not open yet.')
  expect(unopenedNote(2)).toBe('2 O/U lines are listed but not open yet.')
})

test('weeksLabel names one week or a range', () => {
  expect(weeksLabel([])).toBe('')
  expect(weeksLabel([4, 4])).toBe('Week 4')
  expect(weeksLabel([5, 3, 7])).toBe('Weeks 3–7')
})
