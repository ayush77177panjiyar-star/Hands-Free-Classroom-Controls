from enum import Enum
from typing import Dict, Optional, List
from pydantic import BaseModel, Field


class HandPreference(str, Enum):
    RIGHT = "right"
    LEFT = "left"


class BoundingBox(BaseModel):
    x_min: float = Field(0.2, ge=0.0, le=1.0)
    y_min: float = Field(0.2, ge=0.0, le=1.0)
    x_max: float = Field(0.8, ge=0.0, le=1.0)
    y_max: float = Field(0.8, ge=0.0, le=1.0)


class GestureSensitivity(BaseModel):
    cursor_speed: float = Field(1.2, ge=0.1, le=3.0)
    smoothing_factor: float = Field(0.65, ge=0.0, le=1.0)
    pinch_threshold: float = Field(0.05, ge=0.01, le=0.2)
    dwell_time_ms: int = Field(700, ge=300, le=2500)
    deadzone_radius: float = Field(0.02, ge=0.0, le=0.1)


class CalibrationProfile(BaseModel):
    profile_id: str = "default_student"
    profile_name: str = "Standard Profile"
    preferred_hand: HandPreference = HandPreference.RIGHT
    resting_zone: BoundingBox = Field(default_factory=BoundingBox)
    sensitivity: GestureSensitivity = Field(default_factory=GestureSensitivity)
    enabled_gestures: List[str] = Field(
        default_factory=lambda: ["pinch_select", "swipe_left", "swipe_right", "palm_pause", "pointing_cursor"]
    )
    calibration_score: int = Field(92, ge=0, le=100)
    updated_at: Optional[str] = None
