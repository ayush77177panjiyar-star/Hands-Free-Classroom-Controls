import base64
import time
from typing import Optional, Dict, Any, Tuple
import cv2
import numpy as np

from backend.app.schemas.tracking import (
    FrameProcessRequest,
    FrameProcessResponse,
    CursorCoordinate,
    HandDetectionResult,
)
from backend.app.schemas.gesture import IntentValidationResult, ValidationState, ClassroomCommandType, RejectionReason, GestureType
from backend.app.services.mediapipe_service import mediapipe_service
from backend.app.services.movement_analysis import movement_analyzer
from backend.app.services.gesture_recognition import gesture_recognizer
from backend.app.services.intent_validation import intent_validator
from backend.app.services.calibration_service import calibration_service


class FrameProcessor:
    def __init__(self):
        # Smoothing memory for virtual cursor per student session
        self.cursor_state: Dict[str, Tuple[float, float]] = {}
        self.total_frames_processed = 0
        self.total_latency_ms = 0.0

    def process_frame(self, request: FrameProcessRequest) -> FrameProcessResponse:
        start_time = time.time()
        session_id = request.session_id or "default_session"
        student_id = (request.student_id or "student_a").lower()
        client_ts = request.client_timestamp_ms or int(time.time() * 1000)

        # 1. Base64 Image Decoding
        raw_base64 = request.image
        if "," in raw_base64:
            raw_base64 = raw_base64.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(raw_base64)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            bgr_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if bgr_image is None:
                return FrameProcessResponse(
                    success=False,
                    error="Failed to decode image from base64 buffer",
                    processing_time_ms=0.0,
                )

            # Downscale if width > 640 for rapid inference
            h, w = bgr_image.shape[:2]
            if w > 640:
                scale = 640.0 / w
                new_w, new_h = 640, int(h * scale)
                bgr_image = cv2.resize(bgr_image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

            rgb_image = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2RGB)

        except Exception as e:
            return FrameProcessResponse(
                success=False,
                error=f"Image decoding exception: {str(e)}",
                processing_time_ms=round((time.time() - start_time) * 1000, 2),
            )

        # 2. MediaPipe Hand Landmark Detection
        try:
            detected_hands = mediapipe_service.detect_hands(rgb_image)
        except Exception as e:
            return FrameProcessResponse(
                success=False,
                error=f"MediaPipe detection error: {str(e)}",
                processing_time_ms=round((time.time() - start_time) * 1000, 2),
            )

        # 3. Retrieve Personalized Student Adaptive Thresholds
        profile = calibration_service.get_profile(student_id)
        thresholds = profile.adaptive_thresholds
        preferred_hand = (request.preferred_hand or profile.preferred_hand.value).capitalize()
        smoothing_factor = request.smoothing_factor if request.smoothing_factor is not None else profile.sensitivity.smoothing_factor

        # Cursor position smoothing memory
        prev_x, prev_y = self.cursor_state.get(session_id, (50.0, 50.0))
        cursor_x, cursor_y = prev_x, prev_y

        primary_hand: Optional[HandDetectionResult] = None
        active_gesture = "Resting"
        gesture_confidence = 0.0
        is_resting = True

        validation_result = IntentValidationResult(
            state=ValidationState.IDLE,
            detected_gesture=GestureType.RESTING,
            validated_command=ClassroomCommandType.NONE,
            is_accepted=False,
            rejection_reason=RejectionReason.TRACKING_LOST if not detected_hands else RejectionReason.NONE,
            cooldown_remaining_ms=0.0,
            cursor_position={"x": prev_x, "y": prev_y},
        )

        if detected_hands:
            for hand in detected_hands:
                if hand.handedness == preferred_hand or primary_hand is None:
                    primary_hand = hand

            if primary_hand and primary_hand.landmarks:
                # 4. Trajectory and Accidental Motion Analysis
                movement_data = movement_analyzer.analyze_movement(
                    hand=primary_hand,
                    thresholds=thresholds,
                    student_id=student_id,
                    timestamp_ms=client_ts,
                )

                # 5. Gesture Recognition using Adaptive Thresholds
                gesture_classification = gesture_recognizer.evaluate_hand_landmarks(
                    hand=primary_hand,
                    thresholds=thresholds,
                    movement_data=movement_data,
                )

                active_gesture = gesture_classification.gesture.value
                gesture_confidence = gesture_classification.confidence
                primary_hand.detected_gesture = active_gesture
                primary_hand.gesture_confidence = gesture_confidence
                is_resting = (active_gesture == "Resting" or movement_data.get("is_resting_motion", False))

                # 6. Cursor Coordinate Calculation with Smoothing & Deadzone
                index_tip = primary_hand.landmarks[8]
                # Mirrored X mapping
                raw_target_x = (1.0 - index_tip.x) * 100.0
                raw_target_y = index_tip.y * 100.0

                # Deadzone filtering: only move cursor if displacement exceeds deadzone
                deadzone_pct = thresholds.movement_deadzone * 100.0
                delta_x = raw_target_x - prev_x
                delta_y = raw_target_y - prev_y
                dist_moved = (delta_x ** 2 + delta_y ** 2) ** 0.5

                if dist_moved > deadzone_pct:
                    cursor_x = prev_x * smoothing_factor + raw_target_x * (1.0 - smoothing_factor)
                    cursor_y = prev_y * smoothing_factor + raw_target_y * (1.0 - smoothing_factor)
                else:
                    cursor_x, cursor_y = prev_x, prev_y

                cursor_x = max(0.0, min(100.0, cursor_x))
                cursor_y = max(0.0, min(100.0, cursor_y))
                self.cursor_state[session_id] = (cursor_x, cursor_y)

                # 7. Intent Validation State Machine
                validation_result = intent_validator.validate_intent(
                    gesture_data=gesture_classification,
                    movement_data=movement_data,
                    thresholds=thresholds,
                    student_id=student_id,
                    timestamp_ms=client_ts,
                    cursor_coords={"x": round(cursor_x, 2), "y": round(cursor_y, 2)},
                )

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        self.total_frames_processed += 1
        self.total_latency_ms += elapsed_ms

        return FrameProcessResponse(
            success=True,
            hands_detected=len(detected_hands),
            hands=detected_hands,
            active_gesture=active_gesture,
            gesture_confidence=gesture_confidence,
            cursor_position=CursorCoordinate(
                x=round(cursor_x, 2),
                y=round(cursor_y, 2),
                is_smoothed=True,
            ),
            is_resting=is_resting,
            intent_validation=validation_result,
            processing_time_ms=elapsed_ms,
        )


frame_processor = FrameProcessor()
