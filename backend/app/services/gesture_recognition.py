from typing import List, Dict, Tuple, Optional, Any
from backend.app.schemas.tracking import LandmarkPoint, HandDetectionResult
from backend.app.schemas.gesture import GestureType, GestureClassification, FingerState
from backend.app.schemas.calibration import AdaptiveThresholds
from backend.app.utils.movement import (
    euclidean_dist_3d,
    calculate_angle_3points,
    euclidean_dist_2d,
)


class GestureRecognizer:
    def __init__(self):
        pass

    def evaluate_hand_landmarks(
        self,
        hand: HandDetectionResult,
        thresholds: AdaptiveThresholds,
        movement_data: Dict[str, Any],
    ) -> GestureClassification:
        lm = hand.landmarks
        if len(lm) < 21:
            return GestureClassification(gesture=GestureType.UNKNOWN, confidence=0.0)

        wrist = lm[0]
        # Reference anatomical hand scale (distance from wrist 0 to middle MCP 9)
        hand_scale = euclidean_dist_3d(
            (wrist.x, wrist.y, wrist.z),
            (lm[9].x, lm[9].y, lm[9].z)
        ) + 1e-6

        # Pinch distance between thumb tip (4) and index tip (8)
        pinch_dist = euclidean_dist_3d(
            (lm[4].x, lm[4].y, lm[4].z),
            (lm[8].x, lm[8].y, lm[8].z)
        )
        normalized_pinch = pinch_dist / hand_scale

        # Finger extension states based on joint positions & distances
        # Thumb: Tip 4 vs MCP 2 and Pinky MCP 17
        dist_thumb_pinky = euclidean_dist_2d((lm[4].x, lm[4].y), (lm[17].x, lm[17].y))
        dist_ip_pinky = euclidean_dist_2d((lm[3].x, lm[3].y), (lm[17].x, lm[17].y))
        thumb_extended = dist_thumb_pinky > dist_ip_pinky

        # Index: Tip 8 vs PIP 6 from wrist
        index_extended = euclidean_dist_3d((lm[8].x, lm[8].y, lm[8].z), (wrist.x, wrist.y, wrist.z)) > (
            euclidean_dist_3d((lm[6].x, lm[6].y, lm[6].z), (wrist.x, wrist.y, wrist.z)) * 1.05
        )

        # Middle: Tip 12 vs PIP 10
        middle_extended = euclidean_dist_3d((lm[12].x, lm[12].y, lm[12].z), (wrist.x, wrist.y, wrist.z)) > (
            euclidean_dist_3d((lm[10].x, lm[10].y, lm[10].z), (wrist.x, wrist.y, wrist.z)) * 1.05
        )

        # Ring: Tip 16 vs PIP 14
        ring_extended = euclidean_dist_3d((lm[16].x, lm[16].y, lm[16].z), (wrist.x, wrist.y, wrist.z)) > (
            euclidean_dist_3d((lm[14].x, lm[14].y, lm[14].z), (wrist.x, wrist.y, wrist.z)) * 1.05
        )

        # Pinky: Tip 20 vs PIP 18
        pinky_extended = euclidean_dist_3d((lm[20].x, lm[20].y, lm[20].z), (wrist.x, wrist.y, wrist.z)) > (
            euclidean_dist_3d((lm[18].x, lm[18].y, lm[18].z), (wrist.x, wrist.y, wrist.z)) * 1.05
        )

        finger_states = [
            FingerState(name="Thumb", is_extended=thumb_extended, tip_to_mcp_dist=0.0, tip_to_wrist_dist=0.0),
            FingerState(name="Index", is_extended=index_extended, tip_to_mcp_dist=0.0, tip_to_wrist_dist=0.0),
            FingerState(name="Middle", is_extended=middle_extended, tip_to_mcp_dist=0.0, tip_to_wrist_dist=0.0),
            FingerState(name="Ring", is_extended=ring_extended, tip_to_mcp_dist=0.0, tip_to_wrist_dist=0.0),
            FingerState(name="Pinky", is_extended=pinky_extended, tip_to_mcp_dist=0.0, tip_to_wrist_dist=0.0),
        ]

        # 1. Swipe Check: High horizontal velocity with sufficient lateral displacement
        vx = movement_data.get("velocity_x", 0.0)
        dx = movement_data.get("dx", 0.0)
        min_vel = thresholds.swipe_min_velocity
        min_disp = thresholds.swipe_min_displacement

        if abs(dx) >= min_disp and abs(vx) >= min_vel and movement_data.get("direction") in ["LEFT", "RIGHT"]:
            swipe_type = GestureType.SWIPE_RIGHT if dx > 0 else GestureType.SWIPE_LEFT
            return GestureClassification(
                gesture=swipe_type,
                confidence=0.95,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description=f"Deliberate {swipe_type.value} motion (vx={vx:.2f}, dx={dx:.2f})",
            )

        # 2. Resting Check: Hand placed in resting zone or micro-fidgeting
        if movement_data.get("is_resting_motion", False):
            return GestureClassification(
                gesture=GestureType.RESTING,
                confidence=0.92,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description="Hand in resting position or idle micro-jitter",
            )

        # 3. Pinch Check: Personal adaptive pinch closure threshold
        is_pinch = (pinch_dist <= thresholds.pinch_threshold) or (normalized_pinch <= 0.28)
        if is_pinch:
            conf = min(0.99, max(0.85, 1.0 - (pinch_dist / (thresholds.pinch_threshold + 1e-5)) * 0.15))
            return GestureClassification(
                gesture=GestureType.PINCH,
                confidence=round(conf, 3),
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description=f"Pinch closed: dist={pinch_dist:.4f} <= threshold={thresholds.pinch_threshold:.4f}",
            )

        # 4. Open Palm Check: All 5 fingers extended facing forward
        if index_extended and middle_extended and ring_extended and pinky_extended and (thumb_extended or dist_thumb_pinky > 0.18):
            return GestureClassification(
                gesture=GestureType.OPEN_PALM,
                confidence=0.96,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description="Open palm with all fingers fully extended",
            )

        # 5. Pointing Check: Index extended, other 3 fingers curled
        if index_extended and not middle_extended and not ring_extended and not pinky_extended:
            return GestureClassification(
                gesture=GestureType.POINTING,
                confidence=0.97,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description="Index finger pointing extended",
            )

        # 6. Peace Sign Check: Index and Middle extended, Ring and Pinky curled
        if index_extended and middle_extended and not ring_extended and not pinky_extended:
            return GestureClassification(
                gesture=GestureType.PEACE,
                confidence=0.93,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description="Peace sign (Index and Middle extended)",
            )

        # 7. Fist Check: All fingers curled
        if not index_extended and not middle_extended and not ring_extended and not pinky_extended:
            return GestureClassification(
                gesture=GestureType.FIST,
                confidence=0.90,
                finger_states=finger_states,
                pinch_distance=round(pinch_dist, 4),
                velocity_x=round(vx, 3),
                velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
                description="Fist (All fingers curled)",
            )

        # Fallback default: Resting
        return GestureClassification(
            gesture=GestureType.RESTING,
            confidence=0.75,
            finger_states=finger_states,
            pinch_distance=round(pinch_dist, 4),
            velocity_x=round(vx, 3),
            velocity_y=round(movement_data.get("velocity_y", 0.0), 3),
            description="Neutral unclassified hand posture",
        )


gesture_recognizer = GestureRecognizer()
