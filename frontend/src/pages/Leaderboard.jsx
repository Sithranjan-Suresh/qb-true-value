import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../lib/api'
import LeaderboardTable from '../components/LeaderboardTable'

const FETCH_TIMEOUT_MS = 8000

export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sortKey, setSortKey] = useState('qb_created_epa')
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
      })
      .catch(() => {
        if (timedOut) return
        clearTimeout(timer)
        setStatus('error')
      })

    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="px-6 py-10 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">Leaderboard</h1>

      {status === 'loading' && (
        <div className="h-96 rounded-lg border border-(--color-border) bg-(--color-surface) animate-pulse" />
      )}

      {status === 'error' && (
        <p className="text-gray-400 italic">
          Couldn't load the leaderboard right now. Please try refreshing the page.
        </p>
      )}

      {status === 'loaded' && data && (
        <LeaderboardTable
          data={data}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onRowClick={(qbId, season) => navigate(`/qb/${qbId}/${season}`)}
        />
      )}
    </main>
  )
}
