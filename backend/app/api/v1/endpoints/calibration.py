from fastapi import APIRouter, HTTPException, Query, Body
from backend.app.schemas.calibration import (
    StudentProfile,
    CalibrationSampleSubmission,
    CalibrationCalculationRequest,
    HandPreference,
)
from backend.app.services.calibration_service import calibration_service
from backend.app.utils.responses import ApiResponse

router = APIRouter()


@router.get("", response_model=ApiResponse, summary="Get Calibration Profile (Default or by Query)")
async def get_calibration_profile_default(profile_id: str = Query("student_a", description="ID of student profile")):
    try:
        profile = calibration_service.get_profile(profile_id)
        return ApiResponse(
            success=True,
            message="Calibration profile retrieved",
            data=profile.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/{profile_id}", response_model=ApiResponse, summary="Get Specific Student Profile")
async def get_calibration_profile_by_id(profile_id: str):
    try:
        profile = calibration_service.get_profile(profile_id)
        return ApiResponse(
            success=True,
            message="Calibration profile retrieved",
            data=profile.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ApiResponse, summary="Save or Update Student Profile")
@router.post("/profile", response_model=ApiResponse, summary="Save Student Profile")
async def save_calibration_profile(profile: StudentProfile):
    try:
        saved = calibration_service.save_profile(profile)
        return ApiResponse(
            success=True,
            message="Calibration profile successfully saved",
            data=saved.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save profile: {str(e)}")


@router.post("/sample", response_model=ApiResponse, summary="Record a Live Calibration Sample")
async def record_calibration_sample(submission: CalibrationSampleSubmission):
    """
    Submits a calibration sample (pinch, resting jitter, swipe) for individual student profile tuning.
    """
    try:
        res = calibration_service.record_sample(submission.student_id, submission.sample)
        return ApiResponse(
            success=True,
            message=f"Sample recorded for {submission.student_id}",
            data=res,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to record sample: {str(e)}")


@router.post("/calculate", response_model=ApiResponse, summary="Calculate Adaptive Thresholds from Samples")
async def calculate_adaptive_thresholds(req: CalibrationCalculationRequest):
    """
    Analyzes collected student samples using statistical distribution algorithms and returns personalized adaptive thresholds.
    """
    try:
        profile = calibration_service.calculate_adaptive_profile(
            student_id=req.student_id,
            preferred_hand=req.preferred_hand or HandPreference.RIGHT,
        )
        return ApiResponse(
            success=True,
            message=f"Adaptive thresholds successfully computed for {req.student_id}",
            data=profile.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate profile: {str(e)}")


@router.post("/reset", response_model=ApiResponse, summary="Reset Student Calibration to Factory Defaults")
async def reset_calibration_profile(profile_id: str = Query("student_a")):
    try:
        reset_prof = calibration_service.reset_profile(profile_id)
        return ApiResponse(
            success=True,
            message=f"Calibration profile reset to defaults for {profile_id}",
            data=reset_prof.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
