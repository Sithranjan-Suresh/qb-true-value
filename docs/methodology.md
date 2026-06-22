# Methodology

## The Problem

When a quarterback's stat line looks great, it's hard to tell how much of that came from him versus from his offensive line, his receivers, and the defenses he happened to play. "QB True Value" splits a quarterback's real EPA per play into three pieces — a league baseline, what his support gave him, and what he created himself — so raw stats and situational credit stop getting mixed together.

## The Data

Four public, season-level inputs (2019–2025, 200+ pass attempts) feed the model:

- **Average separation** — how far the quarterback's receivers were getting open at the catch, from NFL Next Gen Stats, as a team-wide proxy for receiving help.
- **Time to throw** — how long the quarterback held the ball before releasing it, also from Next Gen Stats.
- **Pass block win rate** — ESPN's measure of how often the offensive line blocked a pass rush for 2.5+ seconds, the best public proxy for protection quality.
- **Opponent defensive EPA allowed** — how good the defenses faced that season actually were, computed game-by-game from official NFL play-by-play data.

## The Model

A single linear regression is fit once across all 250 qualifying quarterback-seasons, learning how those four support/opponent numbers relate to actual EPA per play. For each QB-season this produces a predicted EPA — what a league-average quarterback would be expected to produce given that level of help. The gap between a quarterback's actual EPA and that prediction is treated as his own contribution. The three pieces — league baseline, support contribution, and QB contribution — always add up exactly to his real EPA per play; nothing is invented, the same number is just split into three labeled parts.

## Known Limitations

- The model's support features (R² ≈ 0.03–0.04) explain only a small share of season-to-season EPA variance. This is actually consistent with the project's thesis: situational context determines less of a QB's output than conventional wisdom assumes. However, it also means the predicted baseline is a rough adjustment, not a precise forecast. Individual QB-season decompositions should be read directionally, not as precise measurements.
- Average separation is a team-wide proxy, not a per-target number — Next Gen Stats doesn't publish it at the quarterback level.
- The model is fit once across all seasons, so it can't capture a team's supporting cast changing faster than the data resolves.

## How to use this tool

- **Fans:** Use the leaderboard to see which QBs are actually outperforming their situations.
- **Fantasy players:** Use the What If? sliders to see how a QB might perform if moved to a better supporting cast.
- **Front office context:** Look at QB-created EPA for players changing teams — raw EPA overstates the value of QBs leaving strong supporting situations.

## One Concrete Finding

In 2023, C.J. Stroud's raw EPA per play ranked **80th** out of 250 qualifying quarterback-seasons — fairly ordinary for a rookie. But his **QB-created value** ranks **5th** in the entire 2019–2025 dataset. The raw stat line undersold him; the decomposition tells a more accurate story about how much of his rookie production was actually his own doing.
