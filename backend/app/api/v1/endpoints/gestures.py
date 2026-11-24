from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.gesture import IntentValidationResult, GestureClassification
from backend.app.services.intent_validation import intent_validator
from backend.app.services.calibration_service import calibration_service
from backend.app.services.movement_analysis import movement_analyzer
from backend.app.utils.responses import ApiResponse

router = APIRouter()


@router.get("/telemetry/{student_id}", response_model=ApiResponse, summary="Get Accidental Movement & Validation Telemetry")
async def get_gesture_telemetry(student_id: str):
    """
    Returns telemetry stats on accepted vs rejected classroom commands with rejection reasons.
    """
    try:
        telemetry = intent_validator.get_telemetry(student_id.lower())
        return ApiResponse(
            success=True,
            message="Telemetry metrics retrieved",
            data=telemetry,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reset-session/{student_id}", response_model=ApiResponse, summary="Reset Intent Validation State Machine")
async def reset_gesture_session(student_id: str):
    """
    Resets the state machine, cooldown timers, and command lockout for a student session.
    """
    try:
        sid = student_id.lower()
        intent_validator.reset_session(sid)
        movement_analyzer.clear_history(sid)
        return ApiResponse(
            success=True,
            message=f"Session state machine reset for {sid}",
            data={"student_id": sid},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
