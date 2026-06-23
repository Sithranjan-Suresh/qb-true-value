import { useNavigate } from 'react-router-dom'

// Hardcoded per the same convention as BiggestMovers -- the real top-3 movers
// within the 2025 season specifically (not all-time), ranked by the same global
// raw-rank-vs-created-rank delta the rest of the app uses, computed once from
// leaderboard.json. Framing is deliberately hedged: the year-over-year r for
// QB-created EPA is 0.45 (see the methodology page's "Does It Actually Predict?"
// section), not strong enough to promise outperformance -- so this reads as "the
// model suggests these guys' situations are working against them," not a forecast.
//
// Restricted to QBs with POSITIVE qb_created_epa, not just positive rank_delta --
// the biggest mover in 2025 by rank_delta alone was actually J.Fields (-0.046 raw,
// -0.032 created: a below-average QB who simply moved up less far below average),
// which would have framed a bad season as a "watch this guy" recommendation. A
// "players to watch" list implies a positive read, so it should only ever surface
// QBs whose underlying production is real, not just QBs whose rank improved.
const WATCH_LIST = [
  {
    qbId: '00-0036355',
    qbName: 'J.Herbert',
    team: 'LAC',
    rawRank: 135,
    createdRank: 103,
    blurb:
      "Raw EPA ranks 135th this season, QB-created EPA ranks 103rd — average pass protection (54% win rate) and a tougher-than-average slate of opposing defenses are taking a bite out of his raw numbers.",
  },
  {
    qbId: '00-0036442',
    qbName: 'J.Burrow',
    team: 'CIN',
    rawRank: 97,
    createdRank: 67,
    blurb:
      'Raw EPA ranks 97th this season, QB-created EPA ranks 67th — his receivers are getting modest separation (2.68 yards, below league median) for the level of play his QB-created number suggests.',
  },
  {
    qbId: '00-0039163',
    qbName: 'C.Stroud',
    team: 'HOU',
    rawRank: 119,
    createdRank: 101,
    blurb:
      'Raw EPA ranks 119th this season, QB-created EPA ranks 101st — a quieter season than his 2023 rookie year, but the same pattern: his support (56% pass-block win rate, a tougher slate of defenses) is underselling him again.',
  },
]

export default function PlayersToWatch() {
  const navigate = useNavigate()

  return (
    <section className="mb-8">
      <p className="font-(family-name:--font-body) text-xs tracking-[0.15em] uppercase text-(--color-blue) mb-2">
        2025 Season &middot; Forward Look
      </p>
      <h2 className="font-(family-name:--font-display) text-xl font-bold uppercase text-(--color-text-primary) mb-1">
        Players to Watch
      </h2>
      <p className="text-sm text-(--color-text-secondary) mb-3">
        These QBs' 2025 QB-created EPA is meaningfully ahead of their raw stats — their situation, not their
        play, is what's holding their raw numbers down right now.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WATCH_LIST.map((qb) => (
          <button
            key={qb.qbId}
            onClick={() => navigate(`/qb/${qb.qbId}/2025`)}
            className="text-left rounded-(--radius-lg) border border-(--color-border) bg-(--color-surface) p-6 border-l-4 border-l-(--color-blue) hover:bg-(--color-elevated)"
          >
            <p className="font-(family-name:--font-body) text-xs font-semibold tracking-[0.12em] uppercase text-(--color-blue) mb-1">
              Outpacing his raw stats
            </p>
            <p className="font-(family-name:--font-display) text-xl font-bold text-(--color-text-primary) my-1">
              {qb.qbName} &middot; {qb.team} &middot; 2025
            </p>
            <p className="text-sm text-(--color-text-secondary) mb-2">
              #{qb.rawRank} <span className="text-(--color-text-muted)">&rarr;</span> #{qb.createdRank}
            </p>
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">{qb.blurb}</p>
          </button>
        ))}
      </div>
    </section>
  )
}
