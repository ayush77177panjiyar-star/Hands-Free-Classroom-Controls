import os
import sys
import base64
import numpy as np
import cv2

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.tracking import LandmarkPoint, HandDetectionResult, FrameProcessRequest
from backend.app.services.gesture_detector import gesture_detector
from backend.app.services.frame_processor import frame_processor
from backend.app.schemas.gesture import GestureType


def generate_mock_landmarks(gesture_type: str) -> list[LandmarkPoint]:
    """Generates synthetic 21 landmarks simulating distinct hand postures for testing."""
    # Base palm landmarks
    lm = []
    # 0: Wrist
    lm.append(LandmarkPoint(id=0, name="Wrist", x=0.5, y=0.7, z=0.0))
    # 1-4: Thumb
    lm.append(LandmarkPoint(id=1, name="Thumb CMC", x=0.45, y=0.65, z=0.0))
    lm.append(LandmarkPoint(id=2, name="Thumb MCP", x=0.42, y=0.60, z=0.0))
    lm.append(LandmarkPoint(id=3, name="Thumb IP", x=0.40, y=0.55, z=0.0))

    if gesture_type == "Pinch":
        # Thumb tip and index tip close together
        lm.append(LandmarkPoint(id=4, name="Thumb Tip", x=0.48, y=0.40, z=0.0))
        # 5-8: Index
        lm.append(LandmarkPoint(id=5, name="Index MCP", x=0.48, y=0.55, z=0.0))
        lm.append(LandmarkPoint(id=6, name="Index PIP", x=0.48, y=0.48, z=0.0))
        lm.append(LandmarkPoint(id=7, name="Index DIP", x=0.48, y=0.44, z=0.0))
        lm.append(LandmarkPoint(id=8, name="Index Tip", x=0.485, y=0.405, z=0.0))
    elif gesture_type == "Pointing":
        # Thumb curled
        lm.append(LandmarkPoint(id=4, name="Thumb Tip", x=0.42, y=0.55, z=0.0))
        # Index extended up
        lm.append(LandmarkPoint(id=5, name="Index MCP", x=0.48, y=0.55, z=0.0))
        lm.append(LandmarkPoint(id=6, name="Index PIP", x=0.48, y=0.45, z=0.0))
        lm.append(LandmarkPoint(id=7, name="Index DIP", x=0.48, y=0.35, z=0.0))
        lm.append(LandmarkPoint(id=8, name="Index Tip", x=0.48, y=0.25, z=0.0))
    elif gesture_type == "Open Palm":
        # Thumb extended out
        lm.append(LandmarkPoint(id=4, name="Thumb Tip", x=0.35, y=0.48, z=0.0))
        # Index extended
        lm.append(LandmarkPoint(id=5, name="Index MCP", x=0.46, y=0.55, z=0.0))
        lm.append(LandmarkPoint(id=6, name="Index PIP", x=0.46, y=0.45, z=0.0))
        lm.append(LandmarkPoint(id=7, name="Index DIP", x=0.46, y=0.35, z=0.0))
        lm.append(LandmarkPoint(id=8, name="Index Tip", x=0.46, y=0.25, z=0.0))
    else:
        # Default resting/curled
        lm.append(LandmarkPoint(id=4, name="Thumb Tip", x=0.45, y=0.60, z=0.0))
        lm.append(LandmarkPoint(id=5, name="Index MCP", x=0.48, y=0.60, z=0.0))
        lm.append(LandmarkPoint(id=6, name="Index PIP", x=0.48, y=0.62, z=0.0))
        lm.append(LandmarkPoint(id=7, name="Index DIP", x=0.48, y=0.64, z=0.0))
        lm.append(LandmarkPoint(id=8, name="Index Tip", x=0.48, y=0.66, z=0.0))

    # Middle 9-12
    if gesture_type == "Open Palm":
        lm.append(LandmarkPoint(id=9, name="Middle MCP", x=0.52, y=0.55, z=0.0))
        lm.append(LandmarkPoint(id=10, name="Middle PIP", x=0.52, y=0.43, z=0.0))
        lm.append(LandmarkPoint(id=11, name="Middle DIP", x=0.52, y=0.33, z=0.0))
        lm.append(LandmarkPoint(id=12, name="Middle Tip", x=0.52, y=0.23, z=0.0))
    else:  # Curled
        lm.append(LandmarkPoint(id=9, name="Middle MCP", x=0.52, y=0.55, z=0.0))
        lm.append(LandmarkPoint(id=10, name="Middle PIP", x=0.52, y=0.60, z=0.0))
        lm.append(LandmarkPoint(id=11, name="Middle DIP", x=0.52, y=0.64, z=0.0))
        lm.append(LandmarkPoint(id=12, name="Middle Tip", x=0.52, y=0.68, z=0.0))

    # Ring 13-16
    if gesture_type == "Open Palm":
        lm.append(LandmarkPoint(id=13, name="Ring MCP", x=0.56, y=0.56, z=0.0))
        lm.append(LandmarkPoint(id=14, name="Ring PIP", x=0.56, y=0.46, z=0.0))
        lm.append(LandmarkPoint(id=15, name="Ring DIP", x=0.56, y=0.36, z=0.0))
        lm.append(LandmarkPoint(id=16, name="Ring Tip", x=0.56, y=0.26, z=0.0))
    else:  # Curled
        lm.append(LandmarkPoint(id=13, name="Ring MCP", x=0.56, y=0.56, z=0.0))
        lm.append(LandmarkPoint(id=14, name="Ring PIP", x=0.56, y=0.61, z=0.0))
        lm.append(LandmarkPoint(id=15, name="Ring DIP", x=0.56, y=0.65, z=0.0))
        lm.append(LandmarkPoint(id=16, name="Ring Tip", x=0.56, y=0.69, z=0.0))

    # Pinky 17-20
    if gesture_type == "Open Palm":
        lm.append(LandmarkPoint(id=17, name="Pinky MCP", x=0.60, y=0.58, z=0.0))
        lm.append(LandmarkPoint(id=18, name="Pinky PIP", x=0.60, y=0.49, z=0.0))
        lm.append(LandmarkPoint(id=19, name="Pinky DIP", x=0.60, y=0.40, z=0.0))
        lm.append(LandmarkPoint(id=20, name="Pinky Tip", x=0.60, y=0.31, z=0.0))
    else:  # Curled
        lm.append(LandmarkPoint(id=17, name="Pinky MCP", x=0.60, y=0.58, z=0.0))
        lm.append(LandmarkPoint(id=18, name="Pinky PIP", x=0.60, y=0.62, z=0.0))
        lm.append(LandmarkPoint(id=19, name="Pinky DIP", x=0.60, y=0.66, z=0.0))
        lm.append(LandmarkPoint(id=20, name="Pinky Tip", x=0.60, y=0.70, z=0.0))

    return lm


def run_tests():
    print("[TEST] Running MediaPipe and Gesture Detection Test Suite...")

    # 1. Test Geometric Gesture Classification
    print("\n--- 1. Testing Geometric Gesture Detector ---")
    
    # Test Pinch
    pinch_hand = HandDetectionResult(landmarks=generate_mock_landmarks("Pinch"), handedness="Right")
    pinch_res = gesture_detector.classify_gesture(pinch_hand)
    print(f"Pinch Detection Result: {pinch_res.gesture.value} (conf: {pinch_res.confidence})")
    assert pinch_res.gesture == GestureType.PINCH

    # Test Pointing
    point_hand = HandDetectionResult(landmarks=generate_mock_landmarks("Pointing"), handedness="Right")
    point_res = gesture_detector.classify_gesture(point_hand)
    print(f"Pointing Detection Result: {point_res.gesture.value} (conf: {point_res.confidence})")
    assert point_res.gesture == GestureType.POINTING

    # Test Open Palm
    palm_hand = HandDetectionResult(landmarks=generate_mock_landmarks("Open Palm"), handedness="Right")
    palm_res = gesture_detector.classify_gesture(palm_hand)
    print(f"Open Palm Detection Result: {palm_res.gesture.value} (conf: {palm_res.confidence})")
    assert palm_res.gesture == GestureType.OPEN_PALM

    # 2. Test Frame Processor with synthetic image
    print("\n--- 2. Testing Frame Processor with Base64 Image ---")
    # Generate test image
    img = np.zeros((360, 480, 3), dtype=np.uint8)
    cv2.circle(img, (240, 180), 50, (255, 255, 255), -1)
    _, buf = cv2.imencode(".jpg", img)
    b64_str = "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

    req = FrameProcessRequest(image=b64_str, session_id="test_sess", preferred_hand="right")
    resp = frame_processor.process_frame(req)
    print(f"FrameProcessor Result: success={resp.success}, latency={resp.processing_time_ms}ms, hands={resp.hands_detected}")
    assert resp.success is True

    # 3. Test FastAPI Tracking Endpoints
    print("\n--- 3. Testing FastAPI Tracking Endpoints ---")
    client = TestClient(app)

    status_res = client.get("/api/v1/tracking/status")
    print(f"GET /api/v1/tracking/status: {status_res.status_code}, data: {status_res.json()}")
    assert status_res.status_code == 200
    assert status_res.json()["model_loaded"] is True

    post_res = client.post("/api/v1/tracking/process-frame", json=req.model_dump())
    print(f"POST /api/v1/tracking/process-frame: {post_res.status_code}, latency: {post_res.json()['processing_time_ms']}ms")
    assert post_res.status_code == 200
    assert post_res.json()["success"] is True

    print("\n[SUCCESS] ALL MEDIAPIPE AND TRACKING TESTS PASSED PERFECTLY!")
    return True



if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
