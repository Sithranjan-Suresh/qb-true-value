from fastapi import APIRouter, HTTPException

from app.schemas import QBDetail, QBSummary
from app.services import data_store

router = APIRouter()


@router.get("/qbs", response_model=list[QBSummary])
def list_qbs() -> list[QBSummary]:
    return data_store.get_leaderboard()


@router.get("/qbs/{qb_id}/{season}", response_model=QBDetail)
def get_qb_detail(qb_id: str, season: int) -> QBDetail:
    detail = data_store.get_qb_detail(qb_id, season)
    if detail is None:
        raise HTTPException(status_code=404, detail="QB not found")
    return detail


@router.get("/qbs/{qb_id}", response_model=list[int])
def get_qb_seasons(qb_id: str) -> list[int]:
    return data_store.get_seasons_for_qb(qb_id)
