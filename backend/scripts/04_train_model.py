"""
Step 2 of the two-step model: regresses each QB-season's residual (actual EPA minus
the step-1 GBM's situation-only expected EPA, computed in 03_build_features.py)
against the 4 support features using OLS. Computes the decomposition for every
QB-season, validates the model, and persists coefficients.

Usage:
    python 04_train_model.py
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupKFold, cross_val_score

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings, ARTIFACTS_DIR

FEATURES = ["avg_separation", "time_to_throw", "pass_block_win_rate", "opponent_def_epa"]

# "Elite QB carrying a mediocre situation" vs "QB elevated by an unusually strong
# situation" — well-known reputations within the 2019-2025 window. Averaged across
# each QB's qualifying seasons in the dataset, not a single matched season.
SANITY_PAIRS = [
    ("R.Wilson", "K.Cousins"),
    ("L.Jackson", "M.Trubisky"),
    ("P.Mahomes", "D.Carr"),
    ("J.Allen", "J.Goff"),
    ("J.Burrow", "R.Tannehill"),
]


def fit_ols(X: np.ndarray, y: np.ndarray, groups: np.ndarray):
    cv = GroupKFold(n_splits=5)
    cv_r2 = cross_val_score(LinearRegression(), X, y, cv=cv, groups=groups, scoring="r2").mean()
    model = LinearRegression()
    model.fit(X, y)
    print(f"Step 2 OLS (residual ~ support features) cross-validated R^2: {cv_r2:.4f}")
    return model, cv_r2


def run_sanity_checks(scored: pd.DataFrame):
    print("\nSanity checks (elite QB vs system-elevated QB, avg qb_component):")
    all_passed = True
    for elite_key, system_key in SANITY_PAIRS:
        elite_mean = scored[scored["qb_name"] == elite_key]["qb_component"].mean()
        system_mean = scored[scored["qb_name"] == system_key]["qb_component"].mean()
        if pd.isna(elite_mean) or pd.isna(system_mean):
            print(f"  SKIP: {elite_key} vs {system_key} (missing data for one or both)")
            continue
        passed = elite_mean > system_mean
        all_passed = all_passed and passed
        status = "PASS" if passed else "FAIL"
        print(f"  {status}: {elite_key} ({elite_mean:+.4f}) vs {system_key} ({system_mean:+.4f})")
    if not all_passed:
        print("WARNING: one or more sanity-check pairs contradicted the expected narrative.")


def main():
    df = pd.read_parquet(settings.QB_SEASON_PARQUET)

    # Step 2's regression target is the residual left over after step 1's GBM
    # already explained away pure game-state difficulty -- NOT raw epa_per_play.
    # mean_expected_epa (from 03_build_features.py's fit_expected_epa_model) is
    # season-specific (it depends on the exact down/distance/score-state/weather
    # situations this QB's plays happened to be in), so qb_residual_epa already has
    # situational difficulty stripped out before the 4 support features ever see it.
    df["qb_residual_epa"] = df["epa_per_play"] - df["mean_expected_epa"]

    X = df[FEATURES].to_numpy()
    y = df["qb_residual_epa"].to_numpy()
    groups = df["qb_id"].to_numpy()

    model, cv_r2 = fit_ols(X, y, groups)

    # Round the coefficients/intercept/baseline to the Part 0 3-decimal convention
    # *before* computing predicted_epa, not after — model_coefficients.json only ever
    # stores the rounded numbers, and inference.py's predict() only ever has those
    # rounded numbers to work with. Deriving predicted_epa from the full-precision
    # sklearn model and only rounding for display would make the live what-if
    # endpoint permanently unable to reproduce these stored values (the
    # test_inference_roundtrip / test_whatif_roundtrip 1e-6 tolerance in 2.4/2.9
    # would be unsatisfiable). Rounding first keeps every artifact self-consistent
    # with what actually gets served.
    intercept = round(float(model.intercept_), 3)
    coefficients = {feat: round(float(coef), 3) for feat, coef in zip(FEATURES, model.coef_)}

    # league_baseline stays a SINGLE global constant (every page in the frontend
    # fetches it once and reuses it for every row via the additive identity, per
    # Part 0) -- it's the dataset-wide average of each QB-season's own situational
    # baseline (mean_expected_epa), analogous to how it used to be the dataset-wide
    # average of epa_per_play directly. A QB-season's OWN situational baseline can
    # (and does) differ from this constant -- that gap is folded into
    # support_component below, not into league_baseline, so "support" now means
    # everything outside the QB's own residual control: both the explicit 4 support
    # features AND how much harder/easier his actual situations were than average.
    league_baseline = round(float(df["mean_expected_epa"].mean()), 3)

    df["ols_support_prediction"] = intercept + sum(coefficients[feat] * df[feat] for feat in FEATURES)
    df["predicted_epa"] = df["mean_expected_epa"] + df["ols_support_prediction"]
    df["support_component"] = df["predicted_epa"] - league_baseline
    df["qb_component"] = df["qb_residual_epa"] - df["ols_support_prediction"]
    df["support_share"] = (
        df["support_component"].abs()
        / (df["support_component"].abs() + df["qb_component"].abs() + 1e-9)
    ).round(3).clip(0, 1)

    identity_check = (
        league_baseline + df["support_component"] + df["qb_component"] - df["epa_per_play"]
    ).abs()
    if (identity_check > 1e-6).any():
        print("ERROR: additive identity violated for some rows.")
        sys.exit(1)
    print(f"\nAdditive identity holds for all {len(df)} rows (max deviation {identity_check.max():.2e}).")

    run_sanity_checks(df)

    # Base range is the 5th/95th percentile (Part 0), widened just enough to also
    # cover every qualifying QB-season's own actual value. Without this, a QB whose
    # own stat is itself an outlier (e.g. Mahomes' avg_separation) would 422 on the
    # what-if endpoint when sent their own real recorded values, breaking "reset to
    # actual" and the required whatif round-trip test.
    feature_ranges = {
        feat: [
            math.floor(min(np.percentile(df[feat], 5), df[feat].min()) * 1000) / 1000,
            math.ceil(max(np.percentile(df[feat], 95), df[feat].max()) * 1000) / 1000,
        ]
        for feat in FEATURES
    }

    model_coefficients = {
        "model": "two_step_gbm_ols",
        "intercept": intercept,
        "coefficients": coefficients,
        "league_baseline": league_baseline,
        "feature_ranges": {k: [round(v[0], 3), round(v[1], 3)] for k, v in feature_ranges.items()},
        # Step 2 OLS's own cross-validated R^2, predicting the residual (not raw
        # epa_per_play) from the 4 support features -- kept under the original key
        # since nothing downstream reads model_coefficients.json for this value, it's
        # informational only.
        "r_squared": round(float(cv_r2), 3),
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(settings.MODEL_COEFFICIENTS_JSON, "w") as f:
        json.dump(model_coefficients, f, indent=2)
    print(f"\nWrote {settings.MODEL_COEFFICIENTS_JSON}")

    settings.QB_SEASON_SCORED_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(settings.QB_SEASON_SCORED_PARQUET, index=False)
    print(f"Wrote {settings.QB_SEASON_SCORED_PARQUET}")


if __name__ == "__main__":
    main()
