import { useId } from 'react'
import type { Game, Row } from '../gamma/types'
import { useLiveQuotes, useQuote } from '../feed/live'
import { decimalsForTick, spread } from '../utils/format'
import { PriceCell } from './PriceCell'

interface MarketTableProps {
  game: Game
}
export function MarketTable({ game }: MarketTableProps) {
  const titleId = useId()
  useLiveQuotes(game.rows.map((row) => row.tokenId))

  return (
    <div className="market-panel">
      <h2 id={titleId} className="market-title">
        {game.title}
      </h2>
      {game.status === 'ENDED' && (
        <p className="table-note">This game has finished.</p>
      )}
      <div className="table-scroll">
        <table className="markets" aria-labelledby={titleId}>
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
            {game.rows.map((row) => (
              <QuoteRow key={row.tokenId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      {game.inactiveMarketCount > 0 && (
        <p className="table-note">{unopenedNote(game.inactiveMarketCount)}</p>
      )}
    </div>
  )
}

function QuoteRow({ row }: { row: Row }) {
  const quote = useQuote(row.tokenId)
  const decimals = decimalsForTick(quote.tickSize)

  return (
    <tr>
      <th scope="row">
        <span className="question">{row.question}</span>
        <span className="outcome">{row.outcome}</span>
      </th>
      <PriceCell value={quote.bestBid} decimals={decimals} />
      <PriceCell value={quote.bestAsk} decimals={decimals} />
      <PriceCell value={quote.lastTrade} decimals={decimals} />
      <PriceCell
        value={spread(quote.bestBid, quote.bestAsk, decimals)}
        decimals={decimals}
      />
    </tr>
  )
}

function unopenedNote(count: number): string {
  const lines = count === 1 ? 'line is' : 'lines are'
  return `${count} O/U ${lines} listed but not open for trading yet.`
}
