const COMPARISONS = [
  {
    name: 'NFL NGS Passing Score',
    blurb:
      'Uses machine learning to score pass execution against expectation, but does not decompose value into QB vs. support components or produce a portable QB-created number.',
  },
  {
    name: "Kevin Cole's Adjusted QB Efficiency (AQE)",
    blurb:
      "Adjusts EPA for drops, penalties, and schedule, but doesn't isolate offensive line quality or receiver separation as explicit support variables.",
  },
  {
    name: 'PFF Grades',
    blurb:
      "Proprietary, non-reproducible, and based on play grading rather than outcome-based EPA decomposition — can't be independently audited.",
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
            <p className="font-(family-name:--font-display) text-lg font-semibold text-(--color-text-primary) mb-1">
              {c.name}
            </p>
            <p className="text-sm leading-relaxed text-(--color-text-secondary)">{c.blurb}</p>
          </div>
        ))}
      </div>

      <p className="text-sm font-medium text-(--color-text-primary)">
        QB True Value is the only fully open-source framework that explicitly decomposes raw EPA into three
        additive parts — league baseline, support contribution, and QB-created value — using public data
        anyone can reproduce.
      </p>
    </div>
  )
}
