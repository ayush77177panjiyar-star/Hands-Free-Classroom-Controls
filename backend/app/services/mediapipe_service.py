import os
import threading
import urllib.request
from typing import List, Dict, Any, Optional
import numpy as np

import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    HandLandmarker,
    HandLandmarkerOptions,
    RunningMode,
)
from backend.app.schemas.tracking import (
    LandmarkPoint,
    BoundingBoxNormalized,
    HandDetectionResult,
)

LANDMARK_NAMES = [
    "Wrist",
    "Thumb CMC", "Thumb MCP", "Thumb IP", "Thumb Tip",
    "Index MCP", "Index PIP", "Index DIP", "Index Tip",
    "Middle MCP", "Middle PIP", "Middle DIP", "Middle Tip",
    "Ring MCP", "Ring PIP", "Ring DIP", "Ring Tip",
    "Pinky MCP", "Pinky PIP", "Pinky DIP", "Pinky Tip"
]

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"


class MediaPipeService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(MediaPipeService, cls).__new__(cls)
                    cls._instance._init_landmarker()
        return cls._instance

    def _init_landmarker(self):
        # Locate or download hand_landmarker.task
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        models_dir = os.path.join(base_dir, "models")
        os.makedirs(models_dir, exist_ok=True)
        self.model_path = os.path.join(models_dir, "hand_landmarker.task")

        if not os.path.exists(self.model_path) or os.path.getsize(self.model_path) < 1000000:
            print(f"[INFO] Downloading MediaPipe hand landmarker model from {MODEL_URL}...")
            urllib.request.urlretrieve(MODEL_URL, self.model_path)
            print(f"[INFO] Model downloaded successfully ({os.path.getsize(self.model_path)} bytes).")

        options = HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=self.model_path),
            running_mode=RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.landmarker = HandLandmarker.create_from_options(options)
        self.detect_lock = threading.Lock()
        print("[INFO] MediaPipe HandLandmarker initialized and ready.")


    def detect_hands(self, rgb_image: np.ndarray) -> List[HandDetectionResult]:
        """
        Takes RGB uint8 numpy image and returns detected hands with 21 normalized landmarks.
        """
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
        with self.detect_lock:
            result = self.landmarker.detect(mp_image)

        detections: List[HandDetectionResult] = []

        if not result.hand_landmarks:
            return detections

        for i, raw_landmarks in enumerate(result.hand_landmarks):
            # Resolve handedness
            handedness_label = "Right"
            confidence = 0.90
            if result.handedness and i < len(result.handedness) and result.handedness[i]:
                category = result.handedness[i][0]
                handedness_label = category.category_name
                confidence = float(category.score)

            landmarks_list: List[LandmarkPoint] = []
            x_coords, y_coords = [], []

            for idx, lm in enumerate(raw_landmarks):
                name = LANDMARK_NAMES[idx] if idx < len(LANDMARK_NAMES) else f"Point_{idx}"
                landmarks_list.append(
                    LandmarkPoint(
                        id=idx,
                        name=name,
                        x=round(float(lm.x), 5),
                        y=round(float(lm.y), 5),
                        z=round(float(lm.z), 5),
                        visibility=round(float(getattr(lm, "visibility", 1.0) or 1.0), 3),
                        presence=round(float(getattr(lm, "presence", 1.0) or 1.0), 3),
                    )
                )
                x_coords.append(lm.x)
                y_coords.append(lm.y)

            # Bounding Box
            x_min = max(0.0, min(x_coords) - 0.04)
            y_min = max(0.0, min(y_coords) - 0.04)
            x_max = min(1.0, max(x_coords) + 0.04)
            y_max = min(1.0, max(y_coords) + 0.04)

            bbox = BoundingBoxNormalized(
                x_min=round(x_min, 4),
                y_min=round(y_min, 4),
                x_max=round(x_max, 4),
                y_max=round(y_max, 4),
            )

            detections.append(
                HandDetectionResult(
                    hand_index=i,
                    handedness=handedness_label,
                    confidence=round(confidence, 3),
                    landmarks=landmarks_list,
                    bounding_box=bbox,
                )
            )

        return detections


mediapipe_service = MediaPipeService()
