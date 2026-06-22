import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import settings
from app.main import app
from app.services import data_store, inference

FEATURES = ["avg_separation", "time_to_throw", "pass_block_win_rate", "opponent_def_epa"]

client = TestClient(app)


@pytest.fixture(scope="module")
def known_qb_row():
    """A real qualifying QB-season with full-precision feature values, pulled from
    the scored parquet (not the rounded JSON artifacts) so round-trip comparisons
    can actually be held to a 1e-6 tolerance."""
    df = pd.read_parquet(settings.QB_SEASON_SCORED_PARQUET)
    return df.iloc[0]


def test_health_returns_200():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_qbs_list_nonempty():
    response = client.get("/api/qbs")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == len(data_store.get_leaderboard())
    assert len(body) > 0


def test_qb_detail_matches_decomposition_identity(known_qb_row):
    response = client.get(f"/api/qbs/{known_qb_row['qb_id']}/{int(known_qb_row['season'])}")
    assert response.status_code == 200
    body = response.json()
    identity = body["league_baseline"] + body["support_component"] + body["qb_component"]
    assert abs(identity - body["epa_per_play"]) < 1e-6


def test_qb_detail_404_for_unknown_id():
    response = client.get("/api/qbs/nonexistent-id/1999")
    assert response.status_code == 404
    assert response.json()["detail"] == "QB not found"


def test_whatif_roundtrip_matches_stored_value(known_qb_row):
    detail_response = client.get(f"/api/qbs/{known_qb_row['qb_id']}/{int(known_qb_row['season'])}")
    stored_predicted_epa = detail_response.json()["predicted_epa"]

    payload = {
        "qb_id": known_qb_row["qb_id"],
        "season": int(known_qb_row["season"]),
        **{f: float(known_qb_row[f]) for f in FEATURES},
    }
    response = client.post("/api/whatif", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert abs(body["predicted_epa"] - stored_predicted_epa) < 1e-6


def test_whatif_rejects_out_of_range_value(known_qb_row):
    ranges = data_store.get_feature_ranges()
    payload = {
        "qb_id": known_qb_row["qb_id"],
        "season": int(known_qb_row["season"]),
        "avg_separation": ranges["avg_separation"][1] + 10,
        "time_to_throw": float(known_qb_row["time_to_throw"]),
        "pass_block_win_rate": float(known_qb_row["pass_block_win_rate"]),
        "opponent_def_epa": float(known_qb_row["opponent_def_epa"]),
    }
    response = client.post("/api/whatif", json=payload)
    assert response.status_code == 422
    detail = response.json()["detail"]
    assert any(err["loc"][-1] == "avg_separation" for err in detail)


def test_inference_roundtrip(known_qb_row):
    features = {f: float(known_qb_row[f]) for f in FEATURES}
    predicted = inference.predict(features)
    assert abs(predicted - known_qb_row["predicted_epa"]) < 1e-6
