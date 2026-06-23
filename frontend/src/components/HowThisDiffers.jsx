const COMPARISONS = [
  {
    name: 'NFL NGS Passing Score',
    does: 'Scores pass execution against expectation using a proprietary ML model on player-tracking data.',
    doesnt:
      "Outputs a single 0–100 score with no published formula and no way to separate how much of it came from the QB versus his receivers, line, or schedule. You can't ask it 'what if this QB had league-average protection' — there's no input to move.",
  },
  {
    name: "Kevin Cole's Adjusted QB Efficiency (AQE)",
    does: 'Adjusts EPA for drops, penalties, and strength of schedule using publicly documented methodology.',
    doesnt:
      "Applies those adjustments as corrections to one combined number, not as separate, independently-variable inputs — there's no explicit receiver-separation or pass-block-win-rate term you could move on a slider, and no three-part split that sums back to a QB's real EPA.",
  },
  {
    name: 'PFF Grades',
    does: 'Assigns a 0–100 grade to every player on every play, reviewed by a team of human graders.',
    doesnt:
      "Starts from subjective play-by-play grading, not outcome data — there's no public formula, no released grader methodology, and no way for an outside party to reproduce a single number. Two PFF subscribers can't independently verify the same grade from raw film the way they can re-derive an EPA decomposition from public play-by-play.",
  },
]

export default function HowThisDiffers() {
  return (
    <div className="not-prose card mb-10">
      <h2 className="font-(family-name:--font-display) text-2xl font-bold uppercase text-(--color-text-primary) mb-4">
        How This Differs From Existing Metrics
      </h2>

      <div className="flex flex-col gap-4 mb-6">
        {COMPARISONS.map((c) => (
          <div
            key={c.name}
            className="rounded-(--radius-lg) border border-(--color-border) bg-(--color-elevated) p-5"
          >
            <p className="font-(family-name:--font-display) text-lg font-semibold text-(--color-text-primary) mb-2">
              {c.name}
            </p>
            <p className="text-sm leading-relaxed text-(--color-text-secondary) mb-2">
              <span className="font-medium text-(--color-text-primary)">What it does: </span>
              {c.does}
            </p>
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">
              <span className="font-medium text-(--color-qb)">What it can't do: </span>
              {c.doesnt}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-(--color-text-primary)">
        Every one of those produces a single score on its own scale, with no published rule for how much of it
        is the QB versus his situation. QB True Value's three numbers are not a score — they're an exact split
        of a QB's real EPA per play, computed from a published formula on public play-by-play data, so anyone
        can re-derive league_baseline + support_contribution + qb_created_value and get back the same number
        that's already on the board.
      </p>
    </div>
  )
}
