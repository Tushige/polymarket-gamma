# NFL Markets

A live table of Polymarket's NFL game markets. Pick a game, and the moneyline
and every full-game total (over/under) line stream in over Polymarket's public
WebSocket: best bid, best ask, last trade and the bid–ask spread, one row per
outcome, with a 500 ms green/red flash on every price that moves.

Built with React 19, TypeScript and Vite. No backend, no proxy: the browser
talks to the Gamma REST API and the CLOB WebSocket directly.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

```sh
npm run check      # typecheck + lint + format check + tests
npm run build      # production build in dist/
npm run preview    # serve the production build
```

The checks above pass on Node 22 / npm 10. There are no environment
variables.

## How it is put together

```
src/
  gamma/   the REST side: fetch every page of NFL events, keep the games
  feed/    the WebSocket side: one connection, one quote store, the hooks
  ui/      the components, each with its own CSS module
  styles/  tokens, fonts and the few global rules
  utils/   price formatting and the flash animation
  test/    helpers and fixtures shared by the tests
```

Data flows one way:

1. `gamma/fetchGames` walks `GET /events?tag_slug=nfl…` page by page with
   `offset`, and `gamma/toGame` turns each event into a `Game`: only slugs of
   the form `nfl-<away>-<home>-<date>`, only the moneyline (the market whose
   question equals the event title) and the `"<title>: O/U <number>"` lines,
   and two rows per market, one per `clobTokenIds` entry.
2. `feed/marketSocket` holds the single WebSocket. It connects on the first
   subscribe, sends `PING` every 10 s, and on a drop reconnects with a
   doubling, jittered delay. Switching games sends `unsubscribe` for the old
   tokens and `subscribe` for the new ones on the same connection.
3. `feed/messages` parses each frame into typed messages (`book`,
   `price_change`, `last_trade_price`, `tick_size_change`), checking every
   field; anything malformed is dropped rather than applied.
4. `feed/quoteStore` keeps one `Quote` per token outside React. Components
   subscribe per token with `useSyncExternalStore`, so a message for one token
   re-renders that one row. Changes are batched and flushed once per animation
   frame: a burst of messages inside one frame is one render, not one per
   message.
5. `ui/MarketTable` renders memoised rows; prices reach each row without
   passing through the table. `ui/PriceCell` runs the flash with the Web
   Animations API (`utils/flash`), which cancels itself if a newer value
   arrives inside the 500 ms.

Prices are shown in cents, as Polymarket shows them, with as many decimals as
the market's tick size needs.

### Where each requirement lives

| Requirement                                  | Code                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| Paginate events with `offset`                | `gamma/fetchGames.ts`                                      |
| One event per game; moneyline + O/U lines    | `gamma/toGame.ts` (`GAME_SLUG`, `totalLine`)               |
| Best bid / ask from the book, then deltas    | `feed/messages.ts`, `feed/quote.ts`                        |
| Last trade seeded from the book, then events | `feed/quote.ts`                                            |
| Spread = ask − bid                           | `utils/format.ts` (`spread`)                               |
| `PING` every 10 s                            | `feed/marketSocket.ts`                                     |
| No full-table re-renders                     | `feed/quoteStore.ts`, `feed/live.ts`, `ui/MarketTable.tsx` |
| 500 ms flash on change                       | `utils/flash.ts`, `ui/PriceCell.tsx`                       |
| Unsubscribe / subscribe on the same socket   | `feed/marketSocket.ts`, `useLiveQuotes` in `feed/live.ts`  |

## Tests

`npm test` runs about 160 tests that sit next to the code they cover. The ones
worth pointing at:

- `ui/MarketTable.test.tsx` and `ui/MarketTable.rows.test.tsx` count renders
  with React's `Profiler` to show that a message for one token re-renders one
  row, and that a filter change or a new market total leaves untouched rows
  alone.
- `feed/marketSocket.test.ts` drives a fake WebSocket with fake timers: the
  ping cadence, the doubling and capped reconnect delay, resubscribing after a
  drop with the tokens wanted _now_, and `close()` meaning closed.
- `feed/messages.test.ts` and `gamma/toGame.test.ts` parse real-shaped frames
  and events from `fixtures/`, including malformed ones.

The feed was not exercised against the live endpoint in tests; the fixtures
were captured from it.

## Beyond the brief

A few things the brief did not ask for, kept small:

- A scoreboard above the table: each team's chance to win (from the moneyline
  mids), the O/U line priced nearest to even money, and how fresh the numbers
  are. For a finished game, the range the total settled in.
- A team search in the rail, filters on the table, a light/dark theme that
  follows the OS unless overridden, and a reconnecting state that dims the
  stale numbers and offers "Retry now".
- Nothing beyond best bid/ask is kept from the book: no depth, no sizes.

## AI tool usage

Claude (Anthropic) was used throughout, in the Claude desktop app:

- **Design.** The visual direction (the broadcast-desk look, type and colour
  tokens, the motion) started as HTML mock-ups Claude produced from my
  description; I adapted them to the brief's needs, such as the 500 ms flash.
- **Code assistance.** Claude served as a debugging assistant and helped
  research how Polymarket's Gamma API works, including producing the fixture
  data the tests run against. It also reviewed the code and wrote unit tests,
  which I folded into the codebase where they fit.

The data layer, the socket, the store and the table were written by hand.
