from enum import Enum
from typing import Dict, Optional, List, Tuple
from pydantic import BaseModel, Field


class HandPreference(str, Enum):
    RIGHT = "right"
    LEFT = "left"


class BoundingBox(BaseModel):
    x_min: float = Field(0.25, ge=0.0, le=1.0)
    y_min: float = Field(0.25, ge=0.0, le=1.0)
    x_max: float = Field(0.75, ge=0.0, le=1.0)
    y_max: float = Field(0.75, ge=0.0, le=1.0)


class GestureSensitivity(BaseModel):
    cursor_speed: float = Field(1.2, ge=0.1, le=3.0)
    smoothing_factor: float = Field(0.65, ge=0.0, le=1.0)
    pinch_threshold: float = Field(0.05, ge=0.01, le=0.2)
    dwell_time_ms: int = Field(700, ge=300, le=2500)
    deadzone_radius: float = Field(0.02, ge=0.0, le=0.1)


class CalibrationSample(BaseModel):
    gesture_name: str
    timestamp_ms: Optional[int] = None
    pinch_dist: Optional[float] = None
    velocity: Optional[float] = None
    displacement: Optional[float] = None
    jitter_variance: Optional[float] = None
    hand_position: Optional[Tuple[float, float]] = None


class AdaptiveThresholds(BaseModel):
    pinch_threshold: float = Field(0.055, description="Personalized pinch closure threshold")
    resting_jitter_threshold: float = Field(0.0008, description="Micro-jitter variance threshold for resting filtering")
    movement_deadzone: float = Field(0.020, description="Spatial deadzone radius")
    swipe_min_velocity: float = Field(0.40, description="Minimum horizontal velocity for swipe trigger")
    swipe_min_displacement: float = Field(0.15, description="Minimum horizontal delta-x for swipe trigger")
    min_gesture_duration_ms: int = Field(140, description="Required temporal stability before candidate confirmation")
    cooldown_duration_ms: int = Field(650, description="Lockout time preventing rapid duplicate command emission")
    dwell_time_ms: int = Field(700, description="Dwell timer for selection")
    resting_zone: BoundingBox = Field(default_factory=BoundingBox)


class StudentProfile(BaseModel):
    profile_id: str = "student_a"
    student_name: str = "Alex Sterling"
    preferred_hand: HandPreference = HandPreference.RIGHT
    adaptive_thresholds: AdaptiveThresholds = Field(default_factory=AdaptiveThresholds)
    sensitivity: GestureSensitivity = Field(default_factory=GestureSensitivity)
    calibration_date: Optional[str] = None
    calibration_quality_score: int = Field(94, ge=0, le=100)
    is_calibrated: bool = True
    sample_counts: Dict[str, int] = Field(default_factory=lambda: {"pinch": 8, "resting": 10, "swipe": 6, "pointing": 12})
    recalibration_needed: bool = False


# Retain legacy schema alias for backwards compatibility
class CalibrationProfile(StudentProfile):
    pass


class CalibrationSampleSubmission(BaseModel):
    student_id: str = "student_a"
    sample: CalibrationSample


class CalibrationCalculationRequest(BaseModel):
    student_id: str = "student_a"
    preferred_hand: Optional[HandPreference] = HandPreference.RIGHT
