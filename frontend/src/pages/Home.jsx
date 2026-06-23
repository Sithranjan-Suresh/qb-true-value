import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLeaderboard, getQBDetail } from '../lib/api'
import DecompositionChart from '../components/DecompositionChart'
import { withRankDelta } from '../lib/ranks'

// C.J. Stroud, 2023: raw EPA/play ranks 80th of 250 qualifying QB-seasons, but his
// qb_component ranks 5th -- a rookie whose situation undersold him on paper. Same
// example cited in docs/methodology.md's "one concrete finding" section.
const FEATURED_QB = { qbId: '00-0039163', season: 2023 }
const FETCH_TIMEOUT_MS = 8000

export default function Home() {
  const [detail, setDetail] = useState(null)
  const [rank, setRank] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      setStatus('fallback')
    }, FETCH_TIMEOUT_MS)

    Promise.all([getQBDetail(FEATURED_QB.qbId, FEATURED_QB.season), getLeaderboard()])
      .then(([data, leaderboard]) => {
        if (timedOut) return
        clearTimeout(timer)
        setDetail(data)
        const withRanks = withRankDelta(leaderboard)
        const own = withRanks.find(
          (row) => row.qb_id === FEATURED_QB.qbId && row.season === FEATURED_QB.season,
        )
        setRank(own?.createdRank ?? null)
        setStatus('loaded')
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('fallback')
      })

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="px-6 py-16 max-w-[640px] mx-auto text-center">
      <div className="mx-auto mb-4 w-10 h-0.5 bg-(--color-qb)" />
      <h1 className="font-(family-name:--font-display) text-3xl font-bold uppercase leading-[1.1] text-(--color-text-primary)">
        Raw QB stats conflate three things: the quarterback, his supporting cast, and
        the defenses he faced. QB True Value separates them.
      </h1>

      <div className="mt-10">
        {status === 'loading' && (
          <div className="h-80 rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface) animate-pulse" />
        )}

        {status === 'loaded' && detail && (
          <div className="card card-glow text-left">
            <p className="text-(--color-text-secondary) mb-2">
              {detail.qb_name} &middot; {detail.team} &middot; {detail.season}
            </p>
            <DecompositionChart
              leagueBaseline={detail.league_baseline}
              supportComponent={detail.support_component}
              qbComponent={detail.qb_component}
              total={detail.epa_per_play}
              qbName={detail.qb_name}
              rank={rank}
              calloutText="Support hurt Stroud's numbers"
            />
          </div>
        )}

        {status === 'fallback' && (
          <p className="text-(--color-text-secondary) italic">
            Every quarterback's stat line is really three numbers stacked together:
            what the league produces on average, what his receivers and offensive
            line add or subtract, and what's left over for the quarterback himself.
            QB True Value pulls those three apart for every qualifying QB-season
            since 2019.
          </p>
        )}
      </div>

      <Link
        to="/leaderboard"
        className="inline-block mt-10 px-8 py-3.5 rounded-(--radius-md) bg-(--color-qb) text-(--color-bg) font-(family-name:--font-display) font-bold text-lg uppercase tracking-wider hover:bg-(--color-qb-hover) hover:-translate-y-px"
      >
        See the full leaderboard
      </Link>
    </main>
  )
}
