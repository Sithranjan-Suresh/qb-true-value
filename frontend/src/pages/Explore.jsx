import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getLeaderboard } from '../lib/api'
import { withRankDelta } from '../lib/ranks'

const FETCH_TIMEOUT_MS = 8000
const SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]

// Hardcoded per the same spirit as the Biggest Movers cards -- picked to span all
// four quadrants using real, verified coordinates (not narrative-fit): Stroud/Mahomes/
// L.Jackson sit in "Elite" (high raw, high created); Fitzpatrick/D.Jones in
// "Underrated" (low raw, high created); Brees 2020 in "System Dependent" (high raw,
// low created -- his qb_created_epa is genuinely negative that season); B.Young in
// "Struggling" (low on both).
const ANNOTATIONS = new Set([
  '00-0039163_2023', // C.Stroud
  '00-0033873_2019', // P.Mahomes
  '00-0034857_2024', // L.Jackson
  '00-0023682_2019', // R.Fitzpatrick
  '00-0035710_2020', // D.Jones
  '00-0020531_2020', // D.Brees
  '00-0039150_2023', // B.Young
])

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mixColor(hexA, hexB, t) {
  const [r1, g1, b1] = hexToRgb(hexA)
  const [r2, g2, b2] = hexToRgb(hexB)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r}, ${g}, ${b})`
}

// Diverging scale: green = rose in adjusted ranking, red = fell, white = no change.
// Clamped to the dataset's actual max |rank_delta| (107) so the scale uses its full range.
const MAX_ABS_DELTA = 107
function deltaColor(delta) {
  const t = Math.max(-1, Math.min(1, delta / MAX_ABS_DELTA))
  if (t >= 0) return mixColor('#ffffff', '#22c55e', t)
  return mixColor('#ffffff', '#ef4444', -t)
}

function ScatterDot({ cx, cy, payload }) {
  const key = `${payload.qb_id}_${payload.season}`
  const isAnnotated = ANNOTATIONS.has(key)
  return (
    <g>
      <circle cx={cx} cy={cy} r={isAnnotated ? 5 : 3.5} fill={deltaColor(payload.rankDelta)} stroke="#0b0d12" strokeWidth={1} />
      {isAnnotated && (
        <text x={cx + 8} y={cy - 8} fontSize={11} fill="#e5e7eb">
          {payload.qb_name} '{String(payload.season).slice(2)}
        </text>
      )}
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded border border-(--color-border) bg-(--color-surface) p-3 text-sm">
      <p className="text-white font-medium">
        {p.qb_name} &middot; {p.team} &middot; {p.season}
      </p>
      <p className="text-gray-300">Raw EPA/play: {p.epa_per_play.toFixed(3)}</p>
      <p className="text-gray-300">QB-created EPA: {p.qb_created_epa.toFixed(3)}</p>
      <p className="text-gray-300">
        Δ Rank: {p.rankDelta > 0 ? `+${p.rankDelta}` : p.rankDelta}
      </p>
    </div>
  )
}

export default function Explore() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [seasonFilter, setSeasonFilter] = useState('all')

  useEffect(() => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      setStatus('error')
    }, FETCH_TIMEOUT_MS)

    getLeaderboard()
      .then((rows) => {
        if (timedOut) return
        clearTimeout(timer)
        setData(withRankDelta(rows))
        setStatus('loaded')
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('error')
      })

    return () => clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    if (!data) return []
    return seasonFilter === 'all' ? data : data.filter((d) => d.season === seasonFilter)
  }, [data, seasonFilter])

  const { meanRaw, meanCreated } = useMemo(() => {
    if (!filtered.length) return { meanRaw: 0, meanCreated: 0 }
    return {
      meanRaw: filtered.reduce((s, d) => s + d.epa_per_play, 0) / filtered.length,
      meanCreated: filtered.reduce((s, d) => s + d.qb_created_epa, 0) / filtered.length,
    }
  }, [filtered])

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white">Explore</h1>
        <select
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="bg-(--color-surface) border border-(--color-border) text-gray-200 rounded px-3 py-1"
        >
          <option value="all">All seasons</option>
          {SEASONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {status === 'loading' && (
        <div className="h-[500px] rounded-lg border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-gray-400 italic">
          Couldn't load the explore page right now. Please try refreshing the page.
        </p>
      )}

      {status === 'loaded' && (
        <div className="relative">
          <span className="absolute left-12 top-2 text-gray-500 text-xs opacity-60 pointer-events-none">
            Underrated
          </span>
          <span className="absolute right-4 top-2 text-gray-500 text-xs opacity-60 pointer-events-none">
            Elite
          </span>
          <span className="absolute left-12 bottom-8 text-gray-500 text-xs opacity-60 pointer-events-none">
            Struggling
          </span>
          <span className="absolute right-4 bottom-8 text-gray-500 text-xs opacity-60 pointer-events-none">
            System Dependent
          </span>

          <ResponsiveContainer width="100%" height={500}>
            <ScatterChart margin={{ top: 24, right: 24, left: 16, bottom: 16 }}>
              <CartesianGrid stroke="#262a35" />
              <XAxis
                type="number"
                dataKey="epa_per_play"
                name="Raw EPA/play"
                stroke="#9ca3af"
                label={{ value: 'Raw EPA/play', position: 'bottom', fill: '#9ca3af' }}
              />
              <YAxis
                type="number"
                dataKey="qb_created_epa"
                name="QB-created EPA"
                stroke="#9ca3af"
                label={{ value: 'QB-created EPA', angle: -90, position: 'left', fill: '#9ca3af' }}
              />
              <ReferenceLine x={meanRaw} stroke="#64748b" strokeDasharray="4 4" />
              <ReferenceLine y={meanCreated} stroke="#64748b" strokeDasharray="4 4" />
              <Tooltip content={<CustomTooltip />} />
              <Scatter data={filtered} shape={<ScatterDot />} isAnimationActive={false} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </main>
  )
}
