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
    createdRank: 16,
    type: 'underrated',
    blurb:
      "Ranked 127th by raw EPA, but 16th by QB-created EPA — he played behind the league's worst pass-blocking line that season (41% win rate, the lowest in the dataset) and still outperformed what that situation predicted.",
  },
  {
    qbId: '00-0027973',
    season: 2019,
    qbName: 'A.Dalton',
    team: 'CIN',
    rawRank: 183,
    createdRank: 87,
    type: 'underrated',
    blurb:
      'Ranked 183rd by raw EPA, but 87th by QB-created EPA — a below-average receiving corps (2.57 yards of separation, near the bottom of the league) and shaky pass protection made his actual production look worse than his situation-adjusted value.',
  },
  {
    qbId: '00-0022942',
    season: 2020,
    qbName: 'P.Rivers',
    team: 'IND',
    rawRank: 35,
    createdRank: 114,
    type: 'overrated',
    blurb:
      "Ranked 35th by raw EPA, but fell to 114th by QB-created EPA — a strong offensive line (60% pass-block win rate) and a soft slate of opposing defenses did most of the work.",
  },
]

export default function BiggestMovers() {
  const navigate = useNavigate()

  return (
    <section>
      <h2 className="font-(family-name:--font-display) text-xl font-bold uppercase text-(--color-text-primary) mb-3">
        Biggest Rank Shifts
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {MOVERS.map((mover) => (
          <button
            key={`${mover.qbId}_${mover.season}`}
            onClick={() => navigate(`/qb/${mover.qbId}/${mover.season}`)}
            className={`text-left rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-6 border-l-4 hover:bg-(--color-elevated) ${
              mover.type === 'underrated' ? 'border-l-(--color-green)' : 'border-l-(--color-red)'
            }`}
          >
            <p
              className={`font-(family-name:--font-body) text-xs font-semibold tracking-[0.12em] uppercase mb-1 ${
                mover.type === 'underrated' ? 'text-(--color-green)' : 'text-(--color-red)'
              }`}
            >
              {mover.type === 'underrated' ? 'Underrated by raw EPA' : 'Overrated by raw EPA'}
            </p>
            <p className="font-(family-name:--font-display) text-xl font-bold text-(--color-text-primary) my-1">
              {mover.qbName} &middot; {mover.team} &middot; {mover.season}
            </p>
            <p className="text-sm text-(--color-text-secondary) mb-2">
              #{mover.rawRank} <span className="text-(--color-text-muted)">&rarr;</span> #{mover.createdRank}
            </p>
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">{mover.blurb}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
