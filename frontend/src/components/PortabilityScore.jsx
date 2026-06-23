import { computePortability } from '../lib/portability'

function band(pct) {
  if (pct < 40) return { color: '#ef4444', label: 'heavily dependent on his supporting cast' }
  if (pct < 70) return { color: '#eab308', label: 'moderately portable to a new supporting cast' }
  return { color: '#22c55e', label: 'highly portable to a new supporting cast' }
}

export default function PortabilityScore({ qbName, qbComponent, supportComponent, leagueAveragePct }) {
  const pct = computePortability(qbComponent, supportComponent)
  const { color, label } = band(pct)

  return (
    <div className="card">
      <h2 className="font-(family-name:--font-display) text-xl font-bold uppercase text-(--color-text-primary) mb-1">
        Portability Score
      </h2>
      <p className="text-sm text-(--color-text-secondary) mb-4">
        What share of {qbName}'s production is independent of his supporting cast -- and would travel with
        him to a new team.
      </p>

      <div className="relative h-3 w-full rounded-(--radius-sm) overflow-hidden bg-(--color-elevated)">
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {leagueAveragePct != null && (
          <div
            className="absolute inset-y-0 w-0.5 bg-(--color-text-primary)"
            style={{ left: `${leagueAveragePct}%` }}
            title={`League average: ${leagueAveragePct.toFixed(0)}%`}
          />
        )}
      </div>

      <p className="font-(family-name:--font-display) text-2xl font-bold mt-3" style={{ color }}>
        {pct.toFixed(0)}%
      </p>

      <p className="text-sm text-(--color-text-secondary) mt-1">
        {qbName} generates {pct.toFixed(0)}% of his EPA independently — {label}.
      </p>

      {leagueAveragePct != null && (
        <p className="text-xs text-(--color-text-muted) mt-2">
          League average portability: {leagueAveragePct.toFixed(0)}% (the vertical line on the gauge above).
        </p>
      )}
    </div>
  )
}
