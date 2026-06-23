"""
Joins the prior two outputs, computes opponent-strength, fits the step-1
expected-EPA gradient boosting model on play-level game-state data, and produces
the final modeling table: backend/data/processed/qb_season.parquet.

Usage:
    python 03_build_features.py --start-season 2019 --end-season 2025
"""
import argparse
import re
import sys
from pathlib import Path

import joblib
import nfl_data_py as nfl
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold, cross_val_predict, cross_val_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import ARTIFACTS_DIR, settings

NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}

# Step 1 of the two-step model: pure game-state features, no QB identity and no
# support features, so this model can only ever learn "how hard was the situation,"
# never "how good is the QB" -- that separation is the entire point.
GBM_FEATURES = [
    "down", "ydstogo", "yardline_100", "score_differential",
    "wp", "half_seconds_remaining", "roof_code", "temp", "wind",
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-season", type=int, required=True)
    parser.add_argument("--end-season", type=int, required=True)
    return parser.parse_args()


def normalize_name_key(name: str) -> str:
    """Canonical 'f.lastname' key so 'Patrick Mahomes' and 'P.Mahomes' compare equal."""
    if not isinstance(name, str) or not name.strip():
        return ""
    cleaned = name.replace(".", " ").replace("'", "")
    parts = [p for p in re.split(r"\s+", cleaned.strip()) if p]
    parts = [p for p in parts if p.lower().strip(".") not in NAME_SUFFIXES]
    if len(parts) < 2:
        return cleaned.lower()
    return f"{parts[0][0].lower()}.{parts[-1].lower()}"


def compute_opponent_def_epa(pbp: pd.DataFrame, qb_team_season: pd.DataFrame) -> pd.DataFrame:
    """Mean defensive EPA/play allowed by each QB's opponents that season.

    Computed game-by-game (so a team faced twice counts twice, matching the
    actual schedule strength a QB faced), not as a flat per-opponent average.
    """
    scrimmage = pbp[(pbp["pass_attempt"] == 1) | (pbp["rush_attempt"] == 1)].copy()

    team_def_epa = (
        scrimmage.groupby(["defteam", "season"])["epa"]
        .mean()
        .reset_index(name="team_def_epa")
        .rename(columns={"defteam": "team"})
    )

    games = scrimmage.dropna(subset=["posteam", "defteam"])[
        ["season", "game_id", "posteam", "defteam"]
    ].drop_duplicates()
    games = games.rename(columns={"posteam": "team", "defteam": "opponent"})

    qb_games = qb_team_season.merge(games, on=["team", "season"], how="inner")
    qb_games = qb_games.merge(
        team_def_epa.rename(columns={"team": "opponent"}), on=["opponent", "season"], how="left"
    )

    opponent_def_epa = (
        qb_games.groupby(["qb_id", "season"])["team_def_epa"]
        .mean()
        .reset_index(name="opponent_def_epa")
    )
    return opponent_def_epa


def fit_expected_epa_model(pbp: pd.DataFrame) -> pd.DataFrame:
    """Step 1 of the two-step model.

    Fits a gradient boosting model on pure game-state features (down, distance,
    field position, score state, win probability, time remaining, roof, weather)
    to predict per-play EPA -- i.e. "what would any league-average QB be expected
    to produce in this exact situation." Returns one row per (qb_id, season) with
    mean_expected_epa: the average of that QB's plays' expected EPA, using
    out-of-fold predictions (grouped by game) so a QB's residual is never computed
    against a model that saw that QB's own games during training.
    """
    dropback = pbp[pbp["qb_dropback"] == 1].copy()
    # Same qb_id fallback as 01_ingest_pbp.py (scrambles are recorded as rushes).
    dropback["qb_id"] = dropback["passer_player_id"].fillna(dropback["rusher_player_id"])
    dropback = dropback.dropna(subset=["qb_id", "posteam", "season", "epa"])

    # roof is a small set of string categories (outdoors/dome/closed/open, plus
    # occasional missing values in older seasons) -- ordinal-coded for the GBM,
    # which only needs a consistent split key, not a meaningful ordering.
    dropback["roof_code"] = dropback["roof"].astype("category").cat.codes.replace(-1, np.nan)

    X = dropback[GBM_FEATURES]
    y = dropback["epa"].to_numpy()
    groups = dropback["game_id"].to_numpy()

    model = HistGradientBoostingRegressor(random_state=0)

    cv = GroupKFold(n_splits=5)
    cv_r2 = cross_val_score(model, X, y, cv=cv, groups=groups, scoring="r2").mean()
    print(f"Step 1 GBM (expected EPA from game state) cross-validated R^2: {cv_r2:.4f}")

    # Out-of-fold predictions, so each play's "expected EPA" never came from a model
    # that trained on that play's own game -- otherwise residuals would be biased
    # toward zero and qb_created_epa would look artificially small everywhere.
    dropback["expected_epa"] = cross_val_predict(model, X, y, cv=cv, groups=groups)

    # Final model, fit on all available data, saved purely for reproducibility /
    # methodology transparency -- the live API never loads this. The what-if
    # endpoint only ever varies the 4 support features (step 2's OLS inputs), never
    # a QB's actual historical down/distance/score-state, so a QB-season's
    # situational baseline is fixed history, not something a slider can move; the
    # live API only needs that one already-baked number (folded into predicted_epa
    # below), never the GBM itself. Loading sklearn into the production deploy just
    # to hold an object whose .predict() is never called at request time would be
    # pure deploy bloat.
    model.fit(X, y)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, ARTIFACTS_DIR / "expected_epa_model.joblib")
    print(f"Wrote {ARTIFACTS_DIR / 'expected_epa_model.joblib'}")

    mean_expected_epa = (
        dropback.groupby(["qb_id", "season"])["expected_epa"]
        .mean()
        .reset_index(name="mean_expected_epa")
    )
    return mean_expected_epa


def main():
    args = parse_args()
    years = list(range(args.start_season, args.end_season + 1))

    pbp_qb_season = pd.read_csv(settings.PBP_QB_SEASON_RAW)
    support = pd.read_csv(settings.SUPPORT_METRICS_STANDARDIZED)

    qualifying = pbp_qb_season[pbp_qb_season["attempts"] >= settings.MIN_QUALIFYING_ATTEMPTS].copy()

    qualifying["name_key"] = qualifying["qb_name"].apply(normalize_name_key)
    support["name_key"] = support["qb_name"].apply(normalize_name_key)

    # avg_separation and pass_block_win_rate are team-level; time_to_throw is QB-level,
    # so it joins on name_key + team + season while the team-level features join on
    # team + season alone (avoids dropping a row just because a QB's NGS name row
    # mismatched team due to a midseason trade).
    qb_level = support[["name_key", "team", "season", "time_to_throw"]]
    team_level = support[["team", "season", "avg_separation", "pass_block_win_rate"]].drop_duplicates(
        subset=["team", "season"]
    )

    merged = qualifying.merge(qb_level, on=["name_key", "team", "season"], how="left")
    merged = merged.merge(team_level, on=["team", "season"], how="left")

    print(f"Pulling play-by-play data for {years} to compute opponent_def_epa and the step-1 model...")
    pbp = nfl.import_pbp_data(years, downcast=True)

    qb_team_season = merged[["qb_id", "team", "season"]].drop_duplicates()
    opponent_def_epa = compute_opponent_def_epa(pbp, qb_team_season)
    merged = merged.merge(opponent_def_epa, on=["qb_id", "season"], how="left")

    mean_expected_epa = fit_expected_epa_model(pbp)
    merged = merged.merge(mean_expected_epa, on=["qb_id", "season"], how="left")

    result = merged[
        [
            "qb_id", "qb_name", "team", "season", "epa_per_play", "attempts",
            "avg_separation", "time_to_throw", "pass_block_win_rate", "opponent_def_epa",
            "mean_expected_epa",
        ]
    ].copy()

    before = len(result)
    result = result.dropna()
    dropped = before - len(result)
    if dropped:
        print(f"Dropped {dropped} rows with a missing feature.")

    dup_count = result.duplicated(subset=["qb_id", "season"]).sum()
    if dup_count:
        print(f"ERROR: {dup_count} duplicate (qb_id, season) rows found.")
        sys.exit(1)

    result["season"] = result["season"].astype(int)
    result["attempts"] = result["attempts"].astype(int)
    for col in [
        "epa_per_play", "avg_separation", "time_to_throw", "pass_block_win_rate",
        "opponent_def_epa", "mean_expected_epa",
    ]:
        result[col] = result[col].astype(float)

    settings.QB_SEASON_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    result.to_parquet(settings.QB_SEASON_PARQUET, index=False)

    print(f"\nWrote {len(result)} rows to {settings.QB_SEASON_PARQUET}")
    print(f"Season range covered: {result['season'].min()}-{result['season'].max()}")


if __name__ == "__main__":
    main()
