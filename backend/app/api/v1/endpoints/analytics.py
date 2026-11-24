from fastapi import APIRouter
from backend.app.services.analytics_service import analytics_service
from backend.app.utils.responses import ApiResponse

router = APIRouter()


@router.get("/overview", response_model=ApiResponse, summary="Get Telemetry Analytics Overview")
async def get_analytics_overview():
    summary = analytics_service.get_summary()
    return ApiResponse(
        success=True,
        message="Analytics summary retrieved",
        data=summary.model_dump(),
    )


@router.get("/comparison", response_model=ApiResponse, summary="Get Student A/B Comparative Benchmark")
async def get_comparative_benchmark():
    report = analytics_service.get_comparison()
    return ApiResponse(
        success=True,
        message="Comparative benchmark report retrieved",
        data=report.model_dump(),
    )
