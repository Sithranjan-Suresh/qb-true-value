from pydantic import BaseModel


class QBSummary(BaseModel):
    qb_id: str
    qb_name: str
    team: str
    season: int
    epa_per_play: float
    qb_created_epa: float
    support_share: float
    attempts: int


class QBDetail(BaseModel):
    qb_id: str
    qb_name: str
    team: str
    season: int
    league_baseline: float
    support_component: float
    qb_component: float
    epa_per_play: float
    predicted_epa: float
    raw_features: dict[str, float]
    feature_ranges: dict[str, tuple[float, float]]


class WhatIfRequest(BaseModel):
    qb_id: str
    season: int
    avg_separation: float
    time_to_throw: float
    pass_block_win_rate: float
    opponent_def_epa: float


class WhatIfResponse(BaseModel):
    predicted_epa: float
    qb_component_counterfactual: float
    support_component_counterfactual: float


class MethodologyResponse(BaseModel):
    content: str
    last_updated: str


class HealthResponse(BaseModel):
    status: str
