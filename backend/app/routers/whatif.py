from fastapi import APIRouter, HTTPException
from pydantic import create_model, Field

from app.schemas import WhatIfResponse
from app.services import data_store, inference

router = APIRouter()

_RANGES = data_store.get_feature_ranges()

# WhatIfRequest's per-feature bounds come from model_coefficients.json (computed once
# at training time, not hardcoded), so the validated request model is built dynamically
# at import time rather than declared as a static class in schemas.py.
_WhatIfRequestValidated = create_model(
    "WhatIfRequestValidated",
    qb_id=(str, ...),
    season=(int, ...),
    avg_separation=(float, Field(..., ge=_RANGES["avg_separation"][0], le=_RANGES["avg_separation"][1])),
    time_to_throw=(float, Field(..., ge=_RANGES["time_to_throw"][0], le=_RANGES["time_to_throw"][1])),
    pass_block_win_rate=(
        float,
        Field(..., ge=_RANGES["pass_block_win_rate"][0], le=_RANGES["pass_block_win_rate"][1]),
    ),
    opponent_def_epa=(
        float,
        Field(..., ge=_RANGES["opponent_def_epa"][0], le=_RANGES["opponent_def_epa"][1]),
    ),
)


@router.post("/whatif", response_model=WhatIfResponse)
def post_whatif(request: _WhatIfRequestValidated) -> WhatIfResponse:
    features = {
        "avg_separation": request.avg_separation,
        "time_to_throw": request.time_to_throw,
        "pass_block_win_rate": request.pass_block_win_rate,
        "opponent_def_epa": request.opponent_def_epa,
    }
    try:
        return inference.decompose(request.qb_id, request.season, features)
    except ValueError:
        raise HTTPException(status_code=404, detail="QB not found")
