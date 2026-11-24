from typing import Dict, Any, Optional
from backend.app.schemas.gesture import (
    GestureType,
    ClassroomCommandType,
)


class CommandExecutor:
    def __init__(self):
        # Tracking dragging state per student
        self.drag_state: Dict[str, Dict[str, Any]] = {}

    def map_gesture_to_command(
        self,
        gesture: GestureType,
        is_intent_confirmed: bool,
        duration_ms: float,
        displacement: float,
        student_id: str = "student_a",
        is_paused: bool = False,
    ) -> ClassroomCommandType:
        """
        Translates confirmed gestures into high-level classroom commands with drag discrimination.
        """
        if not is_intent_confirmed:
            if gesture == GestureType.POINTING and not is_paused:
                return ClassroomCommandType.CURSOR_MOVE
            return ClassroomCommandType.NONE

        student_drag = self.drag_state.get(student_id, {"is_dragging": False, "start_time": 0})

        # 1. Open Palm -> Pause / Resume Toggle
        if gesture == GestureType.OPEN_PALM:
            if duration_ms >= 500:
                return ClassroomCommandType.RESUME_CONTROLS if is_paused else ClassroomCommandType.PAUSE_CONTROLS
            return ClassroomCommandType.NONE

        # If system is currently paused, ignore navigation and selection
        if is_paused:
            return ClassroomCommandType.NONE

        # 2. Swipe Navigation
        if gesture == GestureType.SWIPE_RIGHT:
            return ClassroomCommandType.NAVIGATE_NEXT
        elif gesture == GestureType.SWIPE_LEFT:
            return ClassroomCommandType.NAVIGATE_PREVIOUS

        # 3. Pinch vs. Drag & Drop Discrimination
        if gesture == GestureType.PINCH:
            # If moving significantly while pinching -> Drag mode
            if displacement > 0.045:
                if not student_drag["is_dragging"]:
                    self.drag_state[student_id] = {"is_dragging": True, "start_time": duration_ms}
                    return ClassroomCommandType.DRAG_START
                return ClassroomCommandType.DRAG_MOVE
            else:
                # Stationary pinch -> Select Answer
                return ClassroomCommandType.SELECT_ANSWER

        # 4. Check Drag Drop Release when pinch ends
        if student_drag.get("is_dragging", False) and gesture != GestureType.PINCH:
            self.drag_state[student_id] = {"is_dragging": False, "start_time": 0}
            return ClassroomCommandType.DRAG_DROP

        # 5. Pointing Cursor
        if gesture == GestureType.POINTING:
            return ClassroomCommandType.CURSOR_MOVE

        return ClassroomCommandType.NONE


command_executor = CommandExecutor()
