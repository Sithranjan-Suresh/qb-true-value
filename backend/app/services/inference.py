import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.schemas import WhatIfResponse
from app.services import data_store

_INTERCEPT: float = data_store._MODEL_COEFFICIENTS["intercept"]
_COEFFICIENTS: dict[str, float] = data_store._MODEL_COEFFICIENTS["coefficients"]
_LEAGUE_BASELINE: float = data_store._MODEL_COEFFICIENTS["league_baseline"]


def predict(features: dict[str, float]) -> float:
    return _INTERCEPT + sum(_COEFFICIENTS[k] * features[k] for k in _COEFFICIENTS)


def decompose(qb_id: str, season: int, features: dict[str, float]) -> WhatIfResponse:
    detail = data_store.get_qb_detail(qb_id, season)
    if detail is None:
        raise ValueError(f"No QB-season found for qb_id={qb_id!r}, season={season}")

    predicted_epa = predict(features)
    support_component_counterfactual = predicted_epa - _LEAGUE_BASELINE
    qb_component_counterfactual = detail.epa_per_play - predicted_epa

    return WhatIfResponse(
        predicted_epa=round(predicted_epa, 3),
        qb_component_counterfactual=round(qb_component_counterfactual, 3),
        support_component_counterfactual=round(support_component_counterfactual, 3),
    )
