import { useId } from 'react'
import type { Game } from '../gamma/types'

interface MarketTableProps {
  game: Game
}
export function MarketTable({ game }: MarketTableProps) {
  const titleId = useId()
  return (
    <div className="market-panel">
      <h2 id={titleId} className="market-title">
        {game.title}
      </h2>
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
              <tr key={row.tokenId}>
                <th scope="row">
                  <span className="question">{row.question}</span>
                  <span className="outcome">{row.outcome}</span>
                </th>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {game.inactiveMarketCount > 0 && (
        <p className="table-note">
          {game.inactiveMarketCount} O/U lines are listed but not open yet
        </p>
      )}
    </div>
  )
}
