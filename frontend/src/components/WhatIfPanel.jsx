import { useEffect, useRef, useState } from 'react'
import { postWhatIf } from '../lib/api'

const FEATURES = [
  { key: 'avg_separation', label: 'Avg. separation (yds)' },
  { key: 'time_to_throw', label: 'Time to throw (s)' },
  { key: 'pass_block_win_rate', label: 'Pass block win rate' },
  { key: 'opponent_def_epa', label: 'Opponent defensive EPA/play' },
]

const DEBOUNCE_MS = 200

function formatSigned(value) {
  const rounded = value.toFixed(3)
  return value >= 0 ? `+${rounded}` : rounded
}

// Plain-English read of a /api/whatif response. Note this deliberately does NOT
// say "his QB-created contribution stays fixed" -- it doesn't. qb_component_counterfactual
// is computed backend-side as (his real, fixed epa_per_play) - (predicted_epa, which
// moves with the sliders), so it necessarily shifts in the opposite direction from
// predicted_epa: give him a hypothetically better situation and *less* of his real
// production reads as uniquely his, because the model expects more from anyone in
// that spot. What's actually fixed is his real recorded stat line, not this residual.
function buildInterpretation(qbName, result, actualEpaPerPlay, actualQbComponent) {
  const { predicted_epa, qb_component_counterfactual } = result
  const epaDirection =
    predicted_epa > actualEpaPerPlay ? 'higher' : predicted_epa < actualEpaPerPlay ? 'lower' : 'the same as'
  const qbComparison =
    qb_component_counterfactual > actualQbComponent
      ? `larger than his actual ${actualQbComponent.toFixed(3)}`
      : qb_component_counterfactual < actualQbComponent
        ? `smaller than his actual ${actualQbComponent.toFixed(3)}`
        : `the same as his actual ${actualQbComponent.toFixed(3)}`

  return `With these support conditions, ${qbName} would be expected to post ${predicted_epa.toFixed(3)} EPA/play based on the model — ${epaDirection} than his actual ${actualEpaPerPlay.toFixed(3)} EPA/play. Because his real performance on the field doesn't change, his QB-created contribution under this hypothetical becomes ${qb_component_counterfactual.toFixed(3)} EPA/play — ${qbComparison}: a better hypothetical situation explains away more of what he really did, and a worse one explains away less.`
}

export default function WhatIfPanel({
  qbId,
  season,
  featureRanges,
  initialValues,
  onResult,
  qbName,
  actualEpaPerPlay,
  actualQbComponent,
}) {
  const [values, setValues] = useState(initialValues)
  const [latestResult, setLatestResult] = useState(null)
  const debounceTimer = useRef(null)
  // Each outgoing request gets the next sequence number; a response is only applied
  // if its sequence still matches the most recently fired request. Any older,
  // slower response (seq < latestSeq.current) can never match once a newer request
  // has fired, so it's discarded instead of overwriting a fresher prediction.
  const latestSeq = useRef(0)

  // Fires once on mount. The parent remounts this component (via a key prop keyed
  // on qbId+season) whenever the QB-season changes, so useState(initialValues)
  // above already has the right starting values -- this effect only needs to fire
  // the initial prediction request, not resync any state.
  useEffect(() => {
    fireRequest(initialValues)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fireRequest(featureValues) {
    const seq = ++latestSeq.current
    postWhatIf({ qb_id: qbId, season, ...featureValues })
      .then((result) => {
        if (seq !== latestSeq.current) return
        setLatestResult(result)
        onResult(result)
      })
      .catch(() => {
        // Silently ignore -- the displayed chart simply keeps showing the last
        // good prediction rather than surfacing a transient network error here.
      })
  }

  function handleSliderChange(feature, value) {
    const next = { ...values, [feature]: value }
    setValues(next)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => fireRequest(next), DEBOUNCE_MS)
  }

  function handleReset() {
    clearTimeout(debounceTimer.current)
    setValues(initialValues)
    fireRequest(initialValues)
  }

  const delta = latestResult ? latestResult.predicted_epa - actualEpaPerPlay : 0
  const deltaClass = delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="mt-8 rounded-lg border border-(--color-border) bg-(--color-surface) p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-medium text-white">What if?</h2>
        <button
          onClick={handleReset}
          className="text-sm px-3 py-1 rounded border border-(--color-border) text-gray-300 hover:text-white"
        >
          Reset to actual
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4">
        Adjust the sliders to see how different support conditions would shift this
        QB's predicted baseline — and how much of his real production that leaves
        attributable to him.
      </p>

      {FEATURES.map(({ key, label }) => {
        const [min, max] = featureRanges[key]
        const step = (max - min) / 200
        return (
          <div key={key} className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>{label}</span>
              <span>{values[key].toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => handleSliderChange(key, Number(e.target.value))}
              className="w-full"
            />
          </div>
        )
      })}

      {latestResult && (
        <div className="mt-4 pt-4 border-t border-(--color-border)">
          <p className={`text-sm font-medium ${deltaClass}`}>
            {formatSigned(delta)} vs. actual conditions
          </p>
          <p className="text-sm text-gray-300 mt-2">
            {buildInterpretation(qbName, latestResult, actualEpaPerPlay, actualQbComponent)}
          </p>
        </div>
      )}
    </div>
  )
}
