import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard, getQBDetail } from '../lib/api'
import LeaderboardTable from '../components/LeaderboardTable'
import BiggestMovers from '../components/BiggestMovers'
import { withRankDelta } from '../lib/ranks'
import { DIVISIONS, TEAM_DIVISION } from '../lib/divisions'

const FETCH_TIMEOUT_MS = 8000
const SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025]

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sortKey, setSortKey] = useState('qb_created_epa')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [divisionFilter, setDivisionFilter] = useState('all')
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

  // Ranks are computed once against the full, unfiltered 250-row pool -- the same
  // invariant lib/ranks.js documents and every other page relies on -- then the
  // season/division filters narrow which of those already-ranked rows are shown.
  // Filtering before ranking would make "rank" mean something different depending
  // on which filters happen to be active, which is exactly the inconsistency this
  // app has avoided everywhere else.
  const withRanks = useMemo(() => (data ? withRankDelta(data) : null), [data])

  const filtered = useMemo(() => {
    if (!withRanks) return null
    return withRanks.filter((row) => {
      if (seasonFilter !== 'all' && row.season !== seasonFilter) return false
      if (divisionFilter !== 'all' && TEAM_DIVISION[row.team] !== divisionFilter) return false
      return true
    })
  }, [withRanks, seasonFilter, divisionFilter])

  return (
    <main className="px-6 py-10 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
        <div>
          <p className="font-(family-name:--font-body) text-xs tracking-[0.15em] uppercase text-(--color-qb) mb-2">
            2019 – 2025 &middot; 250+ QB-Seasons
          </p>
          <h1 className="font-(family-name:--font-display) text-3xl font-bold uppercase tracking-tight text-(--color-text-primary)">
            Leaderboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-(--color-elevated) border border-(--color-border) text-(--color-text-primary) text-sm rounded-(--radius-sm) px-3 py-1.5"
          >
            <option value="all">All seasons</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="bg-(--color-elevated) border border-(--color-border) text-(--color-text-primary) text-sm rounded-(--radius-sm) px-3 py-1.5"
          >
            <option value="all">All divisions</option>
            {Object.keys(DIVISIONS).map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      {status === 'loaded' && filtered && (
        <LeaderboardTable
          data={filtered}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onRowClick={(qbId, season) => navigate(`/qb/${qbId}/${season}`)}
          leagueBaseline={leagueBaseline}
        />
      )}
    </main>
  )
}
