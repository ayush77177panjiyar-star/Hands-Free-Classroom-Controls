import math
import time
from collections import deque
from typing import List, Dict, Tuple, Optional
from backend.app.schemas.tracking import LandmarkPoint, HandDetectionResult
from backend.app.schemas.gesture import GestureType, GestureClassification, FingerState


class GestureDetector:
    def __init__(self, history_len: int = 10):
        # Rolling history buffer per hand side: deque of (x, y, timestamp)
        self.history: Dict[str, deque] = {
            "Right": deque(maxlen=history_len),
            "Left": deque(maxlen=history_len),
        }
        self.last_swipe_time: Dict[str, float] = {
            "Right": 0.0,
            "Left": 0.0,
        }

    @staticmethod
    def _dist(p1: LandmarkPoint, p2: LandmarkPoint) -> float:
        return math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2)

    def _get_finger_states(self, lm: List[LandmarkPoint]) -> List[FingerState]:
        wrist = lm[0]
        # Hand scale reference: distance from wrist (0) to middle MCP (9)
        hand_scale = self._dist(wrist, lm[9]) + 1e-6

        # Thumb: Tip 4, IP 3, MCP 2, compared to Pinky MCP 17
        thumb_tip = lm[4]
        thumb_ip = lm[3]
        pinky_mcp = lm[17]
        thumb_extended = self._dist(thumb_tip, pinky_mcp) > self._dist(thumb_ip, pinky_mcp)

        # Index: Tip 8, PIP 6, MCP 5
        index_extended = self._dist(lm[8], wrist) > (self._dist(lm[6], wrist) * 1.05)

        # Middle: Tip 12, PIP 10, MCP 9
        middle_extended = self._dist(lm[12], wrist) > (self._dist(lm[10], wrist) * 1.05)

        # Ring: Tip 16, PIP 14, MCP 13
        ring_extended = self._dist(lm[16], wrist) > (self._dist(lm[14], wrist) * 1.05)

        # Pinky: Tip 20, PIP 18, MCP 17
        pinky_extended = self._dist(lm[20], wrist) > (self._dist(lm[18], wrist) * 1.05)

        states = [
            FingerState(
                name="Thumb",
                is_extended=thumb_extended,
                tip_to_mcp_dist=round(self._dist(thumb_tip, lm[2]) / hand_scale, 3),
                tip_to_wrist_dist=round(self._dist(thumb_tip, wrist) / hand_scale, 3),
            ),
            FingerState(
                name="Index",
                is_extended=index_extended,
                tip_to_mcp_dist=round(self._dist(lm[8], lm[5]) / hand_scale, 3),
                tip_to_wrist_dist=round(self._dist(lm[8], wrist) / hand_scale, 3),
            ),
            FingerState(
                name="Middle",
                is_extended=middle_extended,
                tip_to_mcp_dist=round(self._dist(lm[12], lm[9]) / hand_scale, 3),
                tip_to_wrist_dist=round(self._dist(lm[12], wrist) / hand_scale, 3),
            ),
            FingerState(
                name="Ring",
                is_extended=ring_extended,
                tip_to_mcp_dist=round(self._dist(lm[16], lm[13]) / hand_scale, 3),
                tip_to_wrist_dist=round(self._dist(lm[16], wrist) / hand_scale, 3),
            ),
            FingerState(
                name="Pinky",
                is_extended=pinky_extended,
                tip_to_mcp_dist=round(self._dist(lm[20], lm[17]) / hand_scale, 3),
                tip_to_wrist_dist=round(self._dist(lm[20], wrist) / hand_scale, 3),
            ),
        ]
        return states

    def classify_gesture(
        self,
        hand: HandDetectionResult,
        timestamp_ms: Optional[int] = None,
        resting_zone: Optional[Dict[str, float]] = None,
    ) -> GestureClassification:
        lm = hand.landmarks
        if len(lm) < 21:
            return GestureClassification(gesture=GestureType.UNKNOWN, confidence=0.0)

        now = timestamp_ms if timestamp_ms else (time.time() * 1000)
        handedness = hand.handedness if hand.handedness in ["Right", "Left"] else "Right"
        wrist = lm[0]
        palm_center_x = (lm[0].x + lm[5].x + lm[17].x) / 3.0
        palm_center_y = (lm[0].y + lm[5].y + lm[17].y) / 3.0

        # Update motion trajectory history
        q = self.history[handedness]
        q.append((palm_center_x, palm_center_y, now))

        # Check swipe velocity across history
        velocity_x, velocity_y = 0.0, 0.0
        swipe_detected = None
        if len(q) >= 4:
            oldest_x, oldest_y, oldest_t = q[0]
            dt = (now - oldest_t) / 1000.0  # seconds
            if dt > 0.05 and dt < 0.6:  # within 50ms - 600ms window
                dx = palm_center_x - oldest_x
                dy = palm_center_y - oldest_y
                velocity_x = dx / dt
                velocity_y = dy / dt

                # Swipe threshold: sufficient horizontal displacement and speed
                time_since_last_swipe = (now - self.last_swipe_time[handedness]) / 1000.0
                if abs(dx) > 0.15 and abs(dx) > 1.6 * abs(dy) and time_since_last_swipe > 0.8:
                    if dx > 0.15 and velocity_x > 0.4:
                        swipe_detected = GestureType.SWIPE_RIGHT
                        self.last_swipe_time[handedness] = now
                    elif dx < -0.15 and velocity_x < -0.4:
                        swipe_detected = GestureType.SWIPE_LEFT
                        self.last_swipe_time[handedness] = now

        finger_states = self._get_finger_states(lm)
        thumb_ext = finger_states[0].is_extended
        index_ext = finger_states[1].is_extended
        middle_ext = finger_states[2].is_extended
        ring_ext = finger_states[3].is_extended
        pinky_ext = finger_states[4].is_extended

        # Normalized pinch distance
        hand_scale = self._dist(wrist, lm[9]) + 1e-6
        pinch_dist_raw = self._dist(lm[4], lm[8])
        pinch_ratio = pinch_dist_raw / hand_scale

        # 1. Check Swipe (has dynamic priority if fresh swipe gesture occurred)
        if swipe_detected is not None:
            return GestureClassification(
                gesture=swipe_detected,
                confidence=0.94,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description=f"Horizontal hand swipe motion detected ({swipe_detected.value})",
            )

        # 2. Check Resting Hand
        # Resting zone check: if hand is low in frame or wrist is near the bottom
        is_resting = False
        if resting_zone:
            # Check if palm center is outside interaction area
            if (palm_center_x < resting_zone.get("x_min", 0.2) or
                palm_center_x > resting_zone.get("x_max", 0.8) or
                palm_center_y < resting_zone.get("y_min", 0.2) or
                palm_center_y > resting_zone.get("y_max", 0.8)):
                is_resting = True
        elif palm_center_y > 0.78 or wrist.y > 0.82:
            is_resting = True

        if is_resting:
            return GestureClassification(
                gesture=GestureType.RESTING,
                confidence=0.92,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="Hand placed in resting position outside interaction active zone",
            )

        # 3. Check Pinch Gesture
        # Thumb tip (4) and Index tip (8) touching or near
        if pinch_ratio < 0.28 or pinch_dist_raw < 0.055:
            conf = min(0.99, max(0.80, 1.0 - (pinch_ratio / 0.28) * 0.2))
            return GestureClassification(
                gesture=GestureType.PINCH,
                confidence=round(conf, 3),
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="Thumb and index tips touching firmly (Pinch Click)",
            )

        # 4. Check Open Palm (all 5 fingers extended)
        if index_ext and middle_ext and ring_ext and pinky_ext and (thumb_ext or self._dist(lm[4], lm[17]) > 0.2):
            return GestureClassification(
                gesture=GestureType.OPEN_PALM,
                confidence=0.96,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="Open palm with all fingers fully extended (Pause / Menu)",
            )

        # 5. Check Pointing Gesture (Index extended, middle/ring/pinky curled)
        if index_ext and not middle_ext and not ring_ext and not pinky_ext:
            return GestureClassification(
                gesture=GestureType.POINTING,
                confidence=0.97,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="Index finger extended while others curled (Cursor Pointing)",
            )

        # 6. Check Peace Sign
        if index_ext and middle_ext and not ring_ext and not pinky_ext:
            return GestureClassification(
                gesture=GestureType.PEACE,
                confidence=0.93,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="Two fingers extended (Peace Sign / Help Action)",
            )

        # 7. Check Fist
        if not index_ext and not middle_ext and not ring_ext and not pinky_ext:
            return GestureClassification(
                gesture=GestureType.FIST,
                confidence=0.90,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist_raw, 4),
                velocity_x=round(velocity_x, 2),
                velocity_y=round(velocity_y, 2),
                description="All fingers curled into fist (Mute / Stop Action)",
            )

        # Default fallback: General pointing or tracking
        default_gesture = GestureType.POINTING if index_ext else GestureType.RESTING
        return GestureClassification(
            gesture=default_gesture,
            confidence=0.80,
            finger_states=finger_states,
            pinch_distance=round(pinch_dist_raw, 4),
            velocity_x=round(velocity_x, 2),
            velocity_y=round(velocity_y, 2),
            description="Hand tracked in active position",
        )


gesture_detector = GestureDetector()
