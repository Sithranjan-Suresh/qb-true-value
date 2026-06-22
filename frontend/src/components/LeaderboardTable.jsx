const SORT_OPTIONS = [
  { key: 'epa_per_play', label: 'Raw EPA/play' },
  { key: 'qb_created_epa', label: 'QB-created EPA' },
  { key: 'support_share', label: 'Support share' },
]

export default function LeaderboardTable({ data, sortKey, onSortChange, onRowClick }) {
  const sorted = [...data].sort((a, b) => b[sortKey] - a[sortKey])

  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-(--color-border) text-gray-400 text-sm">
          <th className="py-2 px-3">#</th>
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

          return (
            <tr
              key={`${row.qb_id}_${row.season}`}
              onClick={() => onRowClick(row.qb_id, row.season)}
              className="border-b border-(--color-border) cursor-pointer hover:bg-(--color-surface)"
            >
              <td className="py-2 px-3 text-gray-400">{index + 1}</td>
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
