// Team abbreviations as they appear in leaderboard.json -- stable across 2019-2025
// (no divisional realignment in this window, so a static map is safe here).
export const DIVISIONS = {
  'AFC East': ['BUF', 'MIA', 'NE', 'NYJ'],
  'AFC North': ['BAL', 'CIN', 'CLE', 'PIT'],
  'AFC South': ['HOU', 'IND', 'JAX', 'TEN'],
  'AFC West': ['DEN', 'KC', 'LV', 'LAC'],
  'NFC East': ['DAL', 'NYG', 'PHI', 'WAS'],
  'NFC North': ['CHI', 'DET', 'GB', 'MIN'],
  'NFC South': ['ATL', 'CAR', 'NO', 'TB'],
  'NFC West': ['ARI', 'LA', 'SEA', 'SF'],
}

export const TEAM_DIVISION = Object.fromEntries(
  Object.entries(DIVISIONS).flatMap(([division, teams]) => teams.map((team) => [team, division])),
)
