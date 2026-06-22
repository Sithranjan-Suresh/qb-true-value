from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import qbs, whatif
from app.schemas import HealthResponse

app = FastAPI(title="QB True Value API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.ALLOWED_ORIGIN, "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


app.include_router(qbs.router, prefix="/api")
app.include_router(whatif.router, prefix="/api")
