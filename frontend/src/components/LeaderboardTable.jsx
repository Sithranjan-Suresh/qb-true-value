import { withRankDelta } from '../lib/ranks'

const SORT_OPTIONS = [
  { key: 'epa_per_play', label: 'Raw EPA/play' },
  { key: 'qb_created_epa', label: 'QB-created EPA' },
  { key: 'support_share', label: 'Support share' },
]

export default function LeaderboardTable({ data, sortKey, onSortChange, onRowClick, leagueBaseline }) {
  const withRanks = withRankDelta(data)

  const sorted = [...withRanks].sort((a, b) =>
    sortKey === 'abs_rank_delta'
      ? Math.abs(b.rankDelta) - Math.abs(a.rankDelta)
      : b[sortKey] - a[sortKey],
  )

  return (
    <div>
      <div className="flex items-center gap-6 mb-2 text-sm text-gray-400">
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-(--color-qb)" />
          QB-created share
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded bg-(--color-support)" />
          Support share
        </span>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-(--color-border) text-gray-400 text-sm">
            <th className="py-2 px-3">#</th>
            <th className="py-2 px-3">
              <button
                onClick={() => onSortChange('abs_rank_delta')}
                className={
                  sortKey === 'abs_rank_delta'
                    ? 'text-(--color-qb) font-medium'
                    : 'text-gray-400 hover:text-white'
                }
                title="Biggest movers between raw EPA rank and QB-created EPA rank"
              >
                Δ Rank
                {sortKey === 'abs_rank_delta' ? ' ▼' : ''}
              </button>
            </th>
            <th className="py-2 px-3">QB</th>
            <th className="py-2 px-3">Team</th>
            <th className="py-2 px-3">Season</th>
            {SORT_OPTIONS.map((opt) => (
              <th key={opt.key} className="py-2 px-3">
                <button
                  onClick={() => onSortChange(opt.key)}
                  className={
                    sortKey === opt.key
                      ? 'text-(--color-qb) font-medium'
                      : 'text-gray-400 hover:text-white'
                  }
                >
                  {opt.label}
                  {sortKey === opt.key ? ' ▼' : ''}
                </button>
              </th>
            ))}
            <th className="py-2 px-3">How It Was Made</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            // support_share is already abs(support)/(abs(support)+abs(qb)) clipped to
            // [0,1] by the backend, so the two segment widths always sum to <=100% and
            // never go negative -- no extra clamping needed here. The sign of
            // support_component (for the tooltip wording and the negative-support
            // visual treatment) isn't in this row at all -- it's derived below from
            // the Part 0 identity using the league_baseline passed down from the page.
            const supportPct = row.support_share * 100
            const qbPct = 100 - supportPct
            const qbIsNegative = row.qb_created_epa < 0

            const supportComponent =
              leagueBaseline == null ? null : row.epa_per_play - row.qb_created_epa - leagueBaseline
            const supportIsNegative = supportComponent != null && supportComponent < 0

            const tooltipText = `This QB generated ${qbPct.toFixed(0)}% of his EPA independently. ${supportPct.toFixed(0)}% came from his supporting context (receivers, O-line, opponent strength)${supportIsNegative ? ' -- and his support actually worked against him this season' : ''}.`

            let rankDeltaText = '—'
            let rankDeltaClass = 'text-gray-500'
            if (row.rankDelta > 0) {
              rankDeltaText = `+${row.rankDelta}`
              rankDeltaClass = 'text-green-500'
            } else if (row.rankDelta < 0) {
              rankDeltaText = `${row.rankDelta}`
              rankDeltaClass = 'text-red-500'
            }

            return (
              <tr
                key={`${row.qb_id}_${row.season}`}
                onClick={() => onRowClick(row.qb_id, row.season)}
                className="border-b border-(--color-border) cursor-pointer hover:bg-(--color-surface)"
              >
                <td className="py-2 px-3 text-gray-400">{index + 1}</td>
                <td
                  className={`py-2 px-3 font-medium ${rankDeltaClass}`}
                  title={`Raw EPA rank #${row.rawRank} -> QB-created rank #${row.createdRank}`}
                >
                  {rankDeltaText}
                </td>
                <td className="py-2 px-3 text-white">{row.qb_name}</td>
                <td className="py-2 px-3 text-gray-300">{row.team}</td>
                <td className="py-2 px-3 text-gray-300">{row.season}</td>
                <td className="py-2 px-3 text-gray-300">{row.epa_per_play.toFixed(3)}</td>
                <td className="py-2 px-3 text-gray-300">{row.qb_created_epa.toFixed(3)}</td>
                <td className="py-2 px-3 text-gray-300">{(row.support_share * 100).toFixed(0)}%</td>
                <td className="py-2 px-3" title={tooltipText}>
                  <div className="flex h-3 w-32 rounded overflow-hidden bg-(--color-bg)">
                    <div
                      style={{ width: `${qbPct}%` }}
                      className={qbIsNegative ? 'bg-red-500' : 'bg-(--color-qb)'}
                    />
                    <div
                      style={{
                        width: `${supportPct}%`,
                        backgroundImage: supportIsNegative
                          ? 'repeating-linear-gradient(45deg, var(--color-support) 0 4px, #3f4654 4px 8px)'
                          : undefined,
                      }}
                      className={supportIsNegative ? '' : 'bg-(--color-support)'}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
