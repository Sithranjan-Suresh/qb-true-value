import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

MIN_QUALIFYING_ATTEMPTS = 200

RAW_DATA_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DATA_DIR = BASE_DIR / "data" / "processed"
ARTIFACTS_DIR = BASE_DIR / "data" / "artifacts"


class Settings:
    # Comma-separated list so prod + Vercel preview-deploy URLs can both be allowed
    # without a code change -- e.g. "https://qb-true-value.vercel.app,https://qb-true-value-git-foo.vercel.app"
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.environ.get("ALLOWED_ORIGIN", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    PORT = int(os.environ.get("PORT", 8000))
    MIN_QUALIFYING_ATTEMPTS = MIN_QUALIFYING_ATTEMPTS

    PBP_QB_SEASON_RAW = RAW_DATA_DIR / "pbp_qb_season_raw.csv"
    SUPPORT_METRICS_STANDARDIZED = RAW_DATA_DIR / "support_metrics_standardized.csv"
    QB_SEASON_PARQUET = PROCESSED_DATA_DIR / "qb_season.parquet"
    QB_SEASON_SCORED_PARQUET = PROCESSED_DATA_DIR / "qb_season_scored.parquet"
    MODEL_COEFFICIENTS_JSON = ARTIFACTS_DIR / "model_coefficients.json"
    LEADERBOARD_JSON = ARTIFACTS_DIR / "leaderboard.json"
    QB_DECOMPOSITION_JSON = ARTIFACTS_DIR / "qb_decomposition.json"


settings = Settings()
