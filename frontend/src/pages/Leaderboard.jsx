import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard, getQBDetail } from '../lib/api'
import LeaderboardTable from '../components/LeaderboardTable'
import BiggestMovers from '../components/BiggestMovers'

const FETCH_TIMEOUT_MS = 8000

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sortKey, setSortKey] = useState('qb_created_epa')
  // league_baseline is a single global constant (same for every QB-season), needed to
  // recover support_component's sign for the bar column -- QBSummary only exposes the
  // sign-less support_share. Rather than duplicate the constant in the frontend (it's
  // computed once during training, per Part 0), it's fetched once from any QB's real
  // detail response and reused for every row via the identity
  // epa_per_play = league_baseline + support_component + qb_component.
  const [leagueBaseline, setLeagueBaseline] = useState(null)
  const navigate = useNavigate()

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
        setData(rows)
        setStatus('loaded')
        if (rows.length > 0) {
          getQBDetail(rows[0].qb_id, rows[0].season)
            .then((detail) => setLeagueBaseline(detail.league_baseline))
            .catch(() => {})
        }
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('error')
      })

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="px-6 py-10 max-w-[1200px] mx-auto">
      <p className="font-(family-name:--font-body) text-xs tracking-[0.15em] uppercase text-(--color-qb) mb-2">
        2019 – 2025 &middot; 250+ QB-Seasons
      </p>
      <h1 className="font-(family-name:--font-display) text-3xl font-bold uppercase tracking-tight text-(--color-text-primary) mb-8">
        Leaderboard
      </h1>

      <div className="mb-8">
        <BiggestMovers />
      </div>

      {status === 'loading' && (
        <div className="h-96 rounded-(--radius-xl) border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-(--color-text-secondary) italic">
          Couldn't load the leaderboard right now. Please try refreshing the page.
        </p>
      )}

      {status === 'loaded' && data && (
        <LeaderboardTable
          data={data}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onRowClick={(qbId, season) => navigate(`/qb/${qbId}/${season}`)}
          leagueBaseline={leagueBaseline}
        />
      )}
    </main>
  )
}
