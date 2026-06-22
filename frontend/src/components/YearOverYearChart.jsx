import { useNavigate } from 'react-router-dom'
import {
  CartesianGrid,
  Dot,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const QB_COLOR = '#f59e0b'
const RAW_COLOR = '#64748b'

// Clickable dot, navigating to that QB-season's own profile page rather than
// re-rendering the waterfall chart above in place -- this dataset only has one row
// per QB-season, so "go look at that season" and "view that season's page" are the
// same action, and a real navigation keeps the URL in sync with what's displayed.
function ClickableDot({ cx, cy, qbId, season, color }) {
  const navigate = useNavigate()
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke={color}
      style={{ cursor: 'pointer' }}
      onClick={() => navigate(`/qb/${qbId}/${season}`)}
    />
  )
}

export default function YearOverYearChart({ qbId, seasons }) {
  if (seasons.length < 2) return null

  const data = [...seasons]
    .sort((a, b) => a.season - b.season)
    .map((row) => ({
      season: row.season,
      qbCreatedEpa: row.qb_created_epa,
      epaPerPlay: row.epa_per_play,
    }))

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium text-white mb-1">Season-by-season trend</h2>
      <p className="text-sm text-gray-400 mb-4">
        Consistent QB-created EPA across seasons suggests the signal is real, not noise.
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262a35" vertical={false} />
          <XAxis dataKey="season" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: '#14161d', border: '1px solid #262a35' }}
            labelStyle={{ color: '#e5e7eb' }}
            labelFormatter={(season) => `${season} season`}
            formatter={(value, key) => [
              value.toFixed(3),
              key === 'qbCreatedEpa' ? 'QB-created EPA' : 'Raw EPA/play',
            ]}
          />
          <Legend
            formatter={(value) => (value === 'qbCreatedEpa' ? 'QB-created EPA' : 'Raw EPA/play')}
          />
          <Line
            type="monotone"
            dataKey="epaPerPlay"
            stroke={RAW_COLOR}
            strokeWidth={2}
            dot={(props) => (
              <ClickableDot key={props.payload.season} {...props} qbId={qbId} season={props.payload.season} color={RAW_COLOR} />
            )}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="qbCreatedEpa"
            stroke={QB_COLOR}
            strokeWidth={2}
            dot={(props) => (
              <ClickableDot key={props.payload.season} {...props} qbId={qbId} season={props.payload.season} color={QB_COLOR} />
            )}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
