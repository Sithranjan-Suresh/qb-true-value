# QB True Value — Engineering Specification

This document specifies every component of the system at a level where it can be built without clarifying questions. Read Part 0 first — it defines the data contracts, naming conventions, and formulas that every other component references rather than redefines.

**Season range: 2019–2025.** ESPN Pass Block Win Rate data is not publicly available for 2018, so 2018 is excluded from the analysis. All scripts default to `--start-season 2019 --end-season 2025`.

**Companion files in this repo:**
- `QB_True_Value_Full_Context.md` — product context, UI spec, Day 1–7 timeline
- `ngs_glossary.md` — official NGS stat definitions (reference for any ambiguity about what a column measures)
- `backend/data/raw/ngs_passing_raw.xlsx` — hand-collected, 2019–2025 sheets + extras
- `backend/data/raw/ngs_receiving_raw.xlsx` — hand-collected, 2019–2025 sheets + extras
- `backend/data/raw/espn_pbwr_raw.xlsx` — hand-collected, 2019–2025 sheets (2018 not available)

---

## Part 0: Data contracts and conventions (read this first)

**QB identifier.** Every QB is identified by their nflverse/GSIS player ID, a string like `"00-0033873"`. This is the join key across every dataset and artifact. Names (`qb_name`) are for display only, never for joining.

**Qualification threshold.** A QB-season only enters the system if the QB had **200 or more pass attempts** that season. This is a named constant (`MIN_QUALIFYING_ATTEMPTS = 200`) defined once in `backend/app/config.py` and imported everywhere it's needed (ingestion, training, export) — it must never be hardcoded a second time anywhere else in the codebase.

**QB-season key.** Wherever a QB-season needs to be addressed as a single string (JSON dictionary keys, frontend route params), the format is `f"{qb_id}_{season}"`, e.g. `"00-0033873_2023"`.

**The decomposition formula (the core of the whole product — defined once, here, and nowhere else):**

```
league_baseline      = mean(epa_per_play) across all qualifying QB-seasons in the training set
support_component    = predicted_epa - league_baseline
qb_component          = epa_per_play - predicted_epa
```

These three terms always sum exactly to `epa_per_play`: `league_baseline + support_component + qb_component == epa_per_play`. This identity is what the waterfall chart visualizes and what every "decomposition" artifact must preserve. Any component that computes or displays these values must use this exact formula — there is no second valid definition anywhere in this system.

**Support share (used for leaderboard sorting only, not the waterfall):**

```
support_share = round( abs(support_component) / (abs(support_component) + abs(qb_component) + 1e-9), 3 )
```

Clipped to `[0, 1]`. This is "how much of this QB's deviation from league average is attributable to support rather than to the QB" — a sorting/filtering convenience, not part of the additive identity above.

**Feature ranges for the what-if sliders.** For each of the four model features, the valid slider range is the 5th and 95th percentile of that feature's distribution across the qualifying training set (not the raw min/max, which would be skewed by outliers). Computed once during training, stored in `model_coefficients.json`, never recomputed elsewhere.

**Rounding convention.** All floats written to any JSON artifact or API response are rounded to 3 decimal places before serialization. This is non-negotiable for diffing artifacts in git and for consistent frontend display.

**Numbering convention for pipeline scripts.** Scripts in `backend/scripts/` are numbered and must be run in that order; each one's output is the next one's input. None of them are imported by the live backend — they are run locally, and their output files are committed to the repo.

---

## Part 1: Data pipeline components

### 1.1 — `backend/scripts/01_ingest_pbp.py`

**Purpose.** Pull NFL play-by-play data and aggregate it to one row per QB-season of raw on-field stats.

**Inputs.** CLI arguments `--start-season` and `--end-season` (ints, inclusive range, e.g. `--start-season 2019 --end-season 2025`). Internally calls `nfl_data_py.import_pbp_data(years)` for that range. No other input files.

**Season range rationale.** The range starts at 2019, not 2018, because ESPN Pass Block Win Rate data is not publicly available for 2018 — including 2018 would leave `pass_block_win_rate` null for every 2018 QB-season, which would corrupt the regression. Seven seasons (2019–2025) gives ~210 qualifying QB-season rows, which is sufficient for a stable OLS fit with three support covariates.

**Outputs.** `backend/data/raw/pbp_qb_season_raw.csv` with exactly these columns: `qb_id` (string), `qb_name` (string), `team` (string, 2-3 letter abbreviation matching nflverse convention), `season` (int), `epa_per_play` (float, mean EPA across the QB's pass attempts, sacks, and scrambles that season), `attempts` (int, pass attempts only), `completion_rate` (float, 0–1), `sack_rate` (float, 0–1, sacks divided by attempts+sacks).

**Dependencies.** `nfl_data_py`, `pandas`, `pyarrow` (for downstream parquet compatibility). Python 3.11.

**Acceptance criteria.**
- Running `python 01_ingest_pbp.py --start-season 2019 --end-season 2025` completes without error in under 5 minutes on a standard laptop.
- Output file has no duplicate `(qb_id, season)` pairs.
- For a QB who recorded attempts for more than one team in a season (a midseason trade), the row's `team` field is the team for which he had the most pass attempts that season — this rule is applied before deduplication, not after, so it never produces two competing rows for the same `(qb_id, season)` pair in the first place.
- No nulls in any column for rows where `attempts >= 200`.
- Row count for any single season, after filtering to `attempts >= 200`, falls between 25 and 40 (the known real-world range of qualifying starters per NFL season) — if outside this range, the script must print a warning rather than fail silently.

---

### 1.2 — `backend/scripts/02_ingest_support_metrics.py`

**Purpose.** Standardize three manually-collected public data sources (NGS Passing — time-to-throw, NGS Receiving — separation, ESPN Pass Block Win Rate) into one joinable table. **Important correction to the original framing: `avg_separation` is a team-level proxy, not a QB-level stat.** NGS publishes average separation on its Receiving leaderboard — it measures a receiver's distance from his nearest defender at the catch point — not on the Passing leaderboard, so there is no public per-QB separation number to pull directly. This script computes a targets-weighted team-season average across all of a team's pass-catchers and treats the result exactly like `pass_block_win_rate` below: a team-level number that applies to every QB on that team that season.

**Inputs.** Three files placed by hand into `backend/data/raw/` before running this script (small public season tables, collected manually since no clean bulk API exists for any of them). Each may be provided either as a flat CSV with an explicit `season` column, or as an Excel workbook with one sheet per season — whichever matches how you actually collected it. **If using the workbook format, name each sheet with the plain four-digit season (e.g. `"2018"`, not `"2018 REG"` or similar), because `season` does not exist as a column inside the sheet — it is implied by the sheet name, and the script must stamp it onto every row explicitly when reading each sheet (`pd.read_excel(path, sheet_name=None)` returns a dict keyed by sheet name; loop over it, assign `season = int(sheet_name)` to each resulting frame, then concatenate). Skipping this step is the most likely way to end up with a join that silently drops every row, since a missing or null `season` value fails the join against `pbp_qb_season_raw.csv` without raising an error.**
- `ngs_passing_raw.xlsx` — actual columns as collected from `nextgenstats.nfl.com/stats/passing/{season}/REG/all`: `PLAYER NAME`, `TEAM`, `Year`, `TT`, `CAY`, `IAY`, `AYD`, `AGG%`, `LCAD`, `AYTS`, `ATT`, `YDS`, `TD`, `INT`, `RATE`, `COMP%`, `xCOMP%`, `+/-`. This file already has a `Year` column inside each sheet, so no sheet-name stamping is needed — read `Year` directly. The only columns this script uses are `PLAYER NAME` (→ `qb_name`), `TEAM` (→ `team`), `Year` (→ `season`), and `TT` (→ `time_to_throw`). Note: the 2025 sheet has an Excel formula error (`#ERROR!`) in the last column header — this does not affect the columns we use and should not cause the script to fail; select columns by name, not by position. QB-level stat; no aggregation needed.

- `ngs_receiving_raw.xlsx` — actual columns as collected from `nextgenstats.nfl.com/stats/receiving/{season}/REG/all`: `YEAR`, `PLAYER NAME`, `TEAM`, `POS`, `CUSH`, `SEP`, `TAY`, `TAY%`, `REC`, `TAR`, `CTCH%`, `YDS`, `TD`, `YAC/R`, `xYAC/R`, `+/-`. This file also has a `YEAR` column inside each sheet, so the sheet-name stamping step is not needed here either. The only columns this script uses are `YEAR` (→ `season`), `TEAM` (→ `team`), `SEP` (→ `avg_separation`), `TAR` (→ `targets`), and `POS` (used for filtering — keep only rows where `POS` is `"WR"` or `"TE"` before aggregating; `POS` itself is not written to the output). Receiver-level; aggregated to team-season as described in the Processing section above.

- `espn_pbwr_raw.xlsx` — actual columns as collected from ESPN's annual Pass Block Win Rate articles. The `YEAR` column is already present inside each sheet (same as the NGS files), so no sheet-name stamping is needed. **Critical: the `Pass Block Win Rate` column is NOT consistently formatted across sheets.** Sheets 2023–2025 use the string format `"63% (21)"` where the number in parentheses is the rank — extract only the numeric percentage, convert to float, divide by 100 (e.g. `"63% (21)"` → `0.63`). Sheets 2019–2022 use plain decimal format already (e.g. `0.63`) — no parsing needed. The script must detect which format is present for each sheet and handle both without error. Additionally, the team name column header is `"team"` (lowercase) in 2023–2025 sheets and `"Team"` (capital T) in 2019–2022 sheets — use `str.strip().lower()` on all column names after reading each sheet to normalize this before any column access. The only columns this script uses are `YEAR` (→ `season`) and `Pass Block Win Rate` (→ `pass_block_win_rate`). **Important: 2019 only has two stat columns (`Pass Rush Win Rate` and `Pass Block Win Rate`) — `Run Stop Win Rate` and `Run Block Win Rate` are absent. The script must not assume these columns exist and must select `Pass Block Win Rate` by name, not by position.**

**Dependencies addition.** If any input is `.xlsx`, this script needs `openpyxl` (pandas' Excel engine) — this is an offline-pipeline-only dependency and must not leak into `backend/requirements.txt` for the live service (see 3.1).

**`TEAM_ABBR_MAP`.** This dictionary must handle two distinct normalization problems, not one. First, abbreviation quirks: sources use different short codes for the same team (e.g. `"LA"` vs `"LAR"`, `"WSH"` vs `"WAS"`, `"LV"` vs `"OAK"`). Second, full team name → abbreviation: ESPN's older sheets use full names (`"Oakland Raiders"`, `"Washington Redskins"`, `"Washington Football Team"`, `"Los Angeles Rams"`, etc.) that must be mapped to nflverse abbreviations. Both cases must be in the same dictionary and applied with a single `.map()` pass before any join. If a team string from any source is not found in `TEAM_ABBR_MAP`, the script must print the unrecognized value and exit with a non-zero status — a silent None in the team column will produce a join miss with no error message, which is the hardest class of bug to diagnose in this pipeline.

**Processing.** Before joining, the script computes `team_avg_separation` per `(team, season)` as `sum(SEP * TAR) / sum(TAR)` across every row in `ngs_receiving_raw.xlsx` for that team-season (after filtering to `POS` in `["WR", "TE"]`) — a targets-weighted mean, not a flat average. `TEAM_ABBR_MAP` normalization is applied to all three input sources before this aggregation step.

**Outputs.** `backend/data/raw/support_metrics_standardized.csv` with columns `team, season, qb_name, avg_separation, time_to_throw, pass_block_win_rate`, where `avg_separation` is the team-level targets-weighted mean computed from `ngs_receiving_raw.xlsx` (the column name is `avg_separation` in the output for compatibility with downstream scripts — only its derivation changed from the original spec). Team abbreviations are normalized against `TEAM_ABBR_MAP` before this file is written.

**Dependencies.** `pandas`. No network calls — this script only standardizes already-downloaded files.

**Acceptance criteria.**
- Script prints a join-coverage report against `pbp_qb_season_raw.csv` from 1.1: the percentage of qualifying QB-seasons (by `qb_name` + `team` + `season`) that find a match in the standardized output.
- Script exits with a non-zero status and prints the list of unmatched rows if coverage is below 95% — this is the single most likely silent failure point in the whole pipeline, so it must be loud, not silent.
- Every team abbreviation in the output exists in `TEAM_ABBR_MAP`'s value set (i.e., nothing slips through unnormalized).
- The script prints, per team-season, how many receivers and total targets fed into the `team_avg_separation` calculation — a team-season built from one receiver and 20 targets is a much weaker signal than one built from five receivers and 400 targets, and this should be visible in the script's output, not hidden inside a single aggregate number.

---

### 1.3 — `backend/scripts/03_build_features.py`

**Purpose.** Join the two prior outputs, compute the opponent-strength feature, and produce the final modeling table.

**Inputs.** `pbp_qb_season_raw.csv` (1.1), `support_metrics_standardized.csv` (1.2), and a re-read of the full play-by-play data (via `nfl_data_py.import_pbp_data`, same season range) to compute each QB's opponents' defensive EPA allowed.

**Outputs.** `backend/data/processed/qb_season.parquet`, one row per qualifying QB-season, exactly these columns and dtypes:

| Column | Type | Description |
|---|---|---|
| `qb_id` | string | nflverse GSIS ID |
| `qb_name` | string | display name |
| `team` | string | team abbreviation (nflverse convention) |
| `season` | int | season year |
| `epa_per_play` | float | raw outcome variable |
| `attempts` | int | pass attempts that season |
| `avg_separation` | float | yards, team-level targets-weighted average from NGS Receiving leaderboard (see 1.2 — not a per-QB stat) |
| `time_to_throw` | float | seconds, from NGS |
| `pass_block_win_rate` | float | 0–1, from ESPN, team-level |
| `opponent_def_epa` | float | mean defensive EPA/play allowed by this QB's opponents that season |

**Dependencies.** `pandas`, `pyarrow`, `nfl_data_py`.

**Acceptance criteria.**
- Output schema matches the table above exactly — column names, order, and dtypes (`pandas.testing.assert_frame_equal` against an empty frame with the target schema should pass on dtypes).
- Exactly one row per `(qb_id, season)` — no duplicates.
- Zero nulls in any column for any row in the output (a row with any missing feature is dropped and the count of dropped rows is printed, not silently included).
- The script prints final row count and season range covered.

---

### 1.4 — `backend/scripts/04_train_model.py`

**Purpose.** Fit the regression, compute the decomposition for every QB-season, validate the model, and persist coefficients.

**Inputs.** `qb_season.parquet` (1.3).

**Outputs.** Two files:
- `backend/data/artifacts/model_coefficients.json`: `{"intercept": float, "coefficients": {"avg_separation": float, "time_to_throw": float, "pass_block_win_rate": float, "opponent_def_epa": float}, "league_baseline": float, "feature_ranges": {"avg_separation": [p5, p95], "time_to_throw": [p5, p95], "pass_block_win_rate": [p5, p95], "opponent_def_epa": [p5, p95]}, "r_squared": float}`.
- `backend/data/processed/qb_season_scored.parquet`: same schema as `qb_season.parquet` plus `predicted_epa`, `support_component`, `qb_component`, `support_share` (formulas from Part 0).

**Dependencies.** `scikit-learn` (for `LinearRegression` or `Ridge`, selected by comparing 5-fold cross-validated R²), `numpy`, `pandas`.

**Acceptance criteria.**
- `r_squared` is computed on a held-out fold (not training-set R²) and printed to stdout along with the chosen model type (OLS vs. Ridge, whichever cross-validated better).
- Cross-validation folds are grouped by `qb_id` (e.g. `sklearn.model_selection.GroupKFold`), not randomly split by row — QB-seasons belonging to the same QB across different years are not independent observations, and a random row-level split lets one of a QB's seasons leak signal into the fold validating another of his seasons, inflating the reported R².
- A hardcoded sanity-check list of at least 5 QB-name pairs with well-known "elite QB on a bad team" vs. "average QB on a great team" reputations is checked programmatically: the script asserts that the first group's `qb_component` is greater than the second group's, and prints a clear pass/fail per pair. If any pair fails, the script still completes but prints a visible warning — this is a judgment check for the engineer, not a hard crash condition, since real data sometimes contradicts popular narrative.
- `support_component + qb_component + league_baseline` equals `epa_per_play` for every row, within 1e-6 floating-point tolerance (this is the additive identity from Part 0 and must be unit-tested, not just trusted).
- `feature_ranges` values are the 5th/95th percentile of each feature in the training data, not the raw min/max.

---

### 1.5 — `backend/scripts/05_export_artifacts.py`

**Purpose.** Convert the scored parquet table into the small JSON files the live backend actually reads at runtime, so the backend never needs pandas or scikit-learn loaded in production.

**Inputs.** `qb_season_scored.parquet` (1.4), `model_coefficients.json` (1.4, passed through unchanged).

**Outputs.**
- `backend/data/artifacts/leaderboard.json`: a JSON array, one object per QB-season: `{"qb_id", "qb_name", "team", "season", "epa_per_play", "qb_created_epa": <alias for qb_component>, "support_share", "attempts"}`.
- `backend/data/artifacts/qb_decomposition.json`: a JSON object keyed by the QB-season key (Part 0), each value: `{"qb_name", "team", "season", "league_baseline", "support_component", "qb_component", "epa_per_play", "predicted_epa", "raw_features": {"avg_separation", "time_to_throw", "pass_block_win_rate", "opponent_def_epa"}}`.

**Dependencies.** `pandas`, `json`.

**Acceptance criteria.**
- Every QB-season key present in `leaderboard.json` has a matching entry in `qb_decomposition.json` under the same key, and vice versa — no orphans in either direction.
- All floats are rounded per the Part 0 rounding convention before being written.
- Combined size of both files is under 5MB (a sanity check that nothing accidentally dumped raw play-level data into a season-level artifact).
- Files are valid JSON (the script itself round-trips them through `json.load` after writing, as a self-check, before exiting successfully).

---

## Part 2: Backend application components

### 2.1 — `backend/app/config.py`

**Purpose.** Single source of truth for file paths, the qualification threshold constant, and environment-driven settings, so nothing else in the backend hardcodes a path or a magic number.

**Inputs.** Environment variables `ALLOWED_ORIGIN` (the deployed Vercel frontend URL) and `PORT` (provided automatically by Render).

**Outputs.** A `Settings` object exposing: `ALLOWED_ORIGIN` (defaults to `"http://localhost:5173"` if unset), `MIN_QUALIFYING_ATTEMPTS = 200`, and absolute paths to each artifact file under `backend/data/artifacts/`.

**Dependencies.** `pydantic-settings` (or plain `os.environ.get` with defaults if avoiding the extra dependency — either is acceptable, but the defaults behavior below is required regardless of implementation).

**Acceptance criteria.**
- Running the app locally with no environment variables set never raises an error and CORS works against `localhost:5173`.
- Setting `ALLOWED_ORIGIN` in Render's dashboard changes the deployed CORS behavior with no code change and no redeploy beyond a restart.

---

### 2.2 — `backend/app/schemas.py`

**Purpose.** Define every request and response shape as a Pydantic model, so FastAPI validates and serializes every endpoint automatically and the OpenAPI docs are accurate without extra annotation work.

**Inputs.** None — this file only contains type definitions.

**Outputs.** Importable classes:
- `QBSummary`: `qb_id: str, qb_name: str, team: str, season: int, epa_per_play: float, qb_created_epa: float, support_share: float, attempts: int`.
- `QBDetail`: `qb_id: str, qb_name: str, team: str, season: int, league_baseline: float, support_component: float, qb_component: float, epa_per_play: float, predicted_epa: float, raw_features: dict[str, float], feature_ranges: dict[str, tuple[float, float]]`.
- `WhatIfRequest`: `qb_id: str, season: int, avg_separation: float, time_to_throw: float, pass_block_win_rate: float, opponent_def_epa: float`.
- `WhatIfResponse`: `predicted_epa: float, qb_component_counterfactual: float, support_component_counterfactual: float`.
- `MethodologyResponse`: `content: str, last_updated: str`.
- `HealthResponse`: `status: str`.

**Dependencies.** `pydantic` v2 (the version bundled with the installed FastAPI release).

**Acceptance criteria.**
- Every router function declares `response_model=` using one of these classes — no router returns a raw dict.
- Sending a `WhatIfRequest` missing a required field, or with a non-numeric value in a numeric field, returns HTTP 422 automatically with field-level error detail, with no custom error-handling code required to achieve this (this is the point of using Pydantic for the request body).

---

### 2.3 — `backend/app/services/data_store.py`

**Purpose.** Load all artifact files into memory exactly once at startup and expose simple accessor functions, so no router ever touches the filesystem directly and no artifact is re-parsed per request.

**Inputs.** File paths from `config.py`.

**Outputs.** Module-level functions: `get_leaderboard() -> list[QBSummary]`, `get_qb_detail(qb_id: str, season: int) -> QBDetail | None`, `get_seasons_for_qb(qb_id: str) -> list[int]`, `get_feature_ranges() -> dict[str, tuple[float, float]]`.

**Dependencies.** `json`, the schemas from 2.2, a module-level dict populated once on import (Python's import system already gives single-load-per-process behavior; no extra caching library is needed).

**Acceptance criteria.**
- All four artifact files (`leaderboard.json`, `qb_decomposition.json`, `model_coefficients.json`) are loaded and validated against their corresponding Pydantic schema at import time — if any file is missing or fails validation, the app fails to start with a clear traceback naming the missing/invalid file, rather than failing later on a specific request.
- `get_qb_detail` for an unknown `(qb_id, season)` pair returns `None` (not an exception) — the router, not this module, is responsible for turning that into an HTTP 404.
- Load time for all artifacts combined is under 2 seconds (measured locally; this matters because it adds to Render's cold-start time on every spin-up).

---

### 2.4 — `backend/app/services/inference.py`

**Purpose.** Provide a pure, dependency-light implementation of the trained linear model's prediction function, used by the what-if endpoint. Deliberately does not import scikit-learn, so the production server has one fewer heavy dependency and one fewer cold-start cost.

**Inputs.** `model_coefficients.json` (loaded once at import, via `data_store`), and at call time a dict of the four feature values.

**Outputs.** A function `predict(features: dict[str, float]) -> float` returning the predicted EPA, and a function `decompose(qb_id: str, season: int, features: dict[str, float]) -> WhatIfResponse` that calls `predict`, looks up the QB's actual `epa_per_play` and `league_baseline` via `data_store`, and returns the full counterfactual response.

**Dependencies.** None beyond the standard library (the prediction is a plain dot product: `intercept + sum(coef[k] * features[k] for k in coef)`).

**Acceptance criteria.**
- For any QB-season, calling `predict()` with that QB's actual recorded feature values reproduces the `predicted_epa` stored in `qb_decomposition.json` for that QB-season, within 1e-6 tolerance — this is a required unit test (`test_inference_roundtrip`), not just a manual spot check.
- `predict()` executes in under 5 milliseconds (it's a 4-term dot product; this should be trivially true, but is stated explicitly so no one accidentally introduces a dataframe load inside the hot path).

---

### 2.5 — `backend/app/main.py`

**Purpose.** Instantiate the FastAPI app, configure CORS, register all routers, and expose the ASGI app object that Uvicorn runs.

**Inputs.** `config.py` settings, the three router modules.

**Outputs.** A module-level `app = FastAPI(...)` object, with CORS middleware allowing only `settings.ALLOWED_ORIGIN` and `http://localhost:5173`, and all routers mounted under `/api`.

**Dependencies.** `fastapi`, `uvicorn`, `starlette.middleware.cors.CORSMiddleware`.

**Acceptance criteria.**
- `uvicorn app.main:app --reload` boots locally with no errors and no warnings about missing files.
- `GET /api/health` returns `{"status": "ok"}` with HTTP 200.
- Interactive API docs are reachable at `/docs` and list all five endpoints with their schemas correctly rendered (a direct visual check that 2.2's response models are wired correctly).

---

### 2.6 — `backend/app/routers/qbs.py`

**Purpose.** Implement the two read endpoints for QB data.

**Inputs/Outputs (endpoint contracts):**

| Method | Path | Response | Notes |
|---|---|---|---|
| GET | `/api/qbs` | `list[QBSummary]` | Full leaderboard, unsorted (frontend sorts client-side) |
| GET | `/api/qbs/{qb_id}/{season}` | `QBDetail` | 404 with `{"detail": "QB not found"}` if the pair doesn't exist |
| GET | `/api/qbs/{qb_id}` | `list[int]` (seasons) | Used by the frontend to build a season selector if a QB has multiple qualifying seasons |

**Dependencies.** `data_store.py` (2.3), `schemas.py` (2.2).

**Acceptance criteria.**
- `GET /api/qbs` returns an array whose length exactly equals the number of entries in `leaderboard.json`.
- `GET /api/qbs/{qb_id}/{season}` for a real pair returns a `QBDetail` whose `support_component + qb_component + league_baseline` equals `epa_per_play` within 1e-6 (re-verifying the Part 0 identity survives serialization).
- `GET /api/qbs/{unknown_id}/{season}` returns HTTP 404, not 500 or an empty 200.
- Every endpoint responds in under 100ms locally (purely in-memory lookups, no justification for anything slower).

---

### 2.7 — `backend/app/routers/whatif.py`

**Purpose.** Implement the live counterfactual prediction endpoint — the interactive centerpiece of the demo.

**Inputs/Outputs:** `POST /api/whatif`, body = `WhatIfRequest`, response = `WhatIfResponse`. Note: this finalizes and supersedes any earlier "three sliders" description — there are four user-controllable sliders, one per model feature (`avg_separation`, `time_to_throw`, `pass_block_win_rate`, `opponent_def_epa`), with no feature held back.

**Dependencies.** `inference.py` (2.4), `data_store.py` (2.3) for range validation, `schemas.py`.

**Acceptance criteria.**
- A request with any feature value outside that feature's `feature_ranges` (from `model_coefficients.json`) returns HTTP 422 with a message naming which field and what the valid range is — this validation happens in the router using FastAPI's `Field(ge=..., le=...)` constraints generated dynamically from `data_store.get_feature_ranges()` at app startup, not hardcoded numbers in the schema.
- Sending a QB's own actual recorded feature values (unmodified) returns a `predicted_epa` matching their stored `predicted_epa` within 1e-6 — a required round-trip test (`test_whatif_roundtrip`).
- Response time under 50ms.

---

### 2.8 — `backend/app/routers/methodology.py`

**Purpose.** Serve the plain-language methodology writeup as markdown so the frontend can render it without the backend needing any HTML-templating logic.

**Inputs/Outputs:** `GET /api/methodology` → `MethodologyResponse`, where `content` is the raw text of `docs/methodology.md`, read once at startup and cached in memory (same pattern as the other artifacts — see 2.3).

**Dependencies.** The file `docs/methodology.md` must exist (see Part 6.2) — if it's missing, the app fails to start, by the same rule as every other required artifact in 2.3.

**Acceptance criteria.**
- Response `content` is byte-identical to the file's contents at the time the server started (no transformation, no markdown parsing on the backend — that's the frontend's job).
- `last_updated` reflects the file's last-modified timestamp, formatted as an ISO 8601 string.

---

### 2.9 — `backend/tests/test_endpoints.py`

**Purpose.** Automated contract tests for every endpoint, runnable in under a few seconds with no external services.

**Inputs.** FastAPI's `TestClient` against the real `app` object (using the actual committed artifact files, not mocks — the whole point is to catch a broken artifact before it reaches Render).

**Outputs.** A pytest suite with, at minimum, these named test functions: `test_health_returns_200`, `test_qbs_list_nonempty`, `test_qb_detail_matches_decomposition_identity`, `test_qb_detail_404_for_unknown_id`, `test_whatif_roundtrip_matches_stored_value`, `test_whatif_rejects_out_of_range_value`, `test_inference_roundtrip` (from 2.4).

**Dependencies.** `pytest`, `httpx` (FastAPI's TestClient dependency).

**Acceptance criteria.**
- `pytest` run from `backend/` exits 0 with all of the above tests passing, using the actual production artifact files committed in the repo — this is the final gate before every deploy and should be run manually before each `git push` to `main` during the 7-day build, even without CI wired up.

---

## Part 3: Backend deployment components

### 3.1 — `backend/render.yaml` and `backend/Procfile`

**Purpose.** Declarative, zero-manual-configuration deploy definition for Render's free web service tier.

**Inputs.** None — static configuration.

**Outputs.**

`render.yaml`:
```yaml
services:
  - type: web
    name: qb-true-value-api
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ALLOWED_ORIGIN
        sync: false
```

`Procfile` (fallback, in case the deploy path doesn't pick up `render.yaml`):
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Dependencies.** A `requirements.txt` listing `fastapi`, `uvicorn`, `pydantic`, and nothing from the offline pipeline (no `pandas`, `scikit-learn`, or `nfl_data_py` — those only run locally; pulling them into the deploy image only slows the build and the cold start for no runtime benefit).

**Acceptance criteria.**
- A fresh Render "New Web Service" pointed at this repo's `backend/` directory deploys successfully with zero manual dashboard configuration other than setting the `ALLOWED_ORIGIN` value once.
- `requirements.txt` does not include any package not actually imported by `backend/app/` (verified by checking imports against the installed list before the first deploy).

---

### 3.2 — `.github/workflows/keep-alive.yml`

**Purpose.** Prevent Render's free-tier 15-minute spin-down from causing a cold-start delay for a judge who opens the live link asynchronously (no presenter, no controllable "warm it up now" moment — see the submission plan).

**Inputs.** A repository variable or hardcoded URL pointing at the deployed backend's `/api/health` endpoint.

**Outputs.**
```yaml
name: keep-alive
on:
  schedule:
    - cron: "*/10 * * * *"
jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://qb-true-value-api.onrender.com/api/health)
          if [ "$STATUS" != "200" ]; then
            echo "Health check failed with status $STATUS"
            exit 1
          fi
```

**Dependencies.** GitHub Actions (free for public repositories), `curl` (preinstalled on `ubuntu-latest` runners).

**Acceptance criteria.**
- After the backend is deployed and this workflow is merged, the Actions tab shows a successful run roughly every 10 minutes.
- If the backend goes down, the workflow run shows as failed (visible in the Actions tab and optionally emailed by GitHub's default notification settings) rather than silently passing — this is the early-warning mechanism for the entire async-judging risk.

---

## Part 4: Frontend components

### 4.1 — `frontend/src/lib/api.js`

**Purpose.** One place that knows how to talk to the backend; every component calls these functions instead of calling `fetch` directly.

**Inputs.** `import.meta.env.VITE_API_BASE_URL` (set per-environment: a local FastAPI URL in development, the deployed Render URL in production).

**Outputs.** Exported async functions: `getLeaderboard()`, `getQBDetail(qbId, season)`, `getQBSeasons(qbId)`, `postWhatIf(payload)`, `getMethodology()`. Each returns parsed JSON on success.

**Dependencies.** Native `fetch` — no `axios` needed at this scope.

**Acceptance criteria.**
- Every function throws an `Error` with the backend's `detail` message as the error text on any non-2xx response, so calling components can display the real reason for a failure instead of a generic "something went wrong."
- Switching `VITE_API_BASE_URL` between a local and deployed URL requires no code change anywhere in `src/` — only the environment variable.

---

### 4.2 — `frontend/src/components/NavBar.jsx`

**Purpose.** Persistent top navigation shared across all pages.

**Inputs (props).** None — reads the active route via `react-router-dom`'s `useLocation`.

**Outputs.** Three links: Home (`/`), Leaderboard (`/leaderboard`), Methodology (`/methodology`). The QB detail page is intentionally not a direct nav link — it's only reached by clicking a leaderboard row, which is the expected flow.

**Dependencies.** `react-router-dom`.

**Acceptance criteria.**
- The active route is visually distinguished (e.g. underline or accent color) and this is verified on each of the three linked pages individually.
- No layout shift occurs when navigating between pages (the nav bar's height and position are identical across all four routes).

---

### 4.3 — `frontend/src/pages/Landing.jsx`

**Purpose.** State the project's thesis in one sentence and immediately back it up with one real QB's decomposition, before any navigation is required.

**Inputs.** A hardcoded constant `FEATURED_QB = { qbId: "<chosen-id>", season: <chosen-year> }`, set once after the model is trained and a compelling example is identified during day 3–4 of the build. Fetches that one QB's detail via `getQBDetail()` on mount.

**Outputs.** Hero text, an embedded `DecompositionChart` (4.6) for the featured QB, and a call-to-action button linking to `/leaderboard`.

**Dependencies.** `lib/api.js`, `DecompositionChart`, `react-router-dom`'s `Link`.

**Acceptance criteria.**
- While the fetch is in flight, a loading skeleton is shown — never a blank white screen (this matters for the same reason as the backend cold-start mitigation: if Render is asleep, this page is the first thing a judge sees).
- If the fetch fails or doesn't resolve within 8 seconds, the page falls back to static placeholder copy describing the thesis in words, rather than spinning indefinitely.

---

### 4.4 — `frontend/src/pages/Leaderboard.jsx`

**Purpose.** Page-level container: fetch the full leaderboard once and hand it to the table component.

**Inputs.** None — fetches via `getLeaderboard()` on mount.

**Outputs.** Renders `LeaderboardTable` (4.5) with the fetched data, and a loading/error state following the same pattern as 4.3.

**Dependencies.** `lib/api.js`, `LeaderboardTable`.

**Acceptance criteria.** Same loading/error handling standard as 4.3 (skeleton while loading, no indefinite spinner, no blank screen on failure).

---

### 4.5 — `frontend/src/components/LeaderboardTable.jsx`

**Purpose.** Render the sortable leaderboard with an inline visual proxy for each QB's decomposition.

**Inputs (props).** `data: QBSummary[]`, `sortKey: "epa_per_play" | "qb_created_epa" | "support_share"`, `onSortChange: (key) => void`, `onRowClick: (qbId, season) => void`.

**Outputs.** A table where each row includes a small inline two-segment horizontal bar (plain CSS `width: %` divs, not a charting library — a full chart per row is unnecessary overhead for ~150–200 rows) representing the QB-created vs. support split, sized proportionally to `abs(qb_component)` and `abs(support_component)`. Clicking a row calls `onRowClick`, which the parent uses to navigate to `/qb/{qbId}/{season}`.

**Dependencies.** None beyond React and CSS — explicitly no charting library for this component, to keep re-sorting fast.

**Acceptance criteria.**
- Re-sorting by any of the three defined keys reorders rows client-side, with no re-fetch, in under 100ms with the full expected dataset size (~150–200 rows).
- The inline bar visually reads correctly even when `qb_component` is negative (the bar segment representing the QB's contribution shrinks toward zero or visually indicates "below replacement," but never renders with a negative CSS width, which is an invalid value — clip the bar's visual width to a minimum of 0 and rely on a color or label cue to indicate sign).

---

### 4.6 — `frontend/src/pages/QBDetail.jsx` and `frontend/src/components/DecompositionChart.jsx`

**Purpose.** Page: fetch one QB-season's full detail and hold the "currently displayed" values in state (defaulting to the real fetched values, overwritten live by the what-if panel). Component: render the three-part waterfall from whatever values it's given, regardless of whether they're the real ones or a counterfactual.

**Inputs (`QBDetail.jsx`).** Route params `qbId`, `season`. Fetches via `getQBDetail(qbId, season)` on mount.

**Inputs (`DecompositionChart.jsx` props — deliberately decoupled from fetching so it's independently testable).** `leagueBaseline: number, supportComponent: number, qbComponent: number, total: number`.

**Outputs.** A waterfall-style stacked bar (built with Recharts using a standard invisible-offset-segment technique) showing `leagueBaseline → +/- supportComponent → +/- qbComponent → total`, plus the embedded `WhatIfPanel` (4.7) below it.

**Dependencies.** `recharts`, `lib/api.js`.

**Acceptance criteria.**
- The chart renders correctly with `supportComponent` or `qbComponent` negative (the corresponding bar segment visually extends in the opposite direction without breaking the layout or overlapping the axis labels) — this must be checked with at least one real QB-season where each component is negative, not just the featured "clean" example.
- When `WhatIfPanel` reports a new counterfactual result, `QBDetail.jsx` updates the state it passes into `DecompositionChart` (not the chart re-fetching anything), and the chart re-renders within one animation frame of the new props arriving.

---

### 4.7 — `frontend/src/components/WhatIfPanel.jsx`

**Purpose.** The interactive centerpiece: four sliders, one per model feature, that recompute a live counterfactual prediction.

**Inputs (props).** `qbId: string, season: number, featureRanges: {avg_separation: [number, number], time_to_throw: [number, number], pass_block_win_rate: [number, number], opponent_def_epa: [number, number]}, initialValues: {same four keys, the QB's real recorded values}, onResult: (WhatIfResponse) => void`.

**Outputs.** Calls `onResult` with every new prediction. Internally debounces slider movement by 200ms before firing `postWhatIf()`, so dragging doesn't flood the backend with a request per pixel of movement.

**Dependencies.** `lib/api.js`, a small hand-written debounce function (no need for a library dependency for one function).

**Acceptance criteria.**
- Dragging any slider updates the displayed predicted EPA within roughly 300ms of release (debounce delay plus network round-trip).
- A visible "Reset to actual" button restores all four sliders to `initialValues` and fires one final `onResult` call using the QB's real recorded numbers.
- **Race condition guard, required:** each outgoing request is tagged with an incrementing sequence number; if a response arrives for a sequence number lower than the latest one already fired, it is discarded rather than passed to `onResult`. Without this, rapid slider dragging can let an older, slower response overwrite a newer one and show a stale prediction — this must be tested by manually dragging a slider rapidly back and forth and confirming the displayed value always matches the slider's final resting position.

---

### 4.8 — `frontend/src/pages/Methodology.jsx`

**Purpose.** Render the plain-language methodology content for a non-technical judge.

**Inputs.** Fetches via `getMethodology()` on mount.

**Outputs.** Rendered markdown (no raw `**` or `#` characters visible to the user).

**Dependencies.** `react-markdown`.

**Acceptance criteria.**
- Visual check: the rendered page shows formatted headings, bold, and lists correctly, not literal markdown syntax.
- On fetch failure, falls back to a plain-text error message rather than a blank page.

---

### 4.9 — `frontend/src/App.jsx`, `frontend/src/main.jsx`, and `frontend/vercel.json`

**Purpose.** App entry point, route definitions, and the deployment config that makes client-side routes survive a direct load or browser refresh on Vercel.

**Inputs.** None.

**Outputs (`App.jsx`).** Four `react-router-dom` routes: `/` → `Landing`, `/leaderboard` → `Leaderboard`, `/qb/:qbId/:season` → `QBDetail`, `/methodology` → `Methodology`.

**Outputs (`vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Dependencies.** `react-router-dom`, `react`, `react-dom`, all page components from above, the Vercel platform.

**Acceptance criteria.**
- Every route is reachable both by in-app navigation and by typing the URL directly into the browser and refreshing — specifically test a hard refresh on `/qb/<real-id>/<real-season>` on the deployed Vercel URL, not just in local dev (Vite's dev server handles this automatically, which is why this must be explicitly tested against the deployed build, where it commonly breaks without the rewrite rule above).

---

## Part 5: Documentation and ops components

### 5.1 — `README.md` (repo root)

**Purpose.** The first thing any judge or engineer reads; carries a meaningful share of the Data Presentation score given there's no video demo.

**Inputs.** Screenshots captured from the working deployed app (Part 5.2), the project description content, the run-locally script (5.3).

**Outputs.** A README whose first paragraph states the thesis in plain language (not setup instructions), followed by 2–3 embedded screenshots, then a "run locally" section, then the live links.

**Dependencies.** None beyond the finished, deployed app to screenshot.

**Acceptance criteria.** A reader who only reads the first paragraph and looks at the screenshots — never clicking a link or running any code — understands what the project does and what it found.

---

### 5.2 — `screenshots/`

**Purpose.** Visual proof of the working product inside the repo itself, independent of whether the live link is reachable at review time.

**Inputs.** The deployed, working frontend.

**Outputs.** At minimum three PNGs: the leaderboard page, a QB detail page showing the waterfall, and the what-if panel mid-drag with a visibly different counterfactual number than the QB's actual stat.

**Acceptance criteria.** Each image is referenced by an `![]()` tag in `README.md` and renders correctly when viewing the repo on GitHub's web UI (not just locally).

---

### 5.3 — `docs/methodology.md`

**Purpose.** The plain-language content served by `/api/methodology` (2.8) and rendered on the Methodology page (4.8) — written for someone who has never heard of EPA.

**Inputs.** None — this is hand-written prose, not generated from data.

**Outputs.** Markdown covering, in order: the problem in one sentence, what data was used and why those specific public sources, what the model does in plain language (no equations required, though the formula from Part 0 can be included as an aside), and one concrete, named finding.

**Acceptance criteria.** A non-technical reader (test this on someone who doesn't know what EPA stands for) can explain the project's main claim back in their own words after reading it once.
