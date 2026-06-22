"""
Converts the scored parquet table into the small JSON files the live backend
reads at runtime: leaderboard.json and qb_decomposition.json.

Usage:
    python 05_export_artifacts.py
"""
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings

FEATURES = ["avg_separation", "time_to_throw", "pass_block_win_rate", "opponent_def_epa"]


def round3(value) -> float:
    return round(float(value), 3)


def build_leaderboard(df: pd.DataFrame) -> list:
    leaderboard = []
    for row in df.itertuples():
        # qb_created_epa is derived the same way as qb_decomposition.json's
        # qb_component, so the two files never disagree on this number.
        epa_per_play_r = round3(row.epa_per_play)
        predicted_epa_r = round3(row.predicted_epa)
        qb_created_epa_r = round(epa_per_play_r - predicted_epa_r, 3)

        leaderboard.append(
            {
                "qb_id": row.qb_id,
                "qb_name": row.qb_name,
                "team": row.team,
                "season": int(row.season),
                "epa_per_play": epa_per_play_r,
                "qb_created_epa": qb_created_epa_r,
                "support_share": round3(row.support_share),
                "attempts": int(row.attempts),
            }
        )
    return leaderboard


def build_decomposition(df: pd.DataFrame) -> dict:
    decomposition = {}
    for row in df.itertuples():
        key = f"{row.qb_id}_{int(row.season)}"

        # Round league_baseline/epa_per_play/predicted_epa first, then *derive*
        # support_component and qb_component from those rounded numbers rather than
        # rounding each independently. Rounding all five terms separately can drift
        # the published identity (league_baseline + support + qb == epa_per_play) by
        # up to 0.001 -- observed on 55/250 rows -- which breaks the <1e-6 tolerance
        # spec 2.6 requires to survive serialization. Deriving the two components
        # from the already-rounded totals makes the identity hold by construction.
        league_baseline_r = round3(row.league_baseline)
        epa_per_play_r = round3(row.epa_per_play)
        predicted_epa_r = round3(row.predicted_epa)
        support_component_r = round(predicted_epa_r - league_baseline_r, 3)
        qb_component_r = round(epa_per_play_r - predicted_epa_r, 3)

        decomposition[key] = {
            "qb_name": row.qb_name,
            "team": row.team,
            "season": int(row.season),
            "league_baseline": league_baseline_r,
            "support_component": support_component_r,
            "qb_component": qb_component_r,
            "epa_per_play": epa_per_play_r,
            "predicted_epa": predicted_epa_r,
            "raw_features": {feat: round3(getattr(row, feat)) for feat in FEATURES},
        }
    return decomposition


def main():
    df = pd.read_parquet(settings.QB_SEASON_SCORED_PARQUET)

    with open(settings.MODEL_COEFFICIENTS_JSON) as f:
        model_coefficients = json.load(f)
    df["league_baseline"] = model_coefficients["league_baseline"]

    leaderboard = build_leaderboard(df)
    decomposition = build_decomposition(df)

    leaderboard_keys = {f"{e['qb_id']}_{e['season']}" for e in leaderboard}
    decomposition_keys = set(decomposition.keys())
    if leaderboard_keys != decomposition_keys:
        only_leaderboard = leaderboard_keys - decomposition_keys
        only_decomposition = decomposition_keys - leaderboard_keys
        print(f"ERROR: key mismatch between leaderboard and decomposition.")
        if only_leaderboard:
            print(f"  Only in leaderboard: {only_leaderboard}")
        if only_decomposition:
            print(f"  Only in decomposition: {only_decomposition}")
        sys.exit(1)

    settings.LEADERBOARD_JSON.parent.mkdir(parents=True, exist_ok=True)

    with open(settings.LEADERBOARD_JSON, "w") as f:
        json.dump(leaderboard, f, indent=2)
    with open(settings.QB_DECOMPOSITION_JSON, "w") as f:
        json.dump(decomposition, f, indent=2)

    # Round-trip self-check.
    with open(settings.LEADERBOARD_JSON) as f:
        json.load(f)
    with open(settings.QB_DECOMPOSITION_JSON) as f:
        json.load(f)

    total_size_mb = (
        settings.LEADERBOARD_JSON.stat().st_size + settings.QB_DECOMPOSITION_JSON.stat().st_size
    ) / (1024 * 1024)
    if total_size_mb > 5:
        print(f"ERROR: combined artifact size {total_size_mb:.2f}MB exceeds the 5MB limit.")
        sys.exit(1)

    print(f"Wrote {len(leaderboard)} entries to {settings.LEADERBOARD_JSON}")
    print(f"Wrote {len(decomposition)} entries to {settings.QB_DECOMPOSITION_JSON}")
    print(f"Combined size: {total_size_mb:.3f}MB")
    print("Both files round-trip through json.load successfully.")


if __name__ == "__main__":
    main()
