from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Service status indicator")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    environment: str = Field(default="development")


class SystemStatus(BaseModel):
    status: str = "operational"
    uptime_seconds: float = 0.0
    active_connections: int = 0
    modules: Dict[str, str] = Field(
        default_factory=lambda: {
            "fastapi": "running",
            "gesture_engine": "ready",
            "camera_pipeline": "idle",
            "analytics": "online"
        }
    )
