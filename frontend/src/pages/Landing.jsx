import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQBDetail } from '../lib/api'
import DecompositionChart from '../components/DecompositionChart'

// C.J. Stroud, 2023: raw EPA/play ranks 80th of 250 qualifying QB-seasons, but his
// qb_component ranks 5th -- a rookie whose situation undersold him on paper. Same
// example cited in docs/methodology.md's "one concrete finding" section.
const FEATURED_QB = { qbId: '00-0039163', season: 2023 }
const FETCH_TIMEOUT_MS = 8000

export default function Landing() {
  const [detail, setDetail] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      setStatus('fallback')
    }, FETCH_TIMEOUT_MS)

    getQBDetail(FEATURED_QB.qbId, FEATURED_QB.season)
      .then((data) => {
        if (timedOut) return
        clearTimeout(timer)
        setDetail(data)
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
    <main className="px-6 py-12 max-w-3xl mx-auto text-center">
      <h1 className="text-4xl font-semibold text-white mb-4">
        Raw QB stats conflate three things: the quarterback, his supporting cast, and
        the defenses he faced. QB True Value separates them.
      </h1>

      <div className="mt-10">
        {status === 'loading' && (
          <div className="h-80 rounded-lg border border-(--color-border) bg-(--color-surface) animate-pulse" />
        )}

        {status === 'loaded' && detail && (
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface) p-6">
            <p className="text-gray-300 mb-2">
              {detail.qb_name} &middot; {detail.team} &middot; {detail.season}
            </p>
            <DecompositionChart
              leagueBaseline={detail.league_baseline}
              supportComponent={detail.support_component}
              qbComponent={detail.qb_component}
              total={detail.epa_per_play}
            />
          </div>
        )}

        {status === 'fallback' && (
          <p className="text-gray-400 italic">
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
        className="inline-block mt-10 px-6 py-3 rounded-md bg-(--color-qb) text-black font-medium hover:opacity-90"
      >
        See the full leaderboard
      </Link>
    </main>
  )
}
