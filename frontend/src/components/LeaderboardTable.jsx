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
      <div className="flex items-center justify-end gap-4 mb-3 text-sm text-(--color-text-secondary)">
        <span className="flex items-center">
          <span className="inline-block w-2.5 h-2.5 rounded-[2px] bg-(--color-qb) mr-1.5" />
          QB-created share
        </span>
        <span className="flex items-center">
          <span className="inline-block w-2.5 h-2.5 rounded-[2px] bg-(--color-support) mr-1.5" />
          Support share
        </span>
      </div>

      <table className="w-full text-left border-collapse rounded-(--radius-xl) overflow-hidden border border-(--color-border)">
        <thead>
          <tr className="bg-(--color-elevated) text-(--color-text-muted) text-xs font-semibold tracking-[0.1em] uppercase">
            <th className="py-3 px-4 text-right w-10">#</th>
            <th className="py-3 px-4">
              <button
                onClick={() => onSortChange('abs_rank_delta')}
                className={
                  sortKey === 'abs_rank_delta'
                    ? 'text-(--color-qb) font-semibold'
                    : 'text-(--color-text-muted) hover:text-(--color-text-primary)'
                }
                title="Biggest movers between raw EPA rank and QB-created EPA rank"
              >
                Δ Rank
                {sortKey === 'abs_rank_delta' ? ' ▼' : ''}
              </button>
            </th>
            <th className="py-3 px-4">QB</th>
            <th className="py-3 px-4">Team</th>
            <th className="py-3 px-4">Season</th>
            {SORT_OPTIONS.map((opt) => (
              <th key={opt.key} className="py-3 px-4 text-right">
                <button
                  onClick={() => onSortChange(opt.key)}
                  className={
                    sortKey === opt.key
                      ? 'text-(--color-qb) font-semibold'
                      : 'text-(--color-text-muted) hover:text-(--color-text-primary)'
                  }
                >
                  {opt.label}
                  {sortKey === opt.key ? ' ▼' : ''}
                </button>
              </th>
            ))}
            <th className="py-3 px-4">How It Was Made</th>
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
            let rankDeltaClass = 'text-(--color-text-muted)'
            if (row.rankDelta > 0) {
              rankDeltaText = `+${row.rankDelta}`
              rankDeltaClass = 'text-(--color-green) font-semibold'
            } else if (row.rankDelta < 0) {
              rankDeltaText = `${row.rankDelta}`
              rankDeltaClass = 'text-(--color-red) font-semibold'
            }

            return (
              <tr
                key={`${row.qb_id}_${row.season}`}
                onClick={() => onRowClick(row.qb_id, row.season)}
                className="border-b border-(--color-border) bg-(--color-surface) cursor-pointer hover:bg-(--color-elevated)"
              >
                <td className="py-4 px-4 text-right text-sm text-(--color-text-muted)">{index + 1}</td>
                <td
                  className={`py-4 px-4 text-sm [font-variant-numeric:tabular-nums] ${rankDeltaClass}`}
                  title={`Raw EPA rank #${row.rawRank} -> QB-created rank #${row.createdRank}`}
                >
                  {rankDeltaText}
                </td>
                <td className="py-4 px-4 font-(family-name:--font-display) text-lg font-semibold text-(--color-text-primary)">
                  {row.qb_name}
                </td>
                <td className="py-4 px-4 text-sm text-(--color-text-secondary)">{row.team}</td>
                <td className="py-4 px-4 text-sm text-(--color-text-secondary)">{row.season}</td>
                <td className="py-4 px-4 text-right [font-variant-numeric:tabular-nums] tracking-[0.01em] text-(--color-text-secondary)">
                  {row.epa_per_play.toFixed(3)}
                </td>
                <td className="py-4 px-4 text-right [font-variant-numeric:tabular-nums] tracking-[0.01em] font-semibold text-(--color-qb)">
                  {row.qb_created_epa.toFixed(3)}
                </td>
                <td className="py-4 px-4 text-right [font-variant-numeric:tabular-nums] tracking-[0.01em] text-(--color-text-secondary)">
                  {(row.support_share * 100).toFixed(0)}%
                </td>
                <td className="py-4 px-4" title={tooltipText}>
                  <div className="flex h-2 w-32 rounded-[4px] overflow-hidden bg-(--color-elevated)">
                    <div
                      style={{ width: `${qbPct}%` }}
                      className={qbIsNegative ? 'bg-(--color-red)' : 'bg-(--color-qb)'}
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
