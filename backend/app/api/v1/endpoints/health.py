import time
from datetime import datetime
from fastapi import APIRouter
from backend.app.schemas.health import HealthResponse, SystemStatus
from backend.app.core.config import settings

router = APIRouter()
START_TIME = time.time()


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def get_health():
    """
    Returns current health status and metadata of the Hands-Free Classroom Controls API.
    """
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.utcnow(),
        environment=settings.ENVIRONMENT,
    )


@router.get("/status", response_model=SystemStatus, summary="Detailed Subsystem Status")
async def get_status():
    """
    Returns detailed operational status of gesture engine and subsystems.
    """
    uptime = time.time() - START_TIME
    return SystemStatus(
        status="operational",
        uptime_seconds=round(uptime, 2),
        active_connections=1,
        modules={
            "fastapi": "running",
            "gesture_engine": "ready",
            "camera_pipeline": "idle",
            "analytics": "online"
        }
    )
