from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from backend.app.schemas.calibration import (
    StudentProfile,
    HandPreference,
    AdaptiveThresholds,
    BoundingBox,
    GestureSensitivity,
    CalibrationSample,
)
from backend.app.utils.thresholds import (
    compute_adaptive_pinch_threshold,
    compute_resting_baseline_thresholds,
    compute_swipe_thresholds,
)


class CalibrationService:
    def __init__(self):
        # Dedicated profile storage for Student A, Student B, and default
        self._profiles: Dict[str, StudentProfile] = {
            "student_a": StudentProfile(
                profile_id="student_a",
                student_name="Student A (Alex Sterling)",
                preferred_hand=HandPreference.RIGHT,
                adaptive_thresholds=AdaptiveThresholds(
                    pinch_threshold=0.052,
                    resting_jitter_threshold=0.00065,
                    movement_deadzone=0.018,
                    swipe_min_velocity=0.38,
                    swipe_min_displacement=0.14,
                    min_gesture_duration_ms=130,
                    cooldown_duration_ms=600,
                    dwell_time_ms=700,
                    resting_zone=BoundingBox(x_min=0.22, y_min=0.22, x_max=0.78, y_max=0.78),
                ),
                sensitivity=GestureSensitivity(
                    cursor_speed=1.3,
                    smoothing_factor=0.62,
                    pinch_threshold=0.052,
                    dwell_time_ms=700,
                    deadzone_radius=0.018,
                ),
                calibration_date=datetime.now(timezone.utc).isoformat(),
                calibration_quality_score=96,
                is_calibrated=True,
                sample_counts={"pinch": 8, "resting": 10, "swipe": 6, "pointing": 12},
                recalibration_needed=False,
            ),
            "student_b": StudentProfile(
                profile_id="student_b",
                student_name="Student B (Jordan Vance)",
                preferred_hand=HandPreference.LEFT,
                adaptive_thresholds=AdaptiveThresholds(
                    pinch_threshold=0.046,
                    resting_jitter_threshold=0.00095,
                    movement_deadzone=0.024,
                    swipe_min_velocity=0.45,
                    swipe_min_displacement=0.17,
                    min_gesture_duration_ms=160,
                    cooldown_duration_ms=750,
                    dwell_time_ms=850,
                    resting_zone=BoundingBox(x_min=0.20, y_min=0.20, x_max=0.80, y_max=0.80),
                ),
                sensitivity=GestureSensitivity(
                    cursor_speed=1.1,
                    smoothing_factor=0.72,
                    pinch_threshold=0.046,
                    dwell_time_ms=850,
                    deadzone_radius=0.024,
                ),
                calibration_date=datetime.now(timezone.utc).isoformat(),
                calibration_quality_score=91,
                is_calibrated=True,
                sample_counts={"pinch": 6, "resting": 8, "swipe": 5, "pointing": 9},
                recalibration_needed=False,
            ),
        }

        # Raw sample collection buffers per student: Dict[student_id, List[CalibrationSample]]
        self._sample_buffers: Dict[str, List[CalibrationSample]] = {
            "student_a": [],
            "student_b": [],
        }

    def get_profile(self, profile_id: str = "student_a") -> StudentProfile:
        # Default fallback
        pid = profile_id.lower()
        if pid in self._profiles:
            return self._profiles[pid]
        if "default" in pid or "student" in pid:
            return self._profiles["student_a"]

        # Create new profile if not found
        new_prof = StudentProfile(
            profile_id=pid,
            student_name=f"Student ({pid})",
            preferred_hand=HandPreference.RIGHT,
            calibration_date=datetime.now(timezone.utc).isoformat(),
            calibration_quality_score=85,
            is_calibrated=False,
            sample_counts={},
            recalibration_needed=True,
        )
        self._profiles[pid] = new_prof
        return new_prof

    def save_profile(self, profile: StudentProfile) -> StudentProfile:
        profile.calibration_date = datetime.now(timezone.utc).isoformat()
        self._profiles[profile.profile_id.lower()] = profile
        return profile

    def record_sample(self, student_id: str, sample: CalibrationSample) -> Dict[str, Any]:
        sid = student_id.lower()
        if sid not in self._sample_buffers:
            self._sample_buffers[sid] = []

        if sample.timestamp_ms is None:
            sample.timestamp_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

        self._sample_buffers[sid].append(sample)
        counts = self.get_sample_counts(sid)

        return {
            "student_id": sid,
            "sample_recorded": sample.gesture_name,
            "total_samples": len(self._sample_buffers[sid]),
            "counts": counts,
        }

    def get_sample_counts(self, student_id: str) -> Dict[str, int]:
        sid = student_id.lower()
        samples = self._sample_buffers.get(sid, [])
        counts: Dict[str, int] = {}
        for s in samples:
            g = s.gesture_name.lower()
            counts[g] = counts.get(g, 0) + 1
        return counts

    def calculate_adaptive_profile(
        self,
        student_id: str,
        preferred_hand: HandPreference = HandPreference.RIGHT,
    ) -> StudentProfile:
        sid = student_id.lower()
        samples = self._sample_buffers.get(sid, [])

        # Extract gesture-specific measurements
        pinch_dists = [s.pinch_dist for s in samples if s.pinch_dist is not None and "pinch" in s.gesture_name.lower()]
        resting_jitters = [s.jitter_variance for s in samples if s.jitter_variance is not None and "rest" in s.gesture_name.lower()]
        resting_positions = [s.hand_position for s in samples if s.hand_position is not None and "rest" in s.gesture_name.lower()]
        swipe_vels = [s.velocity for s in samples if s.velocity is not None and "swipe" in s.gesture_name.lower()]
        swipe_disps = [s.displacement for s in samples if s.displacement is not None and "swipe" in s.gesture_name.lower()]

        # Check sample sufficiency
        recalibration_needed = False
        quality_score = 95
        if len(pinch_dists) < 3 or len(resting_jitters) < 3:
            recalibration_needed = True
            quality_score = 70

        # Calculate personalized adaptive thresholds
        pinch_thresh, pinch_conf = compute_adaptive_pinch_threshold(pinch_dists)
        resting_data = compute_resting_baseline_thresholds(resting_jitters, resting_positions)
        swipe_data = compute_swipe_thresholds(swipe_vels, swipe_disps)

        adaptive = AdaptiveThresholds(
            pinch_threshold=pinch_thresh,
            resting_jitter_threshold=resting_data["resting_jitter_threshold"],
            movement_deadzone=resting_data["movement_deadzone"],
            swipe_min_velocity=swipe_data["swipe_min_velocity"],
            swipe_min_displacement=swipe_data["swipe_min_displacement"],
            min_gesture_duration_ms=130 if preferred_hand == HandPreference.RIGHT else 160,
            cooldown_duration_ms=600,
            dwell_time_ms=700,
            resting_zone=BoundingBox(**resting_data["resting_zone"]),
        )

        profile = StudentProfile(
            profile_id=sid,
            student_name=f"Student {sid.upper()}",
            preferred_hand=preferred_hand,
            adaptive_thresholds=adaptive,
            sensitivity=GestureSensitivity(
                cursor_speed=1.2,
                smoothing_factor=0.65,
                pinch_threshold=pinch_thresh,
                dwell_time_ms=700,
                deadzone_radius=resting_data["movement_deadzone"],
            ),
            calibration_date=datetime.now(timezone.utc).isoformat(),
            calibration_quality_score=quality_score,
            is_calibrated=not recalibration_needed,
            sample_counts=self.get_sample_counts(sid),
            recalibration_needed=recalibration_needed,
        )

        self._profiles[sid] = profile
        return profile

    def reset_profile(self, profile_id: str = "student_a") -> StudentProfile:
        sid = profile_id.lower()
        if sid in self._sample_buffers:
            self._sample_buffers[sid].clear()

        default_p = StudentProfile(
            profile_id=sid,
            student_name=f"Reset Student ({sid})",
            preferred_hand=HandPreference.RIGHT,
            calibration_date=datetime.now(timezone.utc).isoformat(),
            calibration_quality_score=80,
            is_calibrated=False,
            sample_counts={},
            recalibration_needed=True,
        )
        self._profiles[sid] = default_p
        return default_p


calibration_service = CalibrationService()
