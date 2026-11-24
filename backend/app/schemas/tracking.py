from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class LandmarkPoint(BaseModel):
    id: int = Field(..., description="Landmark index (0-20)")
    name: str = Field(..., description="Anatomical landmark name")
    x: float = Field(..., description="Normalized x coordinate (0.0 - 1.0)")
    y: float = Field(..., description="Normalized y coordinate (0.0 - 1.0)")
    z: float = Field(0.0, description="Normalized depth coordinate")
    visibility: Optional[float] = 1.0
    presence: Optional[float] = 1.0


class BoundingBoxNormalized(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class CursorCoordinate(BaseModel):
    x: float = Field(50.0, description="Virtual cursor X coordinate in percentage (0 - 100)")
    y: float = Field(50.0, description="Virtual cursor Y coordinate in percentage (0 - 100)")
    is_smoothed: bool = True


class HandDetectionResult(BaseModel):
    hand_index: int = 0
    handedness: str = Field("Right", description="Left or Right")
    confidence: float = Field(0.95, ge=0.0, le=1.0)
    landmarks: List[LandmarkPoint] = Field(default_factory=list)
    bounding_box: Optional[BoundingBoxNormalized] = None
    detected_gesture: str = "Pointing"
    gesture_confidence: float = 0.90


from backend.app.schemas.gesture import IntentValidationResult


class FrameProcessRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG or PNG image string or data URI")
    session_id: Optional[str] = "default_session"
    student_id: Optional[str] = "student_a"
    client_timestamp_ms: Optional[int] = None
    preferred_hand: Optional[str] = "right"
    smoothing_factor: Optional[float] = 0.65


class FrameProcessResponse(BaseModel):
    success: bool = True
    hands_detected: int = 0
    hands: List[HandDetectionResult] = Field(default_factory=list)
    active_gesture: str = "Resting"
    gesture_confidence: float = 0.0
    cursor_position: CursorCoordinate = Field(default_factory=CursorCoordinate)
    is_resting: bool = False
    intent_validation: Optional[IntentValidationResult] = None
    processing_time_ms: float = 0.0
    error: Optional[str] = None



class TrackingStatus(BaseModel):
    status: str = "ready"
    model_loaded: bool = True
    model_name: str = "MediaPipe Hand Landmarker"
    max_hands: int = 2
    total_frames_processed: int = 0
    average_latency_ms: float = 0.0
