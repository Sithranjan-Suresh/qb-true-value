import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from app.schemas import WhatIfResponse
from app.services import data_store

_INTERCEPT: float = data_store._MODEL_COEFFICIENTS["intercept"]
_COEFFICIENTS: dict[str, float] = data_store._MODEL_COEFFICIENTS["coefficients"]
_LEAGUE_BASELINE: float = data_store._MODEL_COEFFICIENTS["league_baseline"]


def predict(features: dict[str, float]) -> float:
    """Step 2's OLS piece only: the support-feature contribution to a QB's
    residual, i.e. what the 4 sliders actually move. This is NOT an absolute EPA
    prediction under the two-step model -- see decompose() for how it combines
    with a QB-season's fixed situational baseline to produce one."""
    return _INTERCEPT + sum(_COEFFICIENTS[k] * features[k] for k in _COEFFICIENTS)


def decompose(qb_id: str, season: int, features: dict[str, float]) -> WhatIfResponse:
    detail = data_store.get_qb_detail(qb_id, season)
    if detail is None:
        raise ValueError(f"No QB-season found for qb_id={qb_id!r}, season={season}")

    # The what-if sliders only ever vary the 4 support features -- never a QB's
    # actual historical down/distance/score-state/weather -- so the step-1 GBM's
    # situational baseline for this QB-season is fixed history, recovered here by
    # subtracting the real OLS prediction back out of the stored predicted_epa
    # (predicted_epa = situational_baseline + ols_prediction(real_features), by
    # construction in 04_train_model.py). Only the OLS piece moves with the slider.
    real_ols_prediction = predict(detail.raw_features)
    situational_baseline = detail.predicted_epa - real_ols_prediction

    predicted_epa = situational_baseline + predict(features)
    support_component_counterfactual = predicted_epa - _LEAGUE_BASELINE
    qb_component_counterfactual = detail.epa_per_play - predicted_epa

    return WhatIfResponse(
        predicted_epa=round(predicted_epa, 3),
        qb_component_counterfactual=round(qb_component_counterfactual, 3),
        support_component_counterfactual=round(support_component_counterfactual, 3),
    )
