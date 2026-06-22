import { useNavigate } from 'react-router-dom'

// Hardcoded per spec, not derived dynamically -- these are the actual top movers in
// the 2019-2025 dataset (computed once from leaderboard.json's raw_rank/created_rank,
// same definition as the Δ Rank column), with blurbs grounded in each QB-season's
// real raw_features from qb_decomposition.json.
const MOVERS = [
  {
    qbId: '00-0023682',
    season: 2019,
    qbName: 'R.Fitzpatrick',
    team: 'MIA',
    rawRank: 127,
    createdRank: 20,
    type: 'underrated',
    blurb:
      "Ranked 127th by raw EPA, but 20th by QB-created EPA — he played behind the league's worst pass-blocking line that season (41% win rate, the lowest in the dataset) and still outperformed what that situation predicted.",
  },
  {
    qbId: '00-0035710',
    season: 2020,
    qbName: 'D.Jones',
    team: 'NYG',
    rawRank: 192,
    createdRank: 111,
    type: 'underrated',
    blurb:
      'Ranked 192nd by raw EPA, but 111th by QB-created EPA — a shaky Giants offensive line and tight separation numbers made his actual production look worse than his situation-adjusted value.',
  },
  {
    qbId: '00-0022942',
    season: 2020,
    qbName: 'P.Rivers',
    team: 'IND',
    rawRank: 35,
    createdRank: 115,
    type: 'overrated',
    blurb:
      "Ranked 35th by raw EPA, but fell to 115th by QB-created EPA — a strong offensive line (60% pass-block win rate) and a soft slate of opposing defenses did most of the work.",
  },
]

export default function BiggestMovers() {
  const navigate = useNavigate()

  return (
    <section className="mb-8">
      <h2 className="text-lg font-medium text-white mb-3">Biggest Rank Shifts</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOVERS.map((mover) => (
          <button
            key={`${mover.qbId}_${mover.season}`}
            onClick={() => navigate(`/qb/${mover.qbId}/${mover.season}`)}
            className={`text-left rounded-lg border border-(--color-border) bg-(--color-surface) p-4 border-l-4 ${
              mover.type === 'underrated' ? 'border-l-green-500' : 'border-l-red-500'
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
              {mover.type === 'underrated' ? 'Underrated by raw EPA' : 'Overrated by raw EPA'}
            </p>
            <p className="text-white font-medium mb-1">
              {mover.qbName} &middot; {mover.team} &middot; {mover.season}
            </p>
            <p className="text-sm text-gray-300 mb-2">
              #{mover.rawRank} <span className="text-gray-500">&rarr;</span> #{mover.createdRank}
            </p>
            <p className="text-sm text-gray-400">{mover.blurb}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
