from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class GestureType(str, Enum):
    POINTING = "Pointing"
    PINCH = "Pinch"
    OPEN_PALM = "Open Palm"
    SWIPE_LEFT = "Swipe Left"
    SWIPE_RIGHT = "Swipe Right"
    RESTING = "Resting"
    FIST = "Fist"
    PEACE = "Peace Sign"
    UNKNOWN = "Unknown"


class FingerState(BaseModel):
    name: str  # Thumb, Index, Middle, Ring, Pinky
    is_extended: bool
    tip_to_mcp_dist: float
    tip_to_wrist_dist: float


class GestureClassification(BaseModel):
    gesture: GestureType = GestureType.RESTING
    confidence: float = Field(0.0, ge=0.0, le=1.0)
    finger_states: List[FingerState] = Field(default_factory=list)
    pinch_distance: Optional[float] = None
    velocity_x: Optional[float] = 0.0
    velocity_y: Optional[float] = 0.0
    description: str = ""
