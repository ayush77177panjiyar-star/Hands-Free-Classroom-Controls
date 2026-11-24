from fastapi import APIRouter, HTTPException, Query
from backend.app.schemas.calibration import CalibrationProfile
from backend.app.services.calibration_service import calibration_service
from backend.app.utils.responses import ApiResponse

router = APIRouter()


@router.get("", response_model=ApiResponse, summary="Get Calibration Profile")
async def get_calibration_profile(profile_id: str = Query("default_student", description="ID of the student profile")):
    try:
        profile = calibration_service.get_profile(profile_id)
        return ApiResponse(
            success=True,
            message="Calibration profile retrieved",
            data=profile.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=ApiResponse, summary="Save or Update Calibration Profile")
async def save_calibration_profile(profile: CalibrationProfile):
    try:
        saved = calibration_service.save_profile(profile)
        return ApiResponse(
            success=True,
            message="Calibration profile successfully saved",
            data=saved.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save profile: {str(e)}")


@router.post("/reset", response_model=ApiResponse, summary="Reset Calibration Profile to Factory Defaults")
async def reset_calibration_profile(profile_id: str = Query("default_student")):
    try:
        reset_prof = calibration_service.reset_profile(profile_id)
        return ApiResponse(
            success=True,
            message="Calibration profile reset to defaults",
            data=reset_prof.model_dump(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
