"""
Pulls NFL play-by-play data and aggregates it to one row per QB-season of raw on-field stats.

Usage:
    python 01_ingest_pbp.py --start-season 2019 --end-season 2025
"""
import argparse
import sys
from pathlib import Path

import nfl_data_py as nfl
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings

OUTPUT_PATH = settings.PBP_QB_SEASON_RAW


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-season", type=int, required=True)
    parser.add_argument("--end-season", type=int, required=True)
    return parser.parse_args()


def build_qb_season_table(pbp: pd.DataFrame) -> pd.DataFrame:
    dropback = pbp[pbp["qb_dropback"] == 1].copy()

    # passer_player_id/name is null on scramble plays (recorded as a rush);
    # the QB is the rusher on those plays, so fall back to rusher_player_id/name.
    dropback["qb_id"] = dropback["passer_player_id"].fillna(dropback["rusher_player_id"])
    dropback["qb_name"] = dropback["passer_player_name"].fillna(dropback["rusher_player_name"])

    dropback = dropback.dropna(subset=["qb_id", "posteam", "season"])

    # team for a midseason-traded QB = the team he had the most pass attempts for that
    # season, decided before dedup so we never produce two rows for one (qb_id, season).
    attempts_by_team = (
        dropback[dropback["pass_attempt"] == 1]
        .groupby(["qb_id", "season", "posteam"])
        .size()
        .reset_index(name="team_attempts")
    )
    primary_team = (
        attempts_by_team.sort_values("team_attempts", ascending=False)
        .drop_duplicates(subset=["qb_id", "season"], keep="first")
        .rename(columns={"posteam": "team"})[["qb_id", "season", "team"]]
    )

    epa_per_play = (
        dropback.groupby(["qb_id", "season"])["epa"]
        .mean()
        .reset_index(name="epa_per_play")
    )

    pass_only = dropback[dropback["pass_attempt"] == 1]
    attempts = (
        pass_only.groupby(["qb_id", "season"])
        .size()
        .reset_index(name="attempts")
    )
    completions = (
        pass_only.groupby(["qb_id", "season"])["complete_pass"]
        .sum()
        .reset_index(name="completions")
    )
    sacks = (
        dropback[dropback["sack"] == 1]
        .groupby(["qb_id", "season"])
        .size()
        .reset_index(name="sacks")
    )

    qb_name = (
        dropback.groupby(["qb_id", "season"])["qb_name"]
        .agg(lambda s: s.value_counts().idxmax())
        .reset_index()
    )

    result = epa_per_play.merge(qb_name, on=["qb_id", "season"], how="left")
    result = result.merge(primary_team, on=["qb_id", "season"], how="left")
    result = result.merge(attempts, on=["qb_id", "season"], how="left")
    result = result.merge(completions, on=["qb_id", "season"], how="left")
    result = result.merge(sacks, on=["qb_id", "season"], how="left")

    result["attempts"] = result["attempts"].fillna(0)
    result["completions"] = result["completions"].fillna(0)
    result["sacks"] = result["sacks"].fillna(0)
    denom_attempts = result["attempts"].to_numpy(dtype=float)
    denom_attempts_sacks = denom_attempts + result["sacks"].to_numpy(dtype=float)
    result["completion_rate"] = np.where(
        denom_attempts > 0, result["completions"] / denom_attempts, np.nan
    )
    result["sack_rate"] = np.where(
        denom_attempts_sacks > 0, result["sacks"] / denom_attempts_sacks, np.nan
    )

    result = result[
        ["qb_id", "qb_name", "team", "season", "epa_per_play", "attempts", "completion_rate", "sack_rate"]
    ]
    result["season"] = result["season"].astype(int)
    result["attempts"] = result["attempts"].astype(int)

    return result


def validate(result: pd.DataFrame, start_season: int, end_season: int):
    dup_count = result.duplicated(subset=["qb_id", "season"]).sum()
    if dup_count:
        print(f"ERROR: {dup_count} duplicate (qb_id, season) rows found.")
        sys.exit(1)

    qualifying = result[result["attempts"] >= settings.MIN_QUALIFYING_ATTEMPTS]
    null_rows = qualifying[qualifying.isnull().any(axis=1)]
    if len(null_rows):
        print(f"ERROR: {len(null_rows)} qualifying rows have null values:")
        print(null_rows)
        sys.exit(1)

    for season in range(start_season, end_season + 1):
        season_qualifying = qualifying[qualifying["season"] == season]
        count = len(season_qualifying)
        if count < 25 or count > 40:
            print(
                f"WARNING: season {season} has {count} qualifying QB-seasons "
                f"(expected 25-40 starters)."
            )


def main():
    args = parse_args()
    years = list(range(args.start_season, args.end_season + 1))

    print(f"Pulling play-by-play data for {years}...")
    pbp = nfl.import_pbp_data(years, downcast=True)

    result = build_qb_season_table(pbp)
    validate(result, args.start_season, args.end_season)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT_PATH, index=False)

    print(f"Wrote {len(result)} QB-season rows to {OUTPUT_PATH}")
    qualifying_count = (result["attempts"] >= settings.MIN_QUALIFYING_ATTEMPTS).sum()
    print(f"{qualifying_count} rows qualify with attempts >= {settings.MIN_QUALIFYING_ATTEMPTS}")


if __name__ == "__main__":
    main()
