"""
Fits the regression, computes the decomposition for every QB-season, validates
the model, and persists coefficients.

Usage:
    python 04_train_model.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression, Ridge
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


def fit_and_select_model(X: np.ndarray, y: np.ndarray, groups: np.ndarray):
    cv = GroupKFold(n_splits=5)
    ols_scores = cross_val_score(LinearRegression(), X, y, cv=cv, groups=groups, scoring="r2")
    ridge_scores = cross_val_score(Ridge(alpha=1.0), X, y, cv=cv, groups=groups, scoring="r2")

    ols_r2 = ols_scores.mean()
    ridge_r2 = ridge_scores.mean()

    if ridge_r2 > ols_r2:
        model_type, cv_r2 = "Ridge", ridge_r2
        model = Ridge(alpha=1.0)
    else:
        model_type, cv_r2 = "OLS", ols_r2
        model = LinearRegression()

    model.fit(X, y)
    print(f"OLS cross-validated R^2:   {ols_r2:.4f}")
    print(f"Ridge cross-validated R^2: {ridge_r2:.4f}")
    print(f"Selected model: {model_type} (cv R^2 = {cv_r2:.4f})")
    return model, model_type, cv_r2


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

    X = df[FEATURES].to_numpy()
    y = df["epa_per_play"].to_numpy()
    groups = df["qb_id"].to_numpy()

    model, model_type, cv_r2 = fit_and_select_model(X, y, groups)

    league_baseline = float(df["epa_per_play"].mean())

    df["predicted_epa"] = model.predict(X)
    df["support_component"] = df["predicted_epa"] - league_baseline
    df["qb_component"] = df["epa_per_play"] - df["predicted_epa"]
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

    feature_ranges = {
        feat: [float(np.percentile(df[feat], 5)), float(np.percentile(df[feat], 95))]
        for feat in FEATURES
    }

    coefficients = {feat: float(coef) for feat, coef in zip(FEATURES, model.coef_)}
    model_coefficients = {
        "intercept": round(float(model.intercept_), 3),
        "coefficients": {k: round(v, 3) for k, v in coefficients.items()},
        "league_baseline": round(league_baseline, 3),
        "feature_ranges": {k: [round(v[0], 3), round(v[1], 3)] for k, v in feature_ranges.items()},
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
