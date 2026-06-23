// Portability = how much of this QB's production survives independent of his
// supporting cast, as a clean 0-100% magnitude ratio: |qb_component| / (|qb_component|
// + |support_component|) * 100. This is deliberately the same well-behaved formula
// already powering the leaderboard's "How It Was Made" bar (100 - support_share*100),
// not qb_created_epa / raw epa_per_play -- that literal ratio blows up whenever raw
// EPA is near zero (e.g. G.Minshew 2023 -> -5100%, A.Rodgers 2022 -> +1767%), which
// happens on ~37% of QB-seasons in this dataset and can't be displayed on a 0-100%
// gauge. Flagged and confirmed with the user before building this.
export function computePortability(qbComponent, supportComponent) {
  const denom = Math.abs(qbComponent) + Math.abs(supportComponent)
  if (denom === 0) return 50
  return (Math.abs(qbComponent) / denom) * 100
}
