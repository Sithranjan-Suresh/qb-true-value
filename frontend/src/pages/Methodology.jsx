import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { getMethodology } from '../lib/api'
import PredictiveValidityCharts from '../components/PredictiveValidityCharts'
import HowThisDiffers from '../components/HowThisDiffers'

const KNOWN_LIMITATIONS_HEADING = '## Known Limitations'
const HOW_TO_USE_HEADING = '## How to use this tool'

// C.J. Stroud, 2023 -- league_baseline + support_component + qb_component = epa_per_play
// (0.041 + -0.112 + 0.184 = 0.113), the same identity the waterfall chart on his QB page draws.
// Numbers reflect the two-step GBM+OLS model (see "The Model" below), not the
// original single-step regression -- re-verify against /api/qbs/00-0039163/2023 if
// the model is ever retrained again.
const DECOMPOSITION_EXAMPLE = {
  total: 0.113,
  segments: [
    { name: 'League Baseline', value: 0.041, color: '#374151' },
    { name: 'Support Contribution', value: -0.112, color: '#4b5563' },
    { name: 'QB Contribution', value: 0.184, color: '#f5a623' },
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
        // Splits the fetched markdown into three chunks so two real React
        // components -- not prose -- can render at exact positions the backend's
        // docs/methodology.md doesn't need to know anything about: HowThisDiffers
        // above "Known Limitations", PredictiveValidityCharts between "Known
        // Limitations" and "How to use this tool".
        const limitationsIndex = content.indexOf(KNOWN_LIMITATIONS_HEADING)
        const howToUseIndex = content.indexOf(HOW_TO_USE_HEADING)

        const beforeLimitations = limitationsIndex === -1 ? content : content.slice(0, limitationsIndex)
        const limitationsToHowToUse =
          limitationsIndex === -1
            ? ''
            : content.slice(limitationsIndex, howToUseIndex === -1 ? undefined : howToUseIndex)
        const fromHowToUse = howToUseIndex === -1 ? '' : content.slice(howToUseIndex)

        return (
          <>
            <DecompositionDiagram />
            <ReactMarkdown>{beforeLimitations}</ReactMarkdown>
            <HowThisDiffers />
            {limitationsToHowToUse && <ReactMarkdown>{limitationsToHowToUse}</ReactMarkdown>}
            <PredictiveValidityCharts />
            {fromHowToUse && <ReactMarkdown>{fromHowToUse}</ReactMarkdown>}
          </>
        )
      })()}
    </main>
  )
}
