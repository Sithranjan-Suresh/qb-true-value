import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getLeaderboard, getQBDetail } from '../lib/api'
import DecompositionChart from '../components/DecompositionChart'
import WhatIfPanel from '../components/WhatIfPanel'
import YearOverYearChart from '../components/YearOverYearChart'
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

  // This QB's full season history, derived from the leaderboard's full 250-row pool
  // (already fetched for the rank lookup) rather than a second fetch -- the
  // leaderboard already carries qb_id, season, epa_per_play, and qb_created_epa.
  const [ownSeasons, setOwnSeasons] = useState([])

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
        setOwnSeasons(leaderboard.filter((row) => row.qb_id === qbId))
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
    <main className="px-6 py-10 max-w-[800px] mx-auto">
      {status === 'loading' && (
        <div className="h-96 rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-(--color-text-secondary) italic">
          Couldn't load this quarterback's page right now. Please try refreshing.
        </p>
      )}

      {status === 'loaded' && detail && displayed && (
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-(family-name:--font-display) text-4xl font-bold uppercase leading-none text-(--color-text-primary)">
              {detail.qb_name}
            </h1>
            <p className="font-(family-name:--font-body) text-base font-medium text-(--color-qb) mt-1">
              {detail.team} &middot; {detail.season}
            </p>
          </div>

          <div className="card card-glow">
            <DecompositionChart
              leagueBaseline={displayed.leagueBaseline}
              supportComponent={displayed.supportComponent}
              qbComponent={displayed.qbComponent}
              total={displayed.total}
              qbName={detail.qb_name}
              rank={rank}
            />
          </div>

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

          <YearOverYearChart qbId={detail.qb_id} seasons={ownSeasons} />
        </div>
      )}
    </main>
  )
}
