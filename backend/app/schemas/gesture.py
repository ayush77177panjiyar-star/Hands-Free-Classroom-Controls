from enum import Enum
from typing import List, Optional, Dict, Any
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


class ValidationState(str, Enum):
    IDLE = "IDLE"
    GESTURE_CANDIDATE = "GESTURE_CANDIDATE"
    CONFIDENCE_VALIDATION = "CONFIDENCE_VALIDATION"
    STABILITY_VALIDATION = "STABILITY_VALIDATION"
    INTENT_CONFIRMED = "INTENT_CONFIRMED"
    COMMAND_EXECUTION = "COMMAND_EXECUTION"
    COOLDOWN = "COOLDOWN"
    RETURN_TO_NEUTRAL = "RETURN_TO_NEUTRAL"


class ClassroomCommandType(str, Enum):
    CURSOR_MOVE = "CURSOR_MOVE"
    SELECT_ANSWER = "SELECT_ANSWER"
    DRAG_START = "DRAG_START"
    DRAG_MOVE = "DRAG_MOVE"
    DRAG_DROP = "DRAG_DROP"
    NAVIGATE_NEXT = "NAVIGATE_NEXT"
    NAVIGATE_PREVIOUS = "NAVIGATE_PREVIOUS"
    PAUSE_CONTROLS = "PAUSE_CONTROLS"
    RESUME_CONTROLS = "RESUME_CONTROLS"
    NONE = "NONE"


class RejectionReason(str, Enum):
    NONE = "NONE"
    RESTING_MOVEMENT_FILTERED = "RESTING_MOVEMENT_FILTERED"
    ERRATIC_JITTER_DETECTED = "ERRATIC_JITTER_DETECTED"
    BELOW_MIN_DURATION = "BELOW_MIN_DURATION"
    CONFIDENCE_TOO_LOW = "CONFIDENCE_TOO_LOW"
    IN_COOLDOWN_PERIOD = "IN_COOLDOWN_PERIOD"
    REQUIRES_NEUTRAL_RETURN = "REQUIRES_NEUTRAL_RETURN"
    TRACKING_LOST = "TRACKING_LOST"
    INSUFFICIENT_DISPLACEMENT = "INSUFFICIENT_DISPLACEMENT"


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


class IntentValidationResult(BaseModel):
    state: ValidationState = ValidationState.IDLE
    detected_gesture: GestureType = GestureType.RESTING
    validated_command: ClassroomCommandType = ClassroomCommandType.NONE
    is_accepted: bool = False
    rejection_reason: RejectionReason = RejectionReason.NONE
    confidence: float = 0.0
    duration_ms: float = 0.0
    stability_score: float = 1.0
    cooldown_remaining_ms: float = 0.0
    cursor_position: Optional[Dict[str, float]] = None
    diagnostics: Dict[str, Any] = Field(default_factory=dict)
