import { memo, useState } from 'react'
import { useLiveQuotes, useMarketTotal, useQuote } from '../feed/live'
import { teamSide, teamsOf, type TeamSide } from '../gamma/teams'
import type { Game, Row } from '../gamma/types'
import { decimalsForTick, spread } from '../utils/format'
import { marketLabel, unopenedNote } from './labels'
import {
  groupByMarket,
  marketCount,
  rowsForFilter,
  type MarketFilter,
} from './marketRows'
import styles from './MarketTable.module.css'
import { PriceCell } from './PriceCell'

const FILTERS: { id: MarketFilter; label: string }[] = [
  { id: 'all', label: 'All markets' },
  { id: 'winner', label: 'Winner' },
  { id: 'totals', label: 'Totals' },
  { id: 'near', label: 'Near the total' },
]

/**
 * Renders when the game, the filter or the market total changes. Prices reach
 * the rows without passing through here, and the rows are memoised.
 */
export function MarketTable({ game }: { game: Game }) {
  useLiveQuotes(game.tokenIds)
  const [filter, setFilter] = useState<MarketFilter>('all')
  const total = useMarketTotal(game)
  const teams = teamsOf(game)
  const groups = groupByMarket(rowsForFilter(game.rows, filter, total))

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <h2>
          Game markets{' '}
          <span className={styles.count}>{marketCount(game.rows)}</span>
        </h2>
        <div className={styles.segments} role="group" aria-label="Show">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {game.status === 'ENDED' && (
        <p className={styles.note}>
          This game has finished. Its markets are settled and no longer trade.
        </p>
      )}
      {game.rows.length === 0 ? (
        <p className={styles.empty}>No open markets for this game yet.</p>
      ) : groups.length === 0 ? (
        <p className={styles.empty}>Nothing matches this filter.</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table} aria-label={`${game.title} markets`}>
            <thead>
              <tr>
                <th scope="col" className={styles.marketColumn}>
                  Market
                </th>
                <th scope="col" className={styles.outcomeColumn}>
                  Outcome
                </th>
                <th scope="col">Best bid</th>
                <th scope="col">Best ask</th>
                <th scope="col">Last trade</th>
                <th scope="col">Spread</th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.question}>
                {group.rows.map((row, index) => (
                  <QuoteRow
                    key={row.tokenId}
                    row={row}
                    showMarket={index === 0}
                    rowSpan={group.rows.length}
                    side={teamSide(row, teams)}
                  />
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
      {game.inactiveMarketCount > 0 && (
        <p className={styles.note}>{unopenedNote(game.inactiveMarketCount)}</p>
      )}
    </div>
  )
}

interface QuoteRowProps {
  row: Row
  /** The first row of a market carries the market cell. */
  showMarket?: boolean
  rowSpan?: number
  /** Which team a moneyline outcome belongs to, for its colour bar. */
  side?: TeamSide | null
}

/** One outcome. Re-renders when its own token's quote changes, and only then. */
export const QuoteRow = memo(function QuoteRow({
  row,
  showMarket = false,
  rowSpan = 2,
  side = null,
}: QuoteRowProps) {
  const quote = useQuote(row.tokenId)
  const decimals = decimalsForTick(quote.tickSize)

  return (
    <tr>
      {showMarket && (
        <th scope="rowgroup" rowSpan={rowSpan} className={styles.marketCell}>
          <span className={styles.label}>
            <b>{marketLabel(row)}</b>
            <small>{row.question}</small>
          </span>
        </th>
      )}
      <th scope="row" className={styles.outcomeCell}>
        <span
          className={
            side === null ? styles.bar : `${styles.bar} ${styles[side]}`
          }
          aria-hidden="true"
        />
        {row.outcome}
      </th>
      <PriceCell value={quote.bestBid} decimals={decimals} />
      <PriceCell value={quote.bestAsk} decimals={decimals} />
      <PriceCell value={quote.lastTrade} decimals={decimals} variant="last" />
      <PriceCell
        value={spread(quote.bestBid, quote.bestAsk, decimals)}
        decimals={decimals}
        variant="spread"
      />
    </tr>
  )
})
