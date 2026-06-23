# QB True Value

A two-step model that splits every qualifying NFL quarterback's EPA per play into
three pieces — a league baseline, what his support gave him, and what he created
himself — so "good stats" and "good quarterback" stop being the same question.

> C.J. Stroud 2023: ranked 80th by raw EPA/play. Ranked 8th by QB-created EPA.
> Raw stats buried one of the best rookie seasons in recent NFL history.

## What it does

- Decomposes every qualifying QB-season (2019–2025, 200+ attempts) into league
  baseline + support contribution + QB contribution, an identity that always adds
  up exactly to the QB's real EPA per play.
- Ranks quarterbacks by raw EPA and by QB-created EPA side by side, with season and
  division filters, surfacing the QBs whose situation is hiding or inflating their
  real value — plus a forward-looking "Players to Watch" callout naming current QBs
  whose 2025 QB-created EPA is running ahead of their raw stats.
- Lets you simulate a QB in a different supporting cast with interactive What If?
  sliders, see in plain English how that changes what's attributable to him, and
  read off a Portability Score — what share of his production would travel with
  him to a new team.
- An Explore page with a raw-vs-created scatterplot (quadrant-labeled: Elite,
  Underrated, System-Dependent, Struggling) and a year-over-year trend chart on
  every QB's profile page.

## How it works

A two-step model, not a single regression:

1. **Step 1** fits a gradient boosting model on play-by-play data, predicting each
   play's EPA from pure game-state features alone (down, distance, field position,
   score state, win probability, time remaining, roof, weather) — no QB identity,
   no support features. This isolates "how hard was the situation," independent of
   who's playing.
2. **Step 2** regresses what's left over (a QB's actual EPA minus what the
   situation alone predicted, averaged across his season) against four public
   support features — receiver separation, time to throw, pass-block win rate, and
   opponent defense — using OLS. What that regression predicts is his support
   contribution; what's left over is his QB-created value.

The step-1 model's own R² is under 0.4% — expected, not a flaw: nflverse's EPA is
already computed relative to a down/distance/field-position-conditioned expected
points model, so game-state features have almost nothing left to explain. That
means step 2 runs on a clean, already situation-neutral residual.

## Why it's different

Public QB evaluation already has PFF grades, NGS Passing Score, and Kevin Cole's
Adjusted QB Efficiency (AQE) — but none of them decompose value into an explicit,
auditable QB-vs-support split:

- **NFL NGS Passing Score** scores pass execution against expectation with ML, but
  doesn't decompose value into QB vs. support components or produce a portable
  QB-created number.
- **Kevin Cole's AQE** adjusts EPA for drops, penalties, and schedule, but doesn't
  isolate offensive line quality or receiver separation as explicit support
  variables.
- **PFF Grades** are proprietary, non-reproducible, and based on play grading
  rather than outcome-based EPA decomposition — they can't be independently
  audited.

QB True Value is fully open-source and reproducible from public data (NFL
play-by-play, Next Gen Stats, ESPN pass-block win rate): anyone can re-run the
pipeline and get the same numbers, see the three-way split, and move the support
inputs themselves with the What If? simulator instead of trusting a black-box
score.

## How to run it

**Backend** (Python 3.11):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The committed artifacts in `backend/data/artifacts/` are all the backend needs —
the offline pipeline (`backend/scripts/`) does not need to be re-run unless you
want to rebuild the model from scratch. Re-running it requires the extra packages
in `backend/scripts/requirements.txt` (scikit-learn, joblib) on top of the
backend's own; the live API itself never imports either.

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev
```

By default the frontend expects the backend at `http://localhost:8000` (see
`frontend/.env.development`) and the backend allows `http://localhost:5173` by
default — run the frontend on its default port, not a custom one, or update
`ALLOWED_ORIGIN` to match (comma-separate multiple allowed origins).

**Live links:**

- Frontend: https://qb-true-value.vercel.app
- Backend API: https://qb-true-value.onrender.com/api/health

## Data sources

- NFL play-by-play (nflverse) — actual EPA per play, game-state features for the
  step-1 model, and opponent defensive EPA.
- NFL Next Gen Stats — average receiver separation and time to throw.
- ESPN — pass block win rate.

## Methodology

Full methodology — what each step of the model does, how it compares to existing
metrics, real year-over-year predictive-validity numbers, an honest discussion of
limitations, and how different audiences should use this tool — lives at
`/methodology` on the live app (served from [docs/methodology.md](docs/methodology.md)).

## Known limitations

- Step 2's support features explain only a small share of season-to-season
  residual variance (cross-validated R² ≈ 0.03–0.04), so the predicted baseline is
  a rough situational adjustment, not a precise forecast. This is expected — the
  model is designed to isolate the directional signal from support context, not to
  predict raw EPA.
- Year-over-year, raw EPA/play is actually slightly *more* stable than QB-created
  EPA (r=0.519 vs r=0.45 across 156 consecutive-season pairs) — not the result a
  clean "our metric is the truer signal" story would want, reported honestly
  rather than hidden. The two-step estimation adds its own noise that, at this
  sample size, outweighs the situational noise it removes. See the methodology
  page for the full breakdown.
- Average separation is a team-wide proxy, not a per-target number — Next Gen Stats
  doesn't publish it at the quarterback level.
- The model is fit once across all seasons, so it can't capture a team's
  supporting cast changing faster than the data resolves.

## Judging criteria alignment

- **Analytical insight:** a two-step model — a gradient-boosted situational
  baseline, then an OLS regression on the residual — isolates each quarterback's
  own contribution from both game-state difficulty and his explicit support
  context, not just one or the other.
- **Practical application:** front offices evaluating a QB changing teams can look
  at QB-created EPA and his Portability Score instead of raw EPA, which otherwise
  overstates the value of a QB leaving a strong supporting cast — and the
  leaderboard's Players to Watch callout turns that same logic into a current,
  forward-looking read instead of only a historical one.
- **Data presentation:** the leaderboard, decomposition waterfall, raw-vs-created
  scatterplot, year-over-year trend chart, and predictive-validity charts let a
  non-technical viewer see the same finding from multiple angles, with an
  interactive simulator and portability gauge to test it themselves.

## Project structure

- `backend/` — FastAPI app (`backend/app/`) and the offline data/model pipeline
  (`backend/scripts/`), which is never imported by the live API.
- `frontend/` — React + Vite app.
- `docs/methodology.md` — plain-language writeup served at `/api/methodology`.
