import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getQBDetail } from '../lib/api'
import DecompositionChart from '../components/DecompositionChart'

const FETCH_TIMEOUT_MS = 8000

export default function QBDetail() {
  const { qbId, season } = useParams()
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading')

  // "Currently displayed" values default to the real fetched decomposition, then get
  // overwritten live by the what-if panel's counterfactual results (4.7) -- the chart
  // always renders from this state, never re-fetching, whether the values are real
  // or hypothetical.
  const [displayed, setDisplayed] = useState(null)

  useEffect(() => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      setStatus('error')
    }, FETCH_TIMEOUT_MS)

    // Reset to loading when navigating from one QB's page to another without unmounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    getQBDetail(qbId, Number(season))
      .then((data) => {
        if (timedOut) return
        clearTimeout(timer)
        setDetail(data)
        setDisplayed({
          leagueBaseline: data.league_baseline,
          supportComponent: data.support_component,
          qbComponent: data.qb_component,
          total: data.epa_per_play,
        })
        setStatus('loaded')
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('error')
      })

    return () => clearTimeout(timer)
  }, [qbId, season])

  // eslint-disable-next-line no-unused-vars -- wired into WhatIfPanel's onResult in 4.7
  function handleWhatIfResult(result) {
    setDisplayed({
      leagueBaseline: detail.league_baseline,
      supportComponent: result.support_component_counterfactual,
      qbComponent: result.qb_component_counterfactual,
      total: result.predicted_epa,
    })
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      {status === 'loading' && (
        <div className="h-96 rounded-lg border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-gray-400 italic">
          Couldn't load this quarterback's page right now. Please try refreshing.
        </p>
      )}

      {status === 'loaded' && detail && displayed && (
        <>
          <h1 className="text-2xl font-semibold text-white mb-1">{detail.qb_name}</h1>
          <p className="text-gray-400 mb-6">
            {detail.team} &middot; {detail.season}
          </p>

          <DecompositionChart
            leagueBaseline={displayed.leagueBaseline}
            supportComponent={displayed.supportComponent}
            qbComponent={displayed.qbComponent}
            total={displayed.total}
          />

          {/* WhatIfPanel (4.7) mounts here, calling handleWhatIfResult via onResult */}
        </>
      )}
    </main>
  )
}
