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
from backend.app.services.mediapipe_service import mediapipe_service
from backend.app.services.gesture_detector import gesture_detector


class FrameProcessor:
    def __init__(self):
        # Smoothing memory for virtual cursor per session
        self.cursor_state: Dict[str, Tuple[float, float]] = {}
        self.total_frames_processed = 0
        self.total_latency_ms = 0.0

    def process_frame(self, request: FrameProcessRequest) -> FrameProcessResponse:
        start_time = time.time()
        session_id = request.session_id or "default_session"

        # 1. Base64 Image Decoding
        raw_base64 = request.image
        if "," in raw_base64:
            # Strip data:image/jpeg;base64, header
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

            # Optional downscale if frame is oversized
            h, w = bgr_image.shape[:2]
            if w > 640:
                scale = 640.0 / w
                new_w, new_h = 640, int(h * scale)
                bgr_image = cv2.resize(bgr_image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

            # Convert BGR to RGB
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

        # 3. Gesture Classification & Cursor Calculation
        active_gesture = "Resting"
        gesture_confidence = 0.0
        is_resting = True
        preferred_hand = (request.preferred_hand or "right").capitalize()
        smoothing_factor = request.smoothing_factor if request.smoothing_factor is not None else 0.65

        # Default cursor: center or previous
        prev_x, prev_y = self.cursor_state.get(session_id, (50.0, 50.0))
        cursor_x, cursor_y = prev_x, prev_y

        primary_hand: Optional[HandDetectionResult] = None

        if detected_hands:
            # Find matching preferred hand, or fall back to first detected hand
            for hand in detected_hands:
                # Classify gesture for each hand
                g_result = gesture_detector.classify_gesture(
                    hand=hand,
                    timestamp_ms=request.client_timestamp_ms,
                )
                hand.detected_gesture = g_result.gesture.value
                hand.gesture_confidence = g_result.confidence

                if hand.handedness == preferred_hand or primary_hand is None:
                    primary_hand = hand

            if primary_hand and primary_hand.landmarks:
                active_gesture = primary_hand.detected_gesture
                gesture_confidence = primary_hand.gesture_confidence
                is_resting = (active_gesture == "Resting")

                # Pointer landmark: Index Fingertip (8) or mid between (4) & (8)
                index_tip = primary_hand.landmarks[8]

                # In mirrored webcam, X is mirrored: (1.0 - index_tip.x) * 100.0
                raw_target_x = (1.0 - index_tip.x) * 100.0
                raw_target_y = index_tip.y * 100.0

                # Exponential smoothing
                cursor_x = prev_x * smoothing_factor + raw_target_x * (1.0 - smoothing_factor)
                cursor_y = prev_y * smoothing_factor + raw_target_y * (1.0 - smoothing_factor)

                # Clamp to 0 - 100%
                cursor_x = max(0.0, min(100.0, cursor_x))
                cursor_y = max(0.0, min(100.0, cursor_y))

                self.cursor_state[session_id] = (cursor_x, cursor_y)

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
            processing_time_ms=elapsed_ms,
        )


frame_processor = FrameProcessor()
