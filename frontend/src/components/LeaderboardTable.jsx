const SORT_OPTIONS = [
  { key: 'epa_per_play', label: 'Raw EPA/play' },
  { key: 'qb_created_epa', label: 'QB-created EPA' },
  { key: 'support_share', label: 'Support share' },
]

// raw_rank and created_rank are computed once across the full pool of qualifying
// QB-seasons (not per-season), so the leaderboard's notion of "rank" stays
// consistent regardless of which column the table is currently sorted by.
function withRankDelta(data) {
  const byRawEpa = [...data].sort((a, b) => b.epa_per_play - a.epa_per_play)
  const rawRankByKey = new Map(byRawEpa.map((row, i) => [`${row.qb_id}_${row.season}`, i + 1]))

  const byCreatedEpa = [...data].sort((a, b) => b.qb_created_epa - a.qb_created_epa)
  const createdRankByKey = new Map(
    byCreatedEpa.map((row, i) => [`${row.qb_id}_${row.season}`, i + 1]),
  )

  return data.map((row) => {
    const key = `${row.qb_id}_${row.season}`
    const rawRank = rawRankByKey.get(key)
    const createdRank = createdRankByKey.get(key)
    return { ...row, rawRank, createdRank, rankDelta: rawRank - createdRank }
  })
}

export default function LeaderboardTable({ data, sortKey, onSortChange, onRowClick }) {
  const withRanks = withRankDelta(data)

  const sorted = [...withRanks].sort((a, b) =>
    sortKey === 'abs_rank_delta'
      ? Math.abs(b.rankDelta) - Math.abs(a.rankDelta)
      : b[sortKey] - a[sortKey],
  )

  return (
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
          <th className="py-2 px-3">Created vs. supported</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, index) => {
          // support_share is already abs(support)/(abs(support)+abs(qb)) clipped to
          // [0,1] by the backend, so the two segment widths always sum to <=100% and
          // never go negative -- no extra clamping needed here.
          const supportPct = row.support_share * 100
          const qbPct = 100 - supportPct
          const qbIsNegative = row.qb_created_epa < 0

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
              <td className="py-2 px-3">
                <div className="flex h-3 w-32 rounded overflow-hidden bg-(--color-bg)">
                  <div
                    style={{ width: `${qbPct}%` }}
                    className={qbIsNegative ? 'bg-red-500' : 'bg-(--color-qb)'}
                    title={`QB-created: ${row.qb_created_epa.toFixed(3)}`}
                  />
                  <div
                    style={{ width: `${supportPct}%` }}
                    className="bg-(--color-support)"
                    title={`Support share: ${(row.support_share * 100).toFixed(0)}%`}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
