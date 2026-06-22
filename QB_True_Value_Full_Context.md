# QB True Value — Full Project Context

This document is self-contained. It covers the hackathon being entered, why this project was chosen over two alternatives, and the complete technical architecture and build plan. Anyone reading this cold (including a fresh Claude conversation with no prior history) should be able to pick up the project from here.

---

## Part 1: The hackathon

**Event:** AQX Sports Analytics Hackathon — free, fully virtual, open-source, open to any sport.

**What to build:** A software application, web app, dashboard, or predictive model centered on sports analytics, using real sports data to produce analytical insight on a sports-based problem.

**What to submit:** A working prototype, public GitHub source code, and a short project description covering the solution, features, and actionable impact. **No video demo required** — this matters architecturally, because it means judges review the project asynchronously by clicking a live link and/or reading the repo, not by watching a presenter walk through it in real time. There is no moment you control where you can "warm up" a service right before someone looks at it.

**Judging criteria (three, roughly equal weight):**
- **Analytical Insight** — statistical soundness of the method, depth of modeling, and whether the project surfaces actionable insight rather than surface-level stats.
- **Practical Application** — whether a coach, front office, or athlete could actually use the finding.
- **Data Presentation** — clarity of visualizations/dashboards, and the ability to communicate findings to a non-technical audience.

**Constraints driving the plan:** 7 days total, Python backend required, frontend should be aesthetic enough to impress judges, must deploy for free.

---

## Part 2: Why "QB True Value" was chosen

Three ideas were evaluated against the rubric above plus the 7-day/free-hosting constraints: (1) a cap-efficiency / roster-optimization tool ranking players by performance per cap dollar, (2) an EPA-based NFL draft pick value curve, and (3) QB True Value.

QB True Value won on a combination of factors: it scored highest simultaneously across all three judging categories (idea 1 had the highest practical-relevance ceiling but the highest execution risk due to needing scraped contract data and multi-year optimization; idea 2 was the lowest-risk and most clean-data option but the least narratively sharp of the three). QB True Value's core claim — "this QB's stats are largely his offensive line and receivers, not him" — compresses into one sentence a non-technical judge gets immediately, which directly serves the Data Presentation criterion, while the underlying decomposition method (separating QB-created value from support-created and opponent-driven value) is genuinely more statistically interesting than a leaderboard or a curve-fit.

**The scoping decision that makes it fit in 7 days:** the original research framing for this idea assumed play-level decomposition using raw NFL Big Data Bowl player-tracking data (pressure proximity, receiver separation per play) — that data engineering alone could consume the entire week. The adopted scope instead uses public **season-level** proxies (NFL Next Gen Stats leaderboards for average separation and time-to-throw, ESPN's Pass Block Win Rate, and opponent defensive EPA from nflverse play-by-play) and models at **QB-season** granularity rather than play-level. This is a deliberate honesty-about-the-data tradeoff: season-level proxies can't support play-level claims, so the model doesn't pretend to make them. A finished, defensible QB-season model beats an unfinished play-level one.

---

## Part 3: Architecture decisions and why

**Decoupled FastAPI backend + React frontend, not Streamlit.** Most sports analytics hackathon entries default to Streamlit dashboards or notebooks. A custom frontend behind a real API reads as an engineered product rather than an analysis script, which serves Data Presentation directly. Claude Code is what makes this achievable in 7 days instead of a multi-week undertaking.

**Precompute almost everything; keep the backend thin.** The model trains once, offline, and its outputs (predictions, residuals, coefficients) are exported as flat files committed to the repo. The backend's main job is loading those files and serving them. The one exception — and the actual reason a Python backend exists at all instead of a static site — is the "what-if" slider: recomputing a counterfactual EPA live from the trained model's coefficients when a user drags a separation/pressure value. That's a cheap calculation (not a retrain), so it can run live without real infrastructure.

**Free hosting: Render (backend) + Vercel (frontend).** Render's free web service tier requires no credit card and includes 750 free instance-hours per month, but free instances spin down after 15 minutes of inactivity and take 30–60 seconds to wake on the next request. **Because this hackathon has no video demo and judges review asynchronously, this risk is bigger than it would be for a live-demo format** — there's no single moment to "warm it up" beforehand, since you don't control when a judge clicks the link. This is addressed directly in the submission plan in Part 7 (keep-alive ping, not just a pre-demo warm-up).

---

## Part 4: User flow

Five screens, each designed to work as a standalone "wow" moment in case a judge only opens one.

**Landing.** One sentence stating the thesis — raw QB stats conflate three things: the QB, the offensive line/receivers, and the opponent — followed immediately by one example QB's decomposition as a hero visual.

**Leaderboard.** Every qualifying QB-season ranked by QB-created EPA/play, with raw EPA shown alongside so the gap is visible. Sortable by raw EPA, QB-created EPA, and "support dependency" (share of production attributable to support rather than the QB). The ranking should visibly reorder some names relative to a standard EPA leaderboard — that reordering is the proof of the thesis.

**QB detail page.** A three-way decomposition (QB-created / support-created / environment-driven) as a waterfall chart, plus a secondary situational split (pressure vs. clean pocket) if that stretch goal gets built.

**What-if panel (on the detail page).** Sliders for separation, pressure rate, and opponent defensive EPA that recompute and animate a counterfactual EPA live. This is the single feature most likely to make a judge stop and ask a follow-up question.

**Methodology page.** A short, plain-language explanation of the model plus a simplified version of the architecture diagram, written for someone who has never heard of EPA. Given there's no video demo, this page carries more weight than usual — it's the only place a non-technical judge gets the "why should I trust this" explanation if they never read the GitHub README closely.

---

## Part 5: Folder structure

```
qb-true-value/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, startup data load
│   │   ├── routers/
│   │   │   ├── qbs.py             # /api/qbs, /api/qbs/{id}
│   │   │   ├── whatif.py          # /api/whatif
│   │   │   └── methodology.py     # /api/methodology
│   │   ├── schemas.py             # Pydantic response/request models
│   │   ├── services/
│   │   │   ├── data_store.py      # in-memory dataframe loader + cache
│   │   │   └── inference.py       # live what-if prediction from saved coefficients
│   │   └── config.py
│   ├── data/
│   │   ├── raw/                   # untouched source pulls (gitignored if large)
│   │   ├── processed/
│   │   │   └── qb_season.parquet  # final modeling table
│   │   └── artifacts/
│   │       ├── model_coefficients.json
│   │       ├── qb_decomposition.json
│   │       └── leaderboard.json
│   ├── scripts/
│   │   ├── 01_ingest_pbp.py
│   │   ├── 02_ingest_support_metrics.py
│   │   ├── 03_build_features.py
│   │   ├── 04_train_model.py
│   │   └── 05_export_artifacts.py
│   ├── notebooks/
│   │   └── eda.ipynb              # exploratory work, sanity checks, not shipped
│   ├── tests/
│   │   └── test_endpoints.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── QBDetail.jsx
│   │   │   └── Methodology.jsx
│   │   ├── components/
│   │   │   ├── DecompositionChart.jsx
│   │   │   ├── WhatIfPanel.jsx
│   │   │   ├── LeaderboardTable.jsx
│   │   │   └── NavBar.jsx
│   │   ├── lib/
│   │   │   └── api.js             # fetch wrappers, base URL from env
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── .github/
│   └── workflows/
│       └── keep-alive.yml         # pings /api/health every 10 min so Render never sleeps
├── docs/
│   ├── architecture.md            # this document
│   └── methodology.md             # plain-language model writeup, reused on the Methodology page
├── screenshots/                   # leaderboard, detail page, what-if panel mid-interaction
└── README.md
```

`backend/scripts` is the offline pipeline and is never imported by the running API; `backend/app` is the thin serving layer and is the only part that needs to survive a Render deploy. A bug in the model pipeline never breaks the live demo — you re-run `scripts/` locally and re-export new JSON without redeploying anything.

---

## Part 6: Backend architecture

FastAPI, Python 3.11, served by Uvicorn. No database — everything served is read-only, precomputed, and small enough to live in memory.

**Startup.** `data_store.py` loads `qb_season.parquet`, `leaderboard.json`, `qb_decomposition.json`, and `model_coefficients.json` once at boot into memory. Every request reads from that in-memory state — no per-request disk I/O.

**Endpoints:**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/qbs` | Leaderboard: every QB-season with raw EPA, QB-created EPA, support-share, sortable fields |
| GET | `/api/qbs/{qb_id}` | One QB's full decomposition, situational split, and metadata for the detail page |
| POST | `/api/whatif` | Body: `{qb_id, separation, pressure_rate, opponent_epa}` → recomputed counterfactual EPA using saved regression coefficients |
| GET | `/api/methodology` | Static methodology text/sections, so the frontend doesn't hardcode it |
| GET | `/api/health` | Plain 200 — used by the keep-alive GitHub Action so the Render instance never spins down during async judging |

**Inference service.** `inference.py` holds the trained coefficients (loaded once at startup) and a pure function `predict(features) -> epa`. If the model is linear, coefficients can be exported as plain JSON and the dot product done in pure Python — no scikit-learn dependency needed at serve time, no model-unpickling cold-start cost.

**CORS.** Locked to the deployed Vercel domain plus `localhost` for development.

**Deployment config.** `render.yaml` defines the web service (Python, build command `pip install -r requirements.txt`, start command `uvicorn app.main:app --host 0.0.0.0 --port 10000`), free instance type. A `Procfile` is included as a fallback.

---

## Part 7: Data pipeline

**Sources** (all public, no scraping infrastructure required):

| Source | Provides | Access |
|---|---|---|
| nflverse play-by-play (via `nfl_data_py`) | EPA/play, down/distance/score state, passer and team IDs, season | `pip install nfl_data_py`, direct function calls |
| NFL Next Gen Stats public leaderboards | Time to throw (QB-level, Passing leaderboard) and average separation (receiver-level, Receiving leaderboard, aggregated to a targets-weighted team-season average — see engineering spec 1.2 for why this isn't a per-QB pull) | Public season tables on nextgenstats.nfl.com; small enough to hand-collect into CSV |
| ESPN Pass Block Win Rate / Run Block Win Rate | Team-season offensive line proxy | Public season tables, same hand-collection approach |

**Pipeline steps** (`backend/scripts`, run locally, never on the server):

`01_ingest_pbp.py` pulls play-by-play for the chosen seasons and aggregates to QB-season: EPA/play, attempts, completion rate, sack rate.

`02_ingest_support_metrics.py` loads NGS and ESPN season tables and standardizes team/QB identifiers so they join cleanly against nflverse data. ID mismatches are the most likely silent failure point — this script should print row-count and join-coverage diagnostics every run.

`03_build_features.py` joins everything into one QB-season table and adds the opponent-strength feature (average defensive EPA allowed by that QB's opponents that season).

`04_train_model.py` fits the regression described in Part 8 and saves coefficients.

`05_export_artifacts.py` writes the JSON files the backend serves plus the leaderboard, so the backend never touches pandas at runtime.

**Output schema** (`qb_season.parquet`, one row per QB-season): `qb_id, qb_name, team, season, epa_per_play, attempts, avg_separation, time_to_throw, pass_block_win_rate, opponent_def_epa, predicted_epa, qb_created_epa, support_share`

---

## Part 8: Model pipeline

**Level of aggregation: QB-season, not play-level.** The available support data (NGS leaderboards, ESPN line grades) is season-granularity. Merging it onto individual plays would manufacture false precision. Modeling honestly at the level the data supports is the right tradeoff, and it's the version achievable in 7 days.

**Core model.** Linear regression (OLS or Ridge, whichever cross-validates better) predicting `epa_per_play` from `avg_separation`, `time_to_throw`, `pass_block_win_rate`, and `opponent_def_epa`. The fitted value is "what a league-average QB would be expected to produce given this support"; the residual (actual minus predicted) is QB-created value. Add team or season fixed effects only if there are enough rows to support them without overfitting — check this empirically.

**Validation.** Report R² and residual diagnostics (no major heteroskedasticity, no single team dominating residuals). Run a name-level sanity check: QBs known for elite play behind bad lines should score well on QB-created value even with mediocre raw EPA, and vice versa for system-dependent QBs. If several well-known cases fail this check, revise the model before anything else — this matters more for credibility than the R² number, especially with no video demo to talk through the nuance live.

**Stretch goal (only if days 1–5 finish on schedule): situational split.** Split plays into pressure vs. clean-pocket subsets directly from play-by-play (no new data needed) and report EPA/play in each. Cheap to add because the data is already in hand from the ingestion step.

**What-if inference.** Because the model is linear, a counterfactual is a substitution into the same equation: `predicted_epa = b0 + b1*separation + b2*ttt + b3*pbwr + b4*opp_epa`. The frontend sends slider values; the backend returns the new predicted EPA and the implied QB-created value. No retraining, no latency concern.

---

## Part 9: Visualization plan

**Design direction.** Dark, editorial, data-forward — closer to a sports-media stats site than a generic admin dashboard template. One accent color for "QB-created" value and one neutral tone for "support/environment" value, used consistently across every chart.

**Leaderboard page.** A sortable table where the EPA bar is the visualization itself — each row shows a small inline stacked bar (QB-created segment + support segment) next to the name.

**QB detail page.** A waterfall chart: raw EPA → minus support contribution → minus opponent contribution → QB-created EPA remaining. This is the chart that makes the thesis legible in five seconds, which matters more than usual given there's no presenter to narrate it.

**What-if panel.** Three sliders, a live-updating number, and an animated re-draw of the waterfall as values move.

**Methodology page.** Mostly prose plus a simplified pipeline diagram, written for someone who has never heard of EPA.

**Library choice.** Recharts for bar/waterfall visuals — lightweight, good React fit, no D3 boilerplate needed in 7 days.

---

## Part 10: Milestones — 7 day plan

| Day | Focus | Deliverable | Claude Code's job |
|---|---|---|---|
| 1 | Data ingestion | `01_ingest_pbp.py` and `02_ingest_support_metrics.py` working, raw tables saved, join-coverage verified | Write ingestion scripts and join-coverage diagnostics; you verify row counts make football sense |
| 2 | Feature engineering | `03_build_features.py` complete, final `qb_season.parquet` schema locked | Write join/feature logic; you spot-check 5–10 known QBs by hand |
| 3 | Model build | `04_train_model.py` and `05_export_artifacts.py` complete, sanity checks passed, FastAPI skeleton scaffolded | Implement regression, diagnostics, artifact export; scaffold the FastAPI app structure |
| 4 | Backend complete | All five endpoints working locally, backend deployed to Render, `/api/health` reachable publicly | Implement all routers and the inference service; configure `render.yaml` and deploy |
| 5 | Frontend scaffold | Leaderboard and QB detail pages rendering real data from the deployed backend | Scaffold React app, wire `lib/api.js` to the live Render URL, build `LeaderboardTable` and `DecompositionChart` |
| 6 | Interactivity + polish + reliability | What-if panel live and animated, methodology page written, visual design pass complete, frontend deployed to Vercel, keep-alive GitHub Action added | Build `WhatIfPanel` with live slider-to-chart animation; apply design direction across pages; write `.github/workflows/keep-alive.yml` pinging `/api/health` every 10 minutes |
| 7 | QA + submission | Screenshots captured, run-locally instructions verified, README and project description written, GitHub repo public and clean, final checks complete | Write the README, the run-locally setup script, and capture/insert screenshots; you write the project description in your own voice |

**Built-in buffer:** day 7 is intentionally light on new feature work. If days 1–6 slip, cut the situational-split stretch goal in Part 8 first — a finished core product with one fewer chart beats an unfinished one with two extra charts.

---

## Part 11: Submission plan (updated for async, no-video-demo review)

Because judges review asynchronously by clicking a link and reading a repo rather than watching a live walkthrough, three things matter more here than they would in a presented-demo format:

**Keep-alive, not just a pre-demo warm-up.** A GitHub Action (or a free external pinger like cron-job.org) hits `/api/health` every 10 minutes for the duration of the judging window. This removes the cold-start risk entirely instead of just reducing it, since there's no controllable moment to warm the service up beforehand.

**Screenshots/GIFs in the README, not just a live link.** With no narrator and no video, a meaningful share of your Data Presentation score rests on what's visible directly in the repo for any judge who doesn't click through live, or who hits the rare moment the service is down despite the keep-alive. Include screenshots of the leaderboard, the decomposition waterfall, and the what-if slider mid-interaction.

**A "run locally" fallback.** One-command setup instructions (a short shell script plus two or three install/run commands) so "working prototype" stays true even if Render free-tier hours run out or the service is suspended for any reason. This also reinforces the "public source code" requirement by proving the code actually runs, not just that it exists.

**Final checklist:** public GitHub repo matching the folder structure above; README stating the thesis in its first paragraph, not buried under setup instructions; screenshots committed to `screenshots/`; live links to both the Vercel frontend and the Render `/api/health` check; keep-alive Action confirmed running; run-locally instructions tested from a clean clone; and a short project description — written by you, not generated — covering the problem, the method, and one concrete finding, since this is the piece judges will read most carefully.
