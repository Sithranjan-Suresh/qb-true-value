import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const QB_COLOR = '#f59e0b'
const SUPPORT_COLOR = '#64748b'
const TOTAL_COLOR = '#e5e7eb'

function formatSigned(value) {
  const rounded = value.toFixed(3)
  return value >= 0 ? `+${rounded}` : rounded
}

export default function DecompositionChart({ leagueBaseline, supportComponent, qbComponent, total }) {
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
      fill: TOTAL_COLOR,
      label: leagueBaseline.toFixed(3),
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
      fill: TOTAL_COLOR,
      label: total.toFixed(3),
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262a35" vertical={false} />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip
          contentStyle={{ background: '#14161d', border: '1px solid #262a35' }}
          labelStyle={{ color: '#e5e7eb' }}
          formatter={(value, key, { payload }) => [payload.label, 'EPA/play']}
        />
        <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="delta" stackId="waterfall" isAnimationActive={false} radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
