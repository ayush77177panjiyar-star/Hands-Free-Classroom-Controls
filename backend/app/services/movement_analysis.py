import time
from collections import deque
from typing import Dict, List, Tuple, Optional, Any
from backend.app.schemas.tracking import LandmarkPoint, HandDetectionResult
from backend.app.schemas.calibration import AdaptiveThresholds
from backend.app.utils.movement import (
    compute_velocity,
    compute_jitter_variance,
    classify_dominant_direction,
    euclidean_dist_2d,
)


class TrajectoryBuffer:
    def __init__(self, max_len: int = 15):
        # Rolling deque of tuples: (x, y, timestamp_ms)
        self.buffer = deque(maxlen=max_len)

    def append(self, x: float, y: float, timestamp_ms: int):
        self.buffer.append((x, y, timestamp_ms))

    def clear(self):
        self.buffer.clear()

    def get_points(self) -> List[Tuple[float, float]]:
        return [(p[0], p[1]) for p in self.buffer]

    def get_displacement_and_velocity(self) -> Tuple[float, float, float, float]:
        """
        Returns (dx, dy, velocity_x, velocity_y) over the buffer span.
        """
        if len(self.buffer) < 2:
            return 0.0, 0.0, 0.0, 0.0

        oldest = self.buffer[0]
        newest = self.buffer[-1]
        dt = (newest[2] - oldest[2]) / 1000.0  # seconds

        dx = newest[0] - oldest[0]
        dy = newest[1] - oldest[1]

        if dt <= 0.001:
            return dx, dy, 0.0, 0.0

        vx = dx / dt
        vy = dy / dt
        return dx, dy, vx, vy


class MovementAnalyzer:
    def __init__(self):
        # Buffer keyed by f"{student_id}_{handedness}"
        self.buffers: Dict[str, TrajectoryBuffer] = {}

    def _get_buffer(self, key: str) -> TrajectoryBuffer:
        if key not in self.buffers:
            self.buffers[key] = TrajectoryBuffer(max_len=12)
        return self.buffers[key]

    def analyze_movement(
        self,
        hand: HandDetectionResult,
        thresholds: AdaptiveThresholds,
        student_id: str = "student_a",
        timestamp_ms: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Analyzes live hand movement dynamics, spatial jitter, direction, and velocity against adaptive student thresholds.
        """
        now = timestamp_ms or int(time.time() * 1000)
        handedness = hand.handedness if hand.handedness in ["Right", "Left"] else "Right"
        key = f"{student_id}_{handedness}"
        buf = self._get_buffer(key)

        lm = hand.landmarks
        if len(lm) < 21:
            return {
                "speed": 0.0,
                "velocity_x": 0.0,
                "velocity_y": 0.0,
                "displacement": 0.0,
                "direction": "NEUTRAL",
                "jitter_variance": 0.0,
                "is_resting_motion": True,
                "is_intentional": False,
            }

        # Palm center reference point
        palm_center_x = (lm[0].x + lm[5].x + lm[17].x) / 3.0
        palm_center_y = (lm[0].y + lm[5].y + lm[17].y) / 3.0

        buf.append(palm_center_x, palm_center_y, now)
        points = buf.get_points()
        dx, dy, vx, vy = buf.get_displacement_and_velocity()
        displacement = euclidean_dist_2d((points[0][0], points[0][1]), (palm_center_x, palm_center_y)) if points else 0.0
        speed = (vx ** 2 + vy ** 2) ** 0.5

        # Spatial jitter variance across recent frames
        jitter_var = compute_jitter_variance(points)
        direction = classify_dominant_direction(dx, dy, min_dist=thresholds.movement_deadzone)

        # Distinguish natural resting twitch vs deliberate movement
        # 1. Below resting jitter baseline: natural hand oscillation / micro-fidgeting
        is_resting_jitter = jitter_var <= thresholds.resting_jitter_threshold

        # 2. Movement within deadzone radius: small accidental drift
        is_within_deadzone = displacement <= thresholds.movement_deadzone

        # 3. Hand located in resting boundary zone
        rz = thresholds.resting_zone
        is_in_resting_boundary = (
            palm_center_x < rz.x_min or
            palm_center_x > rz.x_max or
            palm_center_y < rz.y_min or
            palm_center_y > rz.y_max or
            lm[0].y > 0.80  # wrist resting on table/lap
        )

        is_resting_motion = is_resting_jitter or is_within_deadzone or is_in_resting_boundary
        is_intentional = not is_resting_motion and (displacement > thresholds.movement_deadzone * 1.5)

        return {
            "speed": round(speed, 3),
            "velocity_x": round(vx, 3),
            "velocity_y": round(vy, 3),
            "dx": round(dx, 4),
            "dy": round(dy, 4),
            "displacement": round(displacement, 4),
            "direction": direction,
            "jitter_variance": round(jitter_var, 6),
            "is_resting_motion": is_resting_motion,
            "is_resting_jitter": is_resting_jitter,
            "is_within_deadzone": is_within_deadzone,
            "is_in_resting_boundary": is_in_resting_boundary,
            "is_intentional": is_intentional,
        }

    def clear_history(self, student_id: str):
        for k in list(self.buffers.keys()):
            if k.startswith(student_id):
                self.buffers[k].clear()


movement_analyzer = MovementAnalyzer()
