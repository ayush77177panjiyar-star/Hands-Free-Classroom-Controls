import os
import sys

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import math
import pytest
from backend.app.utils.movement import (
    euclidean_dist_2d,
    euclidean_dist_3d,
    calculate_angle_3points,
    compute_velocity,
    compute_jitter_variance,
    classify_dominant_direction,
)
from backend.app.utils.thresholds import (
    compute_adaptive_pinch_threshold,
    compute_resting_baseline_thresholds,
    compute_swipe_thresholds,
)
from backend.app.schemas.tracking import LandmarkPoint, HandDetectionResult
from backend.app.schemas.gesture import (
    GestureType,
    ValidationState,
    ClassroomCommandType,
    RejectionReason,
    GestureClassification,
)
from backend.app.schemas.calibration import (
    AdaptiveThresholds,
    CalibrationSample,
    HandPreference,
)
from backend.app.services.movement_analysis import movement_analyzer
from backend.app.services.gesture_recognition import gesture_recognizer
from backend.app.services.command_executor import command_executor
from backend.app.services.intent_validation import intent_validator
from backend.app.services.calibration_service import calibration_service


# Helper: construct synthetic landmarks
def create_landmark(idx: int, x: float, y: float, z: float = 0.0) -> LandmarkPoint:
    return LandmarkPoint(id=idx, name=f"P_{idx}", x=x, y=y, z=z)


def make_hand(landmarks: list[LandmarkPoint], handedness: str = "Right") -> HandDetectionResult:
    return HandDetectionResult(hand_index=0, handedness=handedness, landmarks=landmarks)


# --- 1. Movement & Vector Utility Tests ---
def test_distance_and_angle_calculations():
    # 2D distance
    dist2d = euclidean_dist_2d((0.0, 0.0), (3.0, 4.0))
    assert math.isclose(dist2d, 5.0, abs_tol=1e-5)

    # 3D distance
    dist3d = euclidean_dist_3d((0.0, 0.0, 0.0), (1.0, 2.0, 2.0))
    assert math.isclose(dist3d, 3.0, abs_tol=1e-5)

    # 90-degree angle
    angle = calculate_angle_3points((1.0, 0.0), (0.0, 0.0), (0.0, 1.0))
    assert math.isclose(angle, 90.0, abs_tol=1.0)


def test_velocity_and_direction():
    vx, vy, speed = compute_velocity((0.5, 0.5), (0.2, 0.5), dt_seconds=0.5)
    assert math.isclose(vx, 0.6, abs_tol=1e-4)
    assert math.isclose(vy, 0.0, abs_tol=1e-4)
    assert math.isclose(speed, 0.6, abs_tol=1e-4)

    # Dominant direction
    dir_right = classify_dominant_direction(0.18, 0.02, min_dist=0.05)
    assert dir_right == "RIGHT"

    dir_left = classify_dominant_direction(-0.19, 0.01, min_dist=0.05)
    assert dir_left == "LEFT"

    dir_neutral = classify_dominant_direction(0.01, 0.01, min_dist=0.05)
    assert dir_neutral == "NEUTRAL"


def test_jitter_variance_calculation():
    # Constant position -> zero variance
    stable_points = [(0.5, 0.5), (0.5, 0.5), (0.5, 0.5), (0.5, 0.5)]
    var_stable = compute_jitter_variance(stable_points)
    assert var_stable == 0.0

    # Erratic jittering points
    erratic_points = [(0.2, 0.8), (0.8, 0.2), (0.1, 0.9), (0.9, 0.1)]
    var_erratic = compute_jitter_variance(erratic_points)
    assert var_erratic > 0.05


# --- 2. Adaptive Threshold Statistical Learning Tests ---
def test_adaptive_pinch_threshold_computation():
    # Samples of pinch contact distances: [0.040, 0.042, 0.038, 0.044, 0.041]
    samples = [0.040, 0.042, 0.038, 0.044, 0.041]
    thresh, conf = compute_adaptive_pinch_threshold(samples)
    assert 0.040 <= thresh <= 0.060
    assert conf > 0.80


def test_resting_baseline_thresholds():
    jitters = [0.0002, 0.0003, 0.00025, 0.0004, 0.0002]
    positions = [(0.5, 0.75), (0.51, 0.74), (0.49, 0.76)]
    res = compute_resting_baseline_thresholds(jitters, positions)
    assert "resting_jitter_threshold" in res
    assert "movement_deadzone" in res
    assert res["resting_jitter_threshold"] > 0


def test_swipe_thresholds():
    vels = [0.45, 0.52, 0.48, 0.60]
    disps = [0.18, 0.22, 0.19, 0.25]
    res = compute_swipe_thresholds(vels, disps)
    assert 0.25 <= res["swipe_min_velocity"] <= 0.60
    assert 0.10 <= res["swipe_min_displacement"] <= 0.25


# --- 3. Intent Validation State Machine & Accidental Movement Prevention ---
def test_intent_validation_state_progression():
    intent_validator.reset_session("student_test")
    thresholds = AdaptiveThresholds(
        pinch_threshold=0.055,
        min_gesture_duration_ms=100,
        cooldown_duration_ms=500,
    )

    pinch_class = GestureClassification(
        gesture=GestureType.PINCH,
        confidence=0.95,
        pinch_distance=0.04,
    )
    movement = {
        "speed": 0.01,
        "displacement": 0.01,
        "is_resting_motion": False,
        "jitter_variance": 0.0001,
    }

    # Step 1: Initial candidate detection (time t=0.0)
    res1 = intent_validator.validate_intent(
        gesture_data=pinch_class,
        movement_data=movement,
        thresholds=thresholds,
        student_id="student_test",
        timestamp_ms=1000,
    )
    # Starts in candidate / stability validation as duration is only 0ms
    assert res1.state in [ValidationState.GESTURE_CANDIDATE, ValidationState.STABILITY_VALIDATION]
    assert res1.is_accepted is False

    # Step 2: Maintained pinch for 150ms (> min_gesture_duration 100ms)
    res2 = intent_validator.validate_intent(
        gesture_data=pinch_class,
        movement_data=movement,
        thresholds=thresholds,
        student_id="student_test",
        timestamp_ms=1150,
    )
    # Passed temporal stability -> Intent confirmed & command executed
    assert res2.state == ValidationState.COMMAND_EXECUTION
    assert res2.validated_command == ClassroomCommandType.SELECT_ANSWER
    assert res2.is_accepted is True


def test_accidental_resting_motion_rejection():
    intent_validator.reset_session("student_test")
    thresholds = AdaptiveThresholds()

    resting_motion = {
        "is_resting_motion": True,
        "displacement": 0.01,
        "jitter_variance": 0.0001,
    }
    swipe_candidate = GestureClassification(gesture=GestureType.SWIPE_RIGHT, confidence=0.88)

    res = intent_validator.validate_intent(
        gesture_data=swipe_candidate,
        movement_data=resting_motion,
        thresholds=thresholds,
        student_id="student_test",
        timestamp_ms=1000,
    )
    assert res.state == ValidationState.IDLE
    assert res.is_accepted is False
    assert res.rejection_reason == RejectionReason.RESTING_MOVEMENT_FILTERED


def test_cooldown_and_duplicate_prevention():
    intent_validator.reset_session("student_test")
    thresholds = AdaptiveThresholds(
        cooldown_duration_ms=600,
        min_gesture_duration_ms=50,
    )

    pinch_class = GestureClassification(gesture=GestureType.PINCH, confidence=0.95, pinch_distance=0.03)
    movement = {"is_resting_motion": False, "displacement": 0.01, "jitter_variance": 0.0001}

    # First execution at t=1000ms
    intent_validator.validate_intent(pinch_class, movement, thresholds, "student_test", timestamp_ms=1000)
    res_exec = intent_validator.validate_intent(pinch_class, movement, thresholds, "student_test", timestamp_ms=1100)
    assert res_exec.is_accepted is True

    # Immediate follow-up attempt at t=1200ms (only 100ms later, during 600ms cooldown)
    res_cooldown = intent_validator.validate_intent(pinch_class, movement, thresholds, "student_test", timestamp_ms=1200)
    assert res_cooldown.state == ValidationState.COOLDOWN
    assert res_cooldown.is_accepted is False
    assert res_cooldown.rejection_reason == RejectionReason.IN_COOLDOWN_PERIOD


# --- 4. User Profile Isolation Tests (Student A vs Student B) ---
def test_student_profile_isolation():
    # Student A (Right-handed, standard thresholds)
    prof_a = calibration_service.get_profile("student_a")
    assert prof_a.profile_id == "student_a"
    assert prof_a.preferred_hand == HandPreference.RIGHT
    thresh_a = prof_a.adaptive_thresholds.pinch_threshold

    # Student B (Left-handed, different thresholds)
    prof_b = calibration_service.get_profile("student_b")
    assert prof_b.profile_id == "student_b"
    assert prof_b.preferred_hand == HandPreference.LEFT
    thresh_b = prof_b.adaptive_thresholds.pinch_threshold

    # Assert distinct calibration thresholds
    assert thresh_a != thresh_b

    # Record sample to Student A
    calibration_service.record_sample("student_a", CalibrationSample(gesture_name="pinch", pinch_dist=0.048))
    counts_a = calibration_service.get_sample_counts("student_a")
    counts_b = calibration_service.get_sample_counts("student_b")

    # Verify no cross-contamination between profiles
    assert counts_a.get("pinch", 0) > counts_b.get("pinch", 0)
