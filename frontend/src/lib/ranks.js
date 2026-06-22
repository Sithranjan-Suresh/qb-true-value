// raw_rank and created_rank are computed once across the full pool of qualifying
// QB-seasons (not per-season), so "rank" stays consistent across the whole 2019-2025
// dataset regardless of which subset is currently displayed/sorted/filtered.
export function withRankDelta(data) {
  const byRawEpa = [...data].sort((a, b) => b.epa_per_play - a.epa_per_play)
  const rawRankByKey = new Map(byRawEpa.map((row, i) => [`${row.qb_id}_${row.season}`, i + 1]))

  const byCreatedEpa = [...data].sort((a, b) => b.qb_created_epa - a.qb_created_epa)
  const createdRankByKey = new Map(
    byCreatedEpa.map((row, i) => [`${row.qb_id}_${row.season}`, i + 1]),
  )

  return data.map((row) => {
    const key = `${row.qb_id}_${row.season}`
    const rawRank = rawRankByKey.get(key)
    const createdRank = createdRankByKey.get(key)
    return { ...row, rawRank, createdRank, rankDelta: rawRank - createdRank }
  })
}
