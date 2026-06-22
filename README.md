# QB True Value

Raw quarterback stats conflate three different things: what the quarterback himself
created, what his offensive line and receivers handed him, and how tough the
defenses he faced were. QB True Value is a season-level decomposition model that
separates those three apart for every qualifying NFL quarterback-season from
2019–2025 — so "good stats" and "good quarterback" stop being the same question.

As one concrete example: C.J. Stroud's 2023 raw EPA per play ranks **80th** out of
250 qualifying QB-seasons in this dataset — a fairly ordinary number for a rookie.
His **QB-created value**, the part of that production attributable to him rather
than his receivers, his line, or his opponents, ranks **5th**. The raw stat line
undersold him; the decomposition tells a different story.

## Screenshots

![Leaderboard](screenshots/leaderboard.png)
![QB decomposition waterfall](screenshots/qb-detail.png)
![What-if panel](screenshots/whatif.png)

*(screenshots coming soon)*

## How it works

A linear regression is fit once, offline, across every qualifying QB-season (200+
pass attempts), predicting EPA per play from four public season-level proxies:
receiver separation, time to throw, pass-block win rate, and opponent defensive
EPA allowed. The gap between a QB's actual EPA and what that model predicts for his
situation is treated as his own contribution. Full methodology, data sources, and
an honest discussion of the model's limitations live at `/methodology` on the live
app, and in [docs/methodology.md](docs/methodology.md).

## Run locally

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

## Live links

- Backend API: https://qb-true-value.onrender.com/api/health
- Frontend: *(coming soon)*

## Project structure

- `backend/` — FastAPI app (`backend/app/`) and the offline data/model pipeline
  (`backend/scripts/`), which is never imported by the live API.
- `frontend/` — React + Vite app.
- `docs/methodology.md` — plain-language writeup served at `/api/methodology`.
