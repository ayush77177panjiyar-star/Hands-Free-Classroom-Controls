import os
import sys
import tempfile
import threading
import urllib.request
from typing import List, Dict, Any, Optional
import numpy as np

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
    "Pinky MCP", "Pinky PIP", "Pinky DIP", "Pinky Tip",
]

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"


class MediaPipeService:
    _instance = None
    _singleton_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = super(MediaPipeService, cls).__new__(cls)
                    cls._instance._init_state()
        return cls._instance

    def _init_state(self):
        """Initializes empty state without loading ML models or heavy native packages."""
        self.landmarker = None
        self.detect_lock = threading.Lock()
        self._init_lock = threading.Lock()
        self._is_initialized = False
        self._init_error: Optional[str] = None
        self.model_path: Optional[str] = None

    def is_ready(self) -> bool:
        """Returns True only if the landmarker is actively loaded in memory."""
        return self._is_initialized and self.landmarker is not None

    def _resolve_model_path(self) -> str:
        """Locates the bundled hand_landmarker.task model, or downloads to temp dir if missing."""
        # 1. Custom environment variable override
        env_path = os.environ.get("HAND_LANDMARKER_MODEL_PATH")
        if env_path and os.path.exists(env_path) and os.path.getsize(env_path) > 1000000:
            return env_path

        # 2. Check bundled path relative to this file
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        bundled_path = os.path.join(base_dir, "models", "hand_landmarker.task")
        if os.path.exists(bundled_path) and os.path.getsize(bundled_path) > 1000000:
            return bundled_path

        # 3. Check relative to current working directory
        cwd_path = os.path.join(os.getcwd(), "backend", "app", "models", "hand_landmarker.task")
        if os.path.exists(cwd_path) and os.path.getsize(cwd_path) > 1000000:
            return cwd_path

        # 4. Check writable temp directory fallback (essential for Vercel /tmp directory)
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, "hand_landmarker.task")
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 1000000:
            return temp_path

        # 5. Download model to writable temp directory if missing
        print(f"[INFO] Hand landmarker model not found locally; downloading to {temp_path}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, temp_path)
            print(f"[INFO] Downloaded model successfully: {os.path.getsize(temp_path)} bytes.")
            return temp_path
        except Exception as e:
            raise RuntimeError(f"Failed to download hand landmark model: {str(e)}")

    def ensure_initialized(self) -> bool:
        """
        Thread-safe lazy initialization.
        Loads MediaPipe Tasks HandLandmarker only when a frame detection request occurs.
        """
        if self._is_initialized:
            return self.landmarker is not None

        with self._init_lock:
            if self._is_initialized:
                return self.landmarker is not None

            try:
                # Lazy imports to keep FastAPI cold-start instantaneous
                from mediapipe.tasks.python import BaseOptions
                from mediapipe.tasks.python.vision import (
                    HandLandmarker,
                    HandLandmarkerOptions,
                    RunningMode,
                )

                self.model_path = self._resolve_model_path()
                options = HandLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=self.model_path),
                    running_mode=RunningMode.IMAGE,
                    num_hands=2,
                    min_hand_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                )
                self.landmarker = HandLandmarker.create_from_options(options)
                self._is_initialized = True
                self._init_error = None
                print("[INFO] MediaPipe HandLandmarker lazily initialized successfully.")
                return True
            except Exception as e:
                self._init_error = str(e)
                self._is_initialized = True
                self.landmarker = None
                print(f"[ERROR] Failed to initialize MediaPipe HandLandmarker: {e}")
                return False

    def detect_hands(self, rgb_image: np.ndarray) -> List[HandDetectionResult]:
        """
        Takes RGB uint8 numpy image and returns detected hands with 21 normalized landmarks.
        Triggers lazy initialization on first call.
        """
        if not self.ensure_initialized():
            raise RuntimeError(f"MediaPipe HandLandmarker unavailable: {self._init_error}")

        import mediapipe as mp
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)

        with self.detect_lock:
            result = self.landmarker.detect(mp_image)

        detections: List[HandDetectionResult] = []
        if not result.hand_landmarks:
            return detections

        for i, raw_landmarks in enumerate(result.hand_landmarks):
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


# Singleton instance - instantiation takes <1ms and performs zero model loading
mediapipe_service = MediaPipeService()
