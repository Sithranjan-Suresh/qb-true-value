import datetime
from pathlib import Path

from fastapi import APIRouter

from app.schemas import MethodologyResponse

router = APIRouter()

METHODOLOGY_PATH = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "methodology.md"

if not METHODOLOGY_PATH.exists():
    raise RuntimeError(f"Required file is missing: {METHODOLOGY_PATH}")

_CONTENT = METHODOLOGY_PATH.read_text(encoding="utf-8")
_LAST_UPDATED = datetime.datetime.fromtimestamp(
    METHODOLOGY_PATH.stat().st_mtime, tz=datetime.timezone.utc
).isoformat()


@router.get("/methodology", response_model=MethodologyResponse)
def get_methodology() -> MethodologyResponse:
    return MethodologyResponse(content=_CONTENT, last_updated=_LAST_UPDATED)
