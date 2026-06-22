import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getLeaderboard, getQBDetail } from '../lib/api'
import DecompositionChart from '../components/DecompositionChart'
import WhatIfPanel from '../components/WhatIfPanel'
import { withRankDelta } from '../lib/ranks'

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

  // The "ranking #N all-time" sentence always reflects this QB-season's real
  // recorded rank, not a live re-rank against a hypothetical what-if value --
  // re-ranking the whole dataset against one counterfactual number doesn't have a
  // clean interpretation, so this is fetched once and left untouched by
  // handleWhatIfResult below.
  const [rank, setRank] = useState(null)

  useEffect(() => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      setStatus('error')
    }, FETCH_TIMEOUT_MS)

    // Reset to loading when navigating from one QB's page to another without unmounting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus('loading')
    Promise.all([getQBDetail(qbId, Number(season)), getLeaderboard()])
      .then(([data, leaderboard]) => {
        if (timedOut) return
        clearTimeout(timer)
        setDetail(data)
        setDisplayed({
          leagueBaseline: data.league_baseline,
          supportComponent: data.support_component,
          qbComponent: data.qb_component,
          total: data.epa_per_play,
        })
        const withRanks = withRankDelta(leaderboard)
        const own = withRanks.find((row) => row.qb_id === qbId && row.season === Number(season))
        setRank(own?.createdRank ?? null)
        setStatus('loaded')
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('error')
      })

    return () => clearTimeout(timer)
  }, [qbId, season])

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
            qbName={detail.qb_name}
            rank={rank}
          />

          <WhatIfPanel
            key={`${detail.qb_id}_${detail.season}`}
            qbId={detail.qb_id}
            season={detail.season}
            featureRanges={detail.feature_ranges}
            initialValues={detail.raw_features}
            onResult={handleWhatIfResult}
            qbName={detail.qb_name}
            actualEpaPerPlay={detail.epa_per_play}
            actualQbComponent={detail.qb_component}
          />
        </>
      )}
    </main>
  )
}
