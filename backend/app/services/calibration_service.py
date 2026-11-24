from typing import Dict
from datetime import datetime
from backend.app.schemas.calibration import CalibrationProfile, HandPreference, BoundingBox, GestureSensitivity


class CalibrationService:
    def __init__(self):
        # In-memory storage for active profiles
        self._profiles: Dict[str, CalibrationProfile] = {
            "default_student": CalibrationProfile(
                profile_id="default_student",
                profile_name="Standard Classroom Profile",
                preferred_hand=HandPreference.RIGHT,
                resting_zone=BoundingBox(x_min=0.25, y_min=0.25, x_max=0.75, y_max=0.75),
                sensitivity=GestureSensitivity(
                    cursor_speed=1.2,
                    smoothing_factor=0.65,
                    pinch_threshold=0.05,
                    dwell_time_ms=700,
                    deadzone_radius=0.02
                ),
                calibration_score=94,
                updated_at=datetime.utcnow().isoformat()
            )
        }

    def get_profile(self, profile_id: str = "default_student") -> CalibrationProfile:
        return self._profiles.get(profile_id, self._profiles["default_student"])

    def save_profile(self, profile: CalibrationProfile) -> CalibrationProfile:
        profile.updated_at = datetime.utcnow().isoformat()
        self._profiles[profile.profile_id] = profile
        return profile

    def reset_profile(self, profile_id: str = "default_student") -> CalibrationProfile:
        default_p = CalibrationProfile(
            profile_id=profile_id,
            profile_name="Standard Classroom Profile (Reset)",
            preferred_hand=HandPreference.RIGHT,
            calibration_score=90,
            updated_at=datetime.utcnow().isoformat()
        )
        self._profiles[profile_id] = default_p
        return default_p


calibration_service = CalibrationService()
