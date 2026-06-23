import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getMethodology } from '../lib/api'
import PredictiveValidityCharts from '../components/PredictiveValidityCharts'

const HOW_TO_USE_HEADING = '## How to use this tool'

// C.J. Stroud, 2023 -- league_baseline + support_component + qb_component = epa_per_play
// (0.043 + -0.130 + 0.200 = 0.113), the same identity the waterfall chart on his QB page draws.
const DECOMPOSITION_EXAMPLE = {
  total: 0.113,
  segments: [
    { name: 'League Baseline', value: 0.043, color: '#374151' },
    { name: 'Support Contribution', value: -0.13, color: '#4b5563' },
    { name: 'QB Contribution', value: 0.2, color: '#f5a623' },
  ],
}

function DecompositionDiagram() {
  const { total, segments } = DECOMPOSITION_EXAMPLE
  const totalAbs = segments.reduce((sum, s) => sum + Math.abs(s.value), 0)

  return (
    <div className="not-prose card card-glow mb-10">
      <p className="text-sm text-(--color-text-secondary) mb-4">
        How a quarterback's real EPA per play splits into three pieces — shown here for
        C.J. Stroud's 2023 season.
      </p>
      <div className="flex w-full h-10 rounded-(--radius-sm) overflow-hidden">
        {segments.map((s) => (
          <div
            key={s.name}
            style={{ width: `${(Math.abs(s.value) / totalAbs) * 100}%`, backgroundColor: s.color }}
            className="flex items-center justify-center text-xs font-medium text-(--color-text-primary) [font-variant-numeric:tabular-nums]"
          >
            {s.value >= 0 ? '+' : ''}
            {s.value.toFixed(3)}
          </div>
        ))}
      </div>
      <div className="flex w-full mt-2 text-xs text-(--color-text-secondary)">
        {segments.map((s) => (
          <div key={s.name} style={{ width: `${(Math.abs(s.value) / totalAbs) * 100}%` }} className="text-center">
            {s.name}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-(--color-text-secondary) mt-4">
        = <span className="font-semibold text-(--color-text-primary)">{total.toFixed(3)} EPA/play</span> (his
        actual 2023 EPA per play)
      </p>
    </div>
  )
}

export default function Methodology() {
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    getMethodology()
      .then((data) => {
        setContent(data.content)
        setStatus('loaded')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [])

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto prose prose-invert">
      {status === 'loading' && (
        <div className="h-96 rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-(--color-text-secondary) italic">
          Couldn't load the methodology page right now. Please try refreshing.
        </p>
      )}

      {status === 'loaded' && content && (() => {
        // Splits the fetched markdown so PredictiveValidityCharts (a real React
        // component, not prose) can render between "Known Limitations" and "How to
        // use this tool" -- exactly where the spec asks for it -- without the
        // backend's docs/methodology.md needing to know anything about charts.
        const splitIndex = content.indexOf(HOW_TO_USE_HEADING)
        const beforeHowToUse = splitIndex === -1 ? content : content.slice(0, splitIndex)
        const fromHowToUse = splitIndex === -1 ? '' : content.slice(splitIndex)
        return (
          <>
            <DecompositionDiagram />
            <ReactMarkdown>{beforeHowToUse}</ReactMarkdown>
            <PredictiveValidityCharts />
            {fromHowToUse && <ReactMarkdown>{fromHowToUse}</ReactMarkdown>}
          </>
        )
      })()}
    </main>
  )
}
