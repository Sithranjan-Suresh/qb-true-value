import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const QB_COLOR = '#f5a623'
const SUPPORT_COLOR = '#4b5563'
const BASELINE_COLOR = '#374151'

function formatSigned(value) {
  const rounded = value.toFixed(3)
  return value >= 0 ? `+${rounded}` : rounded
}

// y is always the top-left pixel of the rendered rect (recharts draws the "delta"
// segment's height upward from its stacked offset regardless of the underlying
// value's sign, since delta itself is always a positive magnitude), so the label
// always sits just above y -- no sign-dependent branching needed.
function BarValueLabel({ x, y, width, index, data }) {
  const entry = data[index]
  return (
    <text x={x + width / 2} y={y - 8} textAnchor="middle" fill="#ffffff" fontSize={13} fontWeight={500}>
      {entry.label}
    </text>
  )
}

export default function DecompositionChart({
  leagueBaseline,
  supportComponent,
  qbComponent,
  total,
  qbName,
  rank,
  calloutText,
}) {
  const afterSupport = leagueBaseline + supportComponent
  const afterQb = afterSupport + qbComponent

  // Standard "invisible offset segment" waterfall technique: each bar is a stack of
  // an invisible "base" (the lower of the segment's start/end) and a visible "delta"
  // (the absolute distance), so a negative segment renders by shrinking downward
  // from its start point instead of needing a separate negative-bar code path.
  const data = [
    {
      name: 'League baseline',
      base: Math.min(0, leagueBaseline),
      delta: Math.abs(leagueBaseline),
      fill: BASELINE_COLOR,
      label: formatSigned(leagueBaseline),
    },
    {
      name: 'Support',
      base: Math.min(leagueBaseline, afterSupport),
      delta: Math.abs(supportComponent),
      fill: SUPPORT_COLOR,
      label: formatSigned(supportComponent),
    },
    {
      name: 'QB',
      base: Math.min(afterSupport, afterQb),
      delta: Math.abs(qbComponent),
      fill: QB_COLOR,
      label: formatSigned(qbComponent),
    },
    {
      name: 'Total EPA/play',
      base: Math.min(0, total),
      delta: Math.abs(total),
      fill: BASELINE_COLOR,
      label: formatSigned(total),
    },
  ]

  const supportVerb = supportComponent >= 0 ? 'helped' : 'hurt'
  const supportMagnitude = Math.abs(supportComponent).toFixed(3)
  const sentence =
    qbName != null && rank != null
      ? `${qbName}'s supporting context ${supportVerb} his production by ${supportMagnitude} EPA/play. After accounting for this, he created ${qbComponent.toFixed(3)} EPA/play independently — ranking #${rank} all-time in this dataset.`
      : null

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 24, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" vertical={false} />
          <XAxis
            dataKey="name"
            stroke="#4a4a60"
            tick={{ fill: '#8888a0', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
          />
          <YAxis stroke="#4a4a60" tick={{ fill: '#8888a0', fontFamily: 'Inter, sans-serif', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: '#1c1c27',
              border: '1px solid #2a2a3a',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
            labelStyle={{ color: '#f0f0f5' }}
            itemStyle={{ color: '#f0f0f5' }}
            formatter={(value, key, { payload }) => [payload.label, 'EPA/play']}
          />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar
            dataKey="delta"
            stackId="waterfall"
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
            label={(props) => <BarValueLabel {...props} data={data} />}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {calloutText && (
        <div className="absolute text-center" style={{ left: '37.5%', top: '8px', transform: 'translateX(-50%)' }}>
          <p className="text-xs font-(family-name:--font-body) text-(--color-text-primary) bg-(--color-elevated) border border-(--color-border) rounded-(--radius-sm) px-2 py-1 whitespace-nowrap">
            {calloutText}
          </p>
          <p className="text-(--color-text-secondary) leading-none">↓</p>
        </div>
      )}

      {sentence && (
        <p className="border-l-[3px] border-(--color-qb) bg-(--color-qb-dim) rounded-r-(--radius-md) px-4 py-3 text-sm text-(--color-text-primary) mt-4">
          {sentence}
        </p>
      )}
    </div>
  )
}
