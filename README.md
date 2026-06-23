# QB True Value

A season-level decomposition model that splits every qualifying NFL quarterback's
EPA per play into three pieces — a league baseline, what his support gave him, and
what he created himself — so "good stats" and "good quarterback" stop being the
same question.

> C.J. Stroud 2023: ranked 80th by raw EPA/play. Ranked 5th by QB-created EPA.
> Raw stats buried one of the best rookie seasons in recent NFL history.

## What it does

- Decomposes every qualifying QB-season (2019–2025, 200+ attempts) into league
  baseline + support contribution + QB contribution, an identity that always adds
  up exactly to the QB's real EPA per play.
- Ranks quarterbacks by raw EPA and by QB-created EPA side by side, surfacing the
  QBs whose situation is hiding or inflating their real value.
- Lets you simulate a QB in a different supporting cast with interactive What If?
  sliders, and see in plain English how that changes what's attributable to him.

## Why it's different

Public QB evaluation already has PFF grades, NGS Passing Score, and ESPN's QB Pass
Score (AQE) — but each is a proprietary, single composite score with no published
formula. QB True Value is fully open-source and reproducible from public data (NFL
play-by-play, Next Gen Stats, ESPN pass-block win rate): anyone can re-run the
pipeline and get the same numbers. It also doesn't collapse everything into one
score — it keeps the three-way split (baseline, support, QB) visible and lets you
interactively move the support inputs with the What If? simulator, rather than
asking you to trust a black-box number.

## How to run it

**Backend** (Python 3.11):

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The committed artifacts in `backend/data/artifacts/` are all the backend needs —
the offline pipeline (`backend/scripts/`) does not need to be re-run unless you
want to rebuild the model from scratch.

**Frontend** (Node 18+):

```bash
cd frontend
npm install
npm run dev
```

By default the frontend expects the backend at `http://localhost:8000` (see
`frontend/.env.development`) and the backend allows `http://localhost:5173` by
default — run the frontend on its default port, not a custom one, or update
`ALLOWED_ORIGIN` to match.

**Live links:**

- Backend API: https://qb-true-value.onrender.com/api/health
- Frontend: *(coming soon)*

## Data sources

- NFL play-by-play (nflverse) — actual EPA per play and opponent defensive EPA.
- NFL Next Gen Stats — average receiver separation and time to throw.
- ESPN — pass block win rate.

## Methodology

Full methodology, including exactly what the model does, an honest discussion of
its limitations, and how different audiences should use this tool, lives at
`/methodology` on the live app (served from [docs/methodology.md](docs/methodology.md)).

## Known limitations

- The model's support features explain only a small share of season-to-season EPA
  variance (cross-validated R² ≈ 0.03–0.04), so the predicted baseline is a rough
  situational adjustment, not a precise forecast — see the methodology page for why
  this is actually consistent with the project's thesis.
- Average separation is a team-wide proxy, not a per-target number — Next Gen Stats
  doesn't publish it at the quarterback level.
- The model is fit once across all seasons, so it can't capture a team's
  supporting cast changing faster than the data resolves.

## Judging criteria alignment

- **Analytical insight:** a single linear regression, fit once across every
  qualifying QB-season on four public support/opponent features, isolates each
  quarterback's own contribution as the residual between his actual and predicted
  EPA per play.
- **Practical application:** front offices evaluating a QB changing teams can look
  at QB-created EPA instead of raw EPA, which otherwise overstates the value of a
  QB leaving a strong supporting cast.
- **Data presentation:** the leaderboard, decomposition waterfall, raw-vs-created
  scatterplot, and year-over-year trend chart let a non-technical viewer see the
  same finding from four different angles, with an interactive simulator to test
  it themselves.

## Project structure

- `backend/` — FastAPI app (`backend/app/`) and the offline data/model pipeline
  (`backend/scripts/`), which is never imported by the live API.
- `frontend/` — React + Vite app.
- `docs/methodology.md` — plain-language writeup served at `/api/methodology`.
