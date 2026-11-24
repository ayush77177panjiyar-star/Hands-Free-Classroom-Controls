from fastapi import APIRouter
from backend.app.api.v1.endpoints import health, calibration, sessions, analytics, tracking

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & Status"])
api_router.include_router(tracking.router, prefix="/tracking", tags=["Computer Vision & Tracking"])
api_router.include_router(calibration.router, prefix="/calibration", tags=["Calibration"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Testing"])

