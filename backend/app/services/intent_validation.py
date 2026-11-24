import time
from typing import Dict, Any, Optional, Tuple, List
from backend.app.schemas.gesture import (
    GestureType,
    ValidationState,
    ClassroomCommandType,
    RejectionReason,
    IntentValidationResult,
    GestureClassification,
)
from backend.app.schemas.calibration import AdaptiveThresholds
from backend.app.services.command_executor import command_executor


class StudentSessionState:
    def __init__(self, student_id: str):
        self.student_id = student_id
        self.current_state = ValidationState.IDLE
        self.candidate_gesture = GestureType.RESTING
        self.candidate_start_time = 0.0
        self.last_command_time = 0.0
        self.last_executed_command = ClassroomCommandType.NONE
        self.last_command_gesture = GestureType.RESTING
        self.is_paused = False
        self.neutral_achieved_since_last_cmd = True

        # Telemetry counts
        self.accepted_commands_count = 0
        self.rejected_commands_count = 0
        self.rejections_by_reason: Dict[str, int] = {
            r.value: 0 for r in RejectionReason
        }


class IntentValidator:
    def __init__(self):
        # Sessions keyed by student_id
        self.sessions: Dict[str, StudentSessionState] = {}

    def _get_session(self, student_id: str) -> StudentSessionState:
        if student_id not in self.sessions:
            self.sessions[student_id] = StudentSessionState(student_id)
        return self.sessions[student_id]

    def validate_intent(
        self,
        gesture_data: GestureClassification,
        movement_data: Dict[str, Any],
        thresholds: AdaptiveThresholds,
        student_id: str = "student_a",
        timestamp_ms: Optional[int] = None,
        cursor_coords: Optional[Dict[str, float]] = None,
    ) -> IntentValidationResult:
        now = (timestamp_ms or int(time.time() * 1000)) / 1000.0  # in seconds
        sess = self._get_session(student_id)
        raw_gesture = gesture_data.gesture
        conf = gesture_data.confidence
        min_duration_sec = thresholds.min_gesture_duration_ms / 1000.0
        cooldown_sec = thresholds.cooldown_duration_ms / 1000.0

        # Calculate remaining cooldown time
        time_since_last_cmd = now - sess.last_command_time
        cooldown_remaining_ms = max(0.0, (cooldown_sec - time_since_last_cmd) * 1000.0)

        # 1. Neutral Position Detection
        # When hand is resting or unextended, flag that neutral has been achieved
        if raw_gesture == GestureType.RESTING or movement_data.get("is_resting_motion", False):
            sess.neutral_achieved_since_last_cmd = True

        # 2. Check Cooldown Lockout (Debounce duplicate rapid triggers)
        in_cooldown = time_since_last_cmd < cooldown_sec
        if in_cooldown and raw_gesture in [GestureType.SWIPE_RIGHT, GestureType.SWIPE_LEFT, GestureType.PINCH]:
            sess.current_state = ValidationState.COOLDOWN
            sess.rejected_commands_count += 1
            sess.rejections_by_reason[RejectionReason.IN_COOLDOWN_PERIOD.value] += 1
            return IntentValidationResult(
                state=ValidationState.COOLDOWN,
                detected_gesture=raw_gesture,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.IN_COOLDOWN_PERIOD,
                confidence=conf,
                cooldown_remaining_ms=round(cooldown_remaining_ms, 1),
                cursor_position=cursor_coords,
                diagnostics={"reason": "Action locked during post-command cooldown"},
            )

        # 3. Check Repeat Prevention (e.g. continuous swipe or held pinch without return to neutral)
        if (
            not sess.neutral_achieved_since_last_cmd and
            raw_gesture == sess.last_command_gesture and
            raw_gesture in [GestureType.SWIPE_RIGHT, GestureType.SWIPE_LEFT]
        ):
            sess.current_state = ValidationState.RETURN_TO_NEUTRAL
            sess.rejected_commands_count += 1
            sess.rejections_by_reason[RejectionReason.REQUIRES_NEUTRAL_RETURN.value] += 1
            return IntentValidationResult(
                state=ValidationState.RETURN_TO_NEUTRAL,
                detected_gesture=raw_gesture,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.REQUIRES_NEUTRAL_RETURN,
                confidence=conf,
                cooldown_remaining_ms=0.0,
                cursor_position=cursor_coords,
                diagnostics={"reason": "Requires hand to reset to neutral before repeating swipe"},
            )

        # 4. Check Resting / Micro-Fidgeting Filter
        if movement_data.get("is_resting_motion", False) and raw_gesture != GestureType.PINCH:
            sess.current_state = ValidationState.IDLE
            sess.candidate_start_time = 0.0
            return IntentValidationResult(
                state=ValidationState.IDLE,
                detected_gesture=GestureType.RESTING,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.RESTING_MOVEMENT_FILTERED,
                confidence=conf,
                cooldown_remaining_ms=0.0,
                cursor_position=cursor_coords,
                diagnostics={"reason": "Natural resting twitch / fidgeting movement filtered"},
            )

        # 5. Check Erratic Spatial Jitter
        if movement_data.get("jitter_variance", 0.0) > thresholds.resting_jitter_threshold * 8.0:
            sess.current_state = ValidationState.IDLE
            sess.candidate_start_time = 0.0
            sess.rejected_commands_count += 1
            sess.rejections_by_reason[RejectionReason.ERRATIC_JITTER_DETECTED.value] += 1
            return IntentValidationResult(
                state=ValidationState.IDLE,
                detected_gesture=raw_gesture,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.ERRATIC_JITTER_DETECTED,
                confidence=conf,
                cooldown_remaining_ms=0.0,
                cursor_position=cursor_coords,
                diagnostics={"reason": "Unstable / erratic hand shaking detected"},
            )

        # 6. Candidate Gesture State Progression
        if sess.candidate_gesture != raw_gesture:
            # Gesture switched -> start fresh candidate timer
            sess.candidate_gesture = raw_gesture
            sess.candidate_start_time = now
            sess.current_state = ValidationState.GESTURE_CANDIDATE

        # Temporal duration holding this candidate gesture
        duration = now - sess.candidate_start_time
        duration_ms = duration * 1000.0

        # Confidence Validation check
        min_conf_threshold = 0.82
        if conf < min_conf_threshold:
            sess.current_state = ValidationState.GESTURE_CANDIDATE
            return IntentValidationResult(
                state=ValidationState.GESTURE_CANDIDATE,
                detected_gesture=raw_gesture,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.CONFIDENCE_TOO_LOW,
                confidence=conf,
                duration_ms=round(duration_ms, 1),
                cursor_position=cursor_coords,
                diagnostics={"reason": f"Confidence {conf:.2f} below required {min_conf_threshold:.2f}"},
            )

        # Swipes execute dynamically once displacement and velocity thresholds are verified
        is_swipe = raw_gesture in [GestureType.SWIPE_RIGHT, GestureType.SWIPE_LEFT]
        effective_min_duration = 0.04 if is_swipe else min_duration_sec

        # Stability Validation check: has gesture been held long enough?
        if duration < effective_min_duration:
            sess.current_state = ValidationState.STABILITY_VALIDATION
            return IntentValidationResult(
                state=ValidationState.STABILITY_VALIDATION,
                detected_gesture=raw_gesture,
                validated_command=ClassroomCommandType.NONE,
                is_accepted=False,
                rejection_reason=RejectionReason.BELOW_MIN_DURATION,
                confidence=conf,
                duration_ms=round(duration_ms, 1),
                cursor_position=cursor_coords,
                diagnostics={"progress_pct": min(100, int((duration / effective_min_duration) * 100))},
            )

        # 7. Intent Confirmed -> Map to Command
        sess.current_state = ValidationState.INTENT_CONFIRMED
        command = command_executor.map_gesture_to_command(
            gesture=raw_gesture,
            is_intent_confirmed=True,
            duration_ms=duration_ms,
            displacement=movement_data.get("displacement", 0.0),
            student_id=student_id,
            is_paused=sess.is_paused,
        )

        # Handle pause toggle
        if command == ClassroomCommandType.PAUSE_CONTROLS:
            sess.is_paused = True
        elif command == ClassroomCommandType.RESUME_CONTROLS:
            sess.is_paused = False

        if command != ClassroomCommandType.NONE:
            sess.current_state = ValidationState.COMMAND_EXECUTION
            sess.last_command_time = now
            sess.last_executed_command = command
            sess.last_command_gesture = raw_gesture
            sess.neutral_achieved_since_last_cmd = False
            sess.accepted_commands_count += 1

            return IntentValidationResult(
                state=ValidationState.COMMAND_EXECUTION,
                detected_gesture=raw_gesture,
                validated_command=command,
                is_accepted=True,
                rejection_reason=RejectionReason.NONE,
                confidence=conf,
                duration_ms=round(duration_ms, 1),
                cooldown_remaining_ms=thresholds.cooldown_duration_ms,
                cursor_position=cursor_coords,
                diagnostics={"status": f"Command {command.value} successfully confirmed and executed"},
            )

        # Pointing cursor movement without discrete action
        return IntentValidationResult(
            state=ValidationState.INTENT_CONFIRMED,
            detected_gesture=raw_gesture,
            validated_command=ClassroomCommandType.CURSOR_MOVE if raw_gesture == GestureType.POINTING else ClassroomCommandType.NONE,
            is_accepted=True,
            rejection_reason=RejectionReason.NONE,
            confidence=conf,
            duration_ms=round(duration_ms, 1),
            cursor_position=cursor_coords,
            diagnostics={"tracking": "Active pointer guidance"},
        )

    def get_telemetry(self, student_id: str) -> Dict[str, Any]:
        sess = self._get_session(student_id)
        total = sess.accepted_commands_count + sess.rejected_commands_count
        acceptance_rate = (sess.accepted_commands_count / total * 100.0) if total > 0 else 100.0

        return {
            "student_id": student_id,
            "accepted_commands": sess.accepted_commands_count,
            "rejected_commands": sess.rejected_commands_count,
            "acceptance_rate_pct": round(acceptance_rate, 1),
            "rejections_by_reason": sess.rejections_by_reason,
            "is_paused": sess.is_paused,
            "last_executed_command": sess.last_executed_command.value,
        }

    def reset_session(self, student_id: str):
        self.sessions[student_id] = StudentSessionState(student_id)


intent_validator = IntentValidator()
