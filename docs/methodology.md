# Methodology

## The problem, in one sentence

When a quarterback's stat line looks great, it's hard to tell how much of that came from him versus from his offensive line, his receivers, and the defenses he happened to play — and "QB True Value" tries to split that apart.

## Why this matters

Every QB conversation — MVP debates, contract extensions, draft evaluations — leans on raw stats like EPA per play (a measure of how much a play improved a team's chance of scoring, averaged across every snap). But raw EPA conflates three different things: what the quarterback himself created, what his supporting cast handed him, and how tough his opponents were. A QB throwing to wide-open receivers behind a dominant offensive line will post great numbers even if he's making fairly ordinary decisions. A QB getting hit on every other drop-back can look mediocre on paper while actually playing well above his situation. This project tries to separate those two effects using public data, season by season.

## What data was used, and why

Four pieces of information go into the model, one row per qualifying quarterback-season (200+ pass attempts), covering 2019–2025:

- **Average separation** — how far the quarterback's receivers were getting open, on average, at the moment of the catch. Pulled from the NFL's own Next Gen Stats Receiving leaderboard and averaged across a team's pass-catchers, weighted by how often each one was targeted. (Next Gen Stats only publishes this at the receiver level, not the quarterback level — so this is a team-wide proxy for "how much help is this QB's receiving corps giving him," not a number about any one throw.)
- **Time to throw** — how long, on average, the quarterback held the ball before releasing it. Faster is sometimes a sign of a quick, decisive process; slower can mean either patience or pressure. Pulled directly from Next Gen Stats' Passing leaderboard.
- **Pass block win rate** — ESPN's measure of how often a team's offensive line successfully blocked a pass rush for at least 2.5 seconds. This is the most direct public proxy available for "how good is this team's pass protection."
- **Opponent defensive EPA allowed** — how good, on average, were the defenses this quarterback actually played against that season. Computed directly from official NFL play-by-play data (nflverse), game by game, so a team faced twice counts twice.

These were chosen because they're all public, season-level, and don't require any proprietary tracking data — and because, taken together, they cover the three biggest "non-QB" inputs to a passing offense: the receivers, the offensive line, and the schedule.

## What the model does, in plain language

A statistical model (linear regression) is fit once across every qualifying quarterback-season, learning the relationship between those four support/opponent numbers and a quarterback's actual EPA per play. That gives, for every QB-season, a "predicted" EPA — essentially, "given this level of receiver separation, protection, and opponent strength, here's what a league-average quarterback would be expected to produce." The gap between a quarterback's *actual* EPA and that *predicted* EPA is treated as the part attributable to the quarterback himself, separate from his situation. Concretely:

```
league average  +  (predicted EPA − league average)  +  (actual EPA − predicted EPA)  =  actual EPA
   baseline                support contribution                QB contribution
```

These three numbers always add up exactly to the quarterback's real EPA per play — nothing is invented, it's the same number, split into three labeled pieces. The waterfall chart on each quarterback's page draws exactly this split.

## An honest caveat

The model's four support features explain a modest share of the season-to-season variation in EPA (cross-validated R² ≈ 0.03–0.04). In plain terms: separation, time-to-throw, pass protection, and opponent strength only go so far in predicting how a quarterback's season turns out — which itself is informative. It suggests that, at the season level, quarterback play is not nearly as determined by these support factors as conventional wisdom sometimes assumes, and that a meaningful share of what separates QB-seasons is something this model attributes to the quarterback. That's consistent with the project's thesis, but it also means the "predicted EPA" baseline should be read as a rough situational adjustment, not a precise forecast.

## One concrete finding

In 2023, C.J. Stroud's raw EPA per play ranked **80th** out of the 250 qualifying quarterback-seasons in this dataset — a fairly ordinary raw number for a rookie. But his **QB-created value** (the residual after accounting for his receivers' separation, his line's pass-block win rate, and the defenses he faced) ranks **5th** in the entire 2019–2025 dataset. The raw stat line undersold him; the decomposition tells a different, more accurate story about how much of his rookie production was actually his own doing.
