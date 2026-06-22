import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.config import settings
from app.schemas import QBDetail, QBSummary


def _load_json(path: Path):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError as exc:
        raise RuntimeError(f"Required artifact file is missing: {path}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Required artifact file is not valid JSON: {path}") from exc


def _load_leaderboard() -> list[QBSummary]:
    raw = _load_json(settings.LEADERBOARD_JSON)
    try:
        return [QBSummary(**entry) for entry in raw]
    except Exception as exc:
        raise RuntimeError(f"{settings.LEADERBOARD_JSON} failed QBSummary validation: {exc}") from exc


def _load_decomposition() -> dict:
    return _load_json(settings.QB_DECOMPOSITION_JSON)


def _load_model_coefficients() -> dict:
    return _load_json(settings.MODEL_COEFFICIENTS_JSON)


_LEADERBOARD: list[QBSummary] = _load_leaderboard()
_DECOMPOSITION: dict = _load_decomposition()
_MODEL_COEFFICIENTS: dict = _load_model_coefficients()
_FEATURE_RANGES: dict[str, tuple[float, float]] = {
    k: tuple(v) for k, v in _MODEL_COEFFICIENTS["feature_ranges"].items()
}

# Build a (qb_id, season) -> detail dict index once, parsing qb_id back out of each
# "{qb_id}_{season}" key (qb_id itself may contain hyphens, e.g. "00-0033873", so the
# season is split off from the end rather than the key being split on "_").
_DETAIL_BY_QB_SEASON: dict[tuple[str, int], dict] = {}
_SEASONS_BY_QB_ID: dict[str, list[int]] = {}
for key, entry in _DECOMPOSITION.items():
    season = entry["season"]
    qb_id = key[: -len(f"_{season}")]
    _DETAIL_BY_QB_SEASON[(qb_id, season)] = entry
    _SEASONS_BY_QB_ID.setdefault(qb_id, []).append(season)

for qb_id in _SEASONS_BY_QB_ID:
    _SEASONS_BY_QB_ID[qb_id].sort()


def get_leaderboard() -> list[QBSummary]:
    return _LEADERBOARD


def get_qb_detail(qb_id: str, season: int) -> QBDetail | None:
    entry = _DETAIL_BY_QB_SEASON.get((qb_id, season))
    if entry is None:
        return None
    return QBDetail(
        qb_id=qb_id,
        qb_name=entry["qb_name"],
        team=entry["team"],
        season=entry["season"],
        league_baseline=entry["league_baseline"],
        support_component=entry["support_component"],
        qb_component=entry["qb_component"],
        epa_per_play=entry["epa_per_play"],
        predicted_epa=entry["predicted_epa"],
        raw_features=entry["raw_features"],
        feature_ranges=_FEATURE_RANGES,
    )


def get_seasons_for_qb(qb_id: str) -> list[int]:
    return _SEASONS_BY_QB_ID.get(qb_id, [])


def get_feature_ranges() -> dict[str, tuple[float, float]]:
    return _FEATURE_RANGES
