"""
Standardizes three hand-collected public data sources (NGS Passing, NGS Receiving,
ESPN Pass Block Win Rate) into one joinable team/QB-season table.

Usage:
    python 02_ingest_support_metrics.py
"""
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings, RAW_DATA_DIR

RAW_DIR = RAW_DATA_DIR
NGS_PASSING_PATH = RAW_DIR / "ngs_passing_raw.xlsx"
NGS_RECEIVING_PATH = RAW_DIR / "ngs_receiving_raw.xlsx"
ESPN_PBWR_PATH = RAW_DIR / "espn_pbwr_raw.xlsx"
OUTPUT_PATH = settings.SUPPORT_METRICS_STANDARDIZED

# Rows that show up in the NGS leaderboards but aren't real teams (Pro Bowl squads).
NON_TEAM_ROWS = {"AFC", "NFC"}

# Handles two distinct normalization problems: short-code quirks (AZ/ARI, LAR/LA)
# and full team name -> abbreviation (including Oakland/Washington's old names).
TEAM_ABBR_MAP = {
    # short-code quirks
    "AZ": "ARI", "ARI": "ARI",
    "LAR": "LA", "LA": "LA",
    "LAC": "LAC", "LV": "LV", "OAK": "LV",
    "WAS": "WAS", "WSH": "WAS",
    "ATL": "ATL", "BAL": "BAL", "BUF": "BUF", "CAR": "CAR", "CHI": "CHI",
    "CIN": "CIN", "CLE": "CLE", "DAL": "DAL", "DEN": "DEN", "DET": "DET",
    "GB": "GB", "HOU": "HOU", "IND": "IND", "JAX": "JAX", "KC": "KC",
    "MIA": "MIA", "MIN": "MIN", "NE": "NE", "NO": "NO", "NYG": "NYG",
    "NYJ": "NYJ", "PHI": "PHI", "PIT": "PIT", "SEA": "SEA", "SF": "SF",
    "TB": "TB", "TEN": "TEN",
    # full team names (ESPN's older sheets)
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Oakland Raiders": "LV",
    "Los Angeles Chargers": "LAC", "Los Angeles Rams": "LA", "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN", "New England Patriots": "NE", "New Orleans Saints": "NO",
    "New York Giants": "NYG", "New York Jets": "NYJ", "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT", "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB", "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS", "Washington Football Team": "WAS",
    "Washington Redskins": "WAS",
}

NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}


def normalize_team(series: pd.Series, source_name: str) -> pd.Series:
    mapped = series.map(TEAM_ABBR_MAP)
    unmapped = series[mapped.isna()]
    if len(unmapped):
        print(f"ERROR: unrecognized team value(s) in {source_name}: {sorted(unmapped.unique())}")
        sys.exit(1)
    return mapped


def normalize_name_key(name: str) -> str:
    """Canonical 'f.lastname' key so 'Patrick Mahomes' and 'P.Mahomes' compare equal."""
    if not isinstance(name, str) or not name.strip():
        return ""
    cleaned = name.replace(".", " ").replace("'", "")
    parts = [p for p in re.split(r"\s+", cleaned.strip()) if p]
    parts = [p for p in parts if p.lower().strip(".") not in NAME_SUFFIXES]
    if len(parts) < 2:
        return cleaned.lower()
    first_initial = parts[0][0].lower()
    last_name = parts[-1].lower()
    return f"{first_initial}.{last_name}"


def load_ngs_passing() -> pd.DataFrame:
    sheets = pd.read_excel(NGS_PASSING_PATH, sheet_name=None)
    df = pd.concat(sheets.values(), ignore_index=True)
    df.columns = [c.strip() for c in df.columns]
    df = df.dropna(subset=["PLAYER NAME", "TEAM", "Year", "TT"])
    df = df[~df["TEAM"].isin(NON_TEAM_ROWS)]
    df = df[["PLAYER NAME", "TEAM", "Year", "TT"]].rename(
        columns={"PLAYER NAME": "qb_name", "TEAM": "team", "Year": "season", "TT": "time_to_throw"}
    )
    df["team"] = normalize_team(df["team"], "ngs_passing_raw.xlsx")
    df["season"] = df["season"].astype(int)
    return df


def load_ngs_receiving_team_separation() -> pd.DataFrame:
    sheets = pd.read_excel(NGS_RECEIVING_PATH, sheet_name=None)
    df = pd.concat(sheets.values(), ignore_index=True)
    df.columns = [c.strip() for c in df.columns]
    df = df[~df["TEAM"].isin(NON_TEAM_ROWS)]
    df = df[df["POS"].isin(["WR", "TE"])]
    df = df[["TEAM", "YEAR", "SEP", "TAR"]].rename(columns={"TEAM": "team", "YEAR": "season"})
    df["team"] = normalize_team(df["team"], "ngs_receiving_raw.xlsx")
    df["season"] = df["season"].astype(int)

    diagnostics = (
        df.groupby(["team", "season"])
        .agg(receiver_count=("SEP", "size"), total_targets=("TAR", "sum"))
        .reset_index()
    )
    print("\nTeam-season avg_separation diagnostics (receivers, total targets):")
    for _, row in diagnostics.sort_values(["season", "team"]).iterrows():
        print(f"  {row['team']} {int(row['season'])}: {int(row['receiver_count'])} receivers, {int(row['total_targets'])} targets")

    weighted = (
        df.groupby(["team", "season"])
        .apply(lambda g: (g["SEP"] * g["TAR"]).sum() / g["TAR"].sum())
        .reset_index(name="avg_separation")
    )
    return weighted


def parse_pbwr_value(value) -> float:
    if isinstance(value, str):
        match = re.match(r"\s*([\d.]+)%", value)
        if not match:
            print(f"ERROR: could not parse Pass Block Win Rate value: {value!r}")
            sys.exit(1)
        return float(match.group(1)) / 100.0
    return float(value)


def load_espn_pbwr() -> pd.DataFrame:
    sheets = pd.read_excel(ESPN_PBWR_PATH, sheet_name=None)
    frames = []
    for sheet_name, sheet_df in sheets.items():
        sheet_df = sheet_df.copy()
        sheet_df.columns = [str(c).strip().lower() for c in sheet_df.columns]
        sheet_df = sheet_df[~sheet_df["team"].isin(NON_TEAM_ROWS)]
        sheet_df = sheet_df[["year", "team", "pass block win rate"]].rename(
            columns={"year": "season", "pass block win rate": "pass_block_win_rate"}
        )
        sheet_df["pass_block_win_rate"] = sheet_df["pass_block_win_rate"].apply(parse_pbwr_value)
        frames.append(sheet_df)
    df = pd.concat(frames, ignore_index=True)
    df["team"] = normalize_team(df["team"], "espn_pbwr_raw.xlsx")
    df["season"] = df["season"].astype(int)
    return df


def main():
    ngs_passing = load_ngs_passing()
    team_separation = load_ngs_receiving_team_separation()
    espn_pbwr = load_espn_pbwr()

    # 2018 is excluded league-wide: ESPN Pass Block Win Rate isn't published for that
    # season, so any 2018 row would have a permanently null pass_block_win_rate.
    ngs_passing = ngs_passing[ngs_passing["season"] >= 2019]

    standardized = ngs_passing.merge(team_separation, on=["team", "season"], how="left")
    standardized = standardized.merge(espn_pbwr, on=["team", "season"], how="left")
    standardized = standardized[
        ["team", "season", "qb_name", "avg_separation", "time_to_throw", "pass_block_win_rate"]
    ]

    for col in ["avg_separation", "time_to_throw", "pass_block_win_rate"]:
        if standardized[col].isna().any():
            missing = standardized[standardized[col].isna()][["team", "season"]].drop_duplicates()
            print(f"ERROR: {len(missing)} team-season rows missing '{col}' after merge:")
            print(missing.to_string(index=False))
            sys.exit(1)

    bad_teams = set(standardized["team"].unique()) - set(TEAM_ABBR_MAP.values())
    if bad_teams:
        print(f"ERROR: output contains unnormalized team values: {bad_teams}")
        sys.exit(1)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    standardized.to_csv(OUTPUT_PATH, index=False)
    print(f"\nWrote {len(standardized)} rows to {OUTPUT_PATH}")

    check_join_coverage(standardized)


def check_join_coverage(standardized: pd.DataFrame):
    pbp = pd.read_csv(settings.PBP_QB_SEASON_RAW)
    qualifying = pbp[pbp["attempts"] >= settings.MIN_QUALIFYING_ATTEMPTS].copy()
    qualifying["name_key"] = qualifying["qb_name"].apply(normalize_name_key)

    standardized = standardized.copy()
    standardized["name_key"] = standardized["qb_name"].apply(normalize_name_key)
    standardized_keys = set(
        zip(standardized["name_key"], standardized["team"], standardized["season"])
    )

    qualifying["matched"] = qualifying.apply(
        lambda r: (r["name_key"], r["team"], r["season"]) in standardized_keys, axis=1
    )
    coverage = qualifying["matched"].mean() * 100
    print(f"\nJoin coverage against qualifying QB-seasons: {coverage:.1f}% ({qualifying['matched'].sum()}/{len(qualifying)})")

    if coverage < 95:
        unmatched = qualifying[~qualifying["matched"]][["qb_name", "team", "season"]]
        print("ERROR: join coverage below 95%. Unmatched rows:")
        print(unmatched.to_string(index=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
