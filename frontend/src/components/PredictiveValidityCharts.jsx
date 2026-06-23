import {
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  N_PAIRS,
  POINTS_CREATED,
  POINTS_RAW,
  REGRESSION_CREATED,
  REGRESSION_RAW,
  R_CREATED,
  R_RAW,
} from '../lib/predictiveValidity'

function regressionLine(points, regression) {
  const xs = points.map((p) => p[0])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  return [
    { x: minX, y: regression.intercept + regression.slope * minX },
    { x: maxX, y: regression.intercept + regression.slope * maxX },
  ]
}

function ScatterPanel({ title, points, regression, color, r }) {
  const data = points.map(([x, y]) => ({ x, y }))
  const line = regressionLine(points, regression)

  return (
    <div>
      <p className="text-sm font-medium text-(--color-text-primary) mb-2">{title}</p>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid stroke="#2a2a3a" />
          <XAxis
            type="number"
            dataKey="x"
            name="Year N"
            stroke="#4a4a60"
            tick={{ fill: '#8888a0', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
            label={{ value: 'Year N', position: 'bottom', fill: '#8888a0', fontFamily: 'Inter, sans-serif' }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Year N+1"
            stroke="#4a4a60"
            tick={{ fill: '#8888a0', fontFamily: 'Inter, sans-serif', fontSize: 11 }}
            label={{
              value: 'Year N+1',
              angle: -90,
              position: 'left',
              fill: '#8888a0',
              fontFamily: 'Inter, sans-serif',
            }}
          />
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
            formatter={(value) => value.toFixed(3)}
          />
          <Scatter data={data} fill={color} fillOpacity={0.7} isAnimationActive={false} />
          <Line
            data={line}
            dataKey="y"
            stroke="#f0f0f5"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            legendType="none"
          />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-center text-xs text-(--color-text-muted) mt-1">r = {r.toFixed(3)}</p>
    </div>
  )
}

export default function PredictiveValidityCharts() {
  const moreStable = R_RAW > R_CREATED ? 'raw EPA/play' : 'QB-created EPA'
  const lessStable = R_RAW > R_CREATED ? 'QB-created EPA' : 'raw EPA/play'

  return (
    <div className="not-prose card mb-10">
      <h2 className="font-(family-name:--font-display) text-2xl font-bold uppercase text-(--color-text-primary) mb-4">
        Does It Actually Predict?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-(--radius-lg) border border-(--color-border) bg-(--color-elevated) p-6 text-center">
          <p className="text-xs uppercase tracking-[0.12em] text-(--color-text-secondary) mb-2">
            Raw EPA/play, year N &rarr; year N+1
          </p>
          <p className="font-(family-name:--font-display) text-4xl font-bold text-(--color-text-primary)">
            r = {R_RAW.toFixed(3)}
          </p>
        </div>
        <div className="rounded-(--radius-lg) border border-(--color-border) bg-(--color-elevated) p-6 text-center">
          <p className="text-xs uppercase tracking-[0.12em] text-(--color-text-secondary) mb-2">
            QB-created EPA, year N &rarr; year N+1
          </p>
          <p className="font-(family-name:--font-display) text-4xl font-bold text-(--color-qb)">
            r = {R_CREATED.toFixed(3)}
          </p>
        </div>
      </div>

      <p className="text-sm text-(--color-text-secondary) mb-6">
        Across {N_PAIRS} consecutive-season pairs (200+ attempts in both years, 2019&ndash;2025): {moreStable} is
        slightly more year-over-year stable than {lessStable} in this dataset. That's a real result, not the
        outcome a clean "our metric is the truer signal" story would want -- the two-step estimation (an
        out-of-fold gradient-boosted residual, then an OLS regression on top of it) adds its own estimation
        noise, which at this sample size outweighs whatever situational noise it strips out. QB-created EPA is
        still a meaningfully different number from raw EPA (that's the entire point), just not yet a
        more-predictive one on this axis.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScatterPanel
          title="Raw EPA/play"
          points={POINTS_RAW}
          regression={REGRESSION_RAW}
          color="#4b5563"
          r={R_RAW}
        />
        <ScatterPanel
          title="QB-created EPA"
          points={POINTS_CREATED}
          regression={REGRESSION_CREATED}
          color="#f5a623"
          r={R_CREATED}
        />
      </div>
    </div>
  )
}
