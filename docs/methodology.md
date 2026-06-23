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

A two-step model. Step 1 fits a gradient boosting model on play-by-play data, predicting each play's EPA from pure game-state features alone — down, distance, field position, score differential, win probability, time remaining, roof, and weather — with no QB identity and no support features. This gives an "expected EPA" for that exact situation, regardless of who's playing. Step 2 takes the residual left over (a QB's actual EPA minus what the situation alone would predict, averaged across his season) and regresses that residual against the four support features using OLS. What that regression predicts is his support contribution; what's left over is his QB-created value. The three pieces — league baseline, support contribution, and QB contribution — always add up exactly to his real EPA per play; nothing is invented, the same number is just split into three labeled parts.

## Known Limitations

- Our step-1 gradient boosting model confirms that nflverse EPA is already situation-neutral — game-state features (down, distance, field position, win probability) explain less than 0.4% of per-play EPA variance, which is the expected result when working with a pre-adjusted outcome variable. This means the support regression in step 2 is operating on a clean, situation-neutral residual.
- Step 2's support features (R² ≈ 0.03–0.04) explain only a small share of season-to-season residual variance. This is actually consistent with the project's thesis: situational context determines less of a QB's output than conventional wisdom assumes. However, it also means the predicted baseline is a rough adjustment, not a precise forecast. Individual QB-season decompositions should be read directionally, not as precise measurements.
- Average separation is a team-wide proxy, not a per-target number — Next Gen Stats doesn't publish it at the quarterback level.
- The model is fit once across all seasons, so it can't capture a team's supporting cast changing faster than the data resolves.

## How to use this tool

- **Front office context:** Teams evaluating QBs in free agency or trades can strip away the support context from their previous team — raw EPA overstates the value of QBs leaving strong supporting situations, and understates QBs like Stroud leaving weak ones.
- **Fans:** Use the leaderboard to see which QBs are actually outperforming their situations.
- **Fantasy players:** Use the What If? sliders to see how a QB might perform if moved to a better supporting cast.

## Concrete Findings

In 2023, C.J. Stroud's raw EPA per play ranked **80th** out of 250 qualifying quarterback-seasons — fairly ordinary for a rookie. But his **QB-created value** ranks **5th** in the entire 2019–2025 dataset. The raw stat line undersold him; the decomposition tells a more accurate story about how much of his rookie production was actually his own doing.

Conversely, P.Rivers' 2020 raw EPA per play ranked **35th**, but his QB-created value falls to **115th** — a strong offensive line (60% pass-block win rate) and a soft slate of opposing defenses did most of the work that season, not him.
