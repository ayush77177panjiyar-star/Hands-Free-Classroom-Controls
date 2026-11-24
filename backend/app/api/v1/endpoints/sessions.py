from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException
from backend.app.schemas.session import ClassroomSession, GestureEvent
from backend.app.utils.responses import ApiResponse

router = APIRouter()

# In-memory session store
SESSIONS_DB: List[ClassroomSession] = [
    ClassroomSession(
        session_id="sess_demo_01",
        student_id="student_alex",
        lesson_id="bio_101",
        lesson_title="Cell Biology: Organelles & Mitochondria",
        start_time=datetime.utcnow(),
        total_commands=34,
        successful_commands=32,
        failed_gestures=2,
        accidental_activations=0,
        accuracy_percentage=94.1,
        average_response_ms=215.4,
    ),
    ClassroomSession(
        session_id="sess_demo_02",
        student_id="student_alex",
        lesson_id="phys_201",
        lesson_title="Physics: Forces & Newton's Third Law",
        start_time=datetime.utcnow(),
        total_commands=48,
        successful_commands=46,
        failed_gestures=1,
        accidental_activations=1,
        accuracy_percentage=95.8,
        average_response_ms=198.2,
    )
]


@router.get("", response_model=ApiResponse, summary="List Recent Classroom Sessions")
async def list_sessions():
    return ApiResponse(
        success=True,
        message="Retrieved classroom sessions",
        data=[s.model_dump() for s in SESSIONS_DB],
    )


@router.post("", response_model=ApiResponse, summary="Log a New Classroom Session")
async def create_session(session: ClassroomSession):
    SESSIONS_DB.insert(0, session)
    return ApiResponse(
        success=True,
        message="Classroom session recorded successfully",
        data=session.model_dump(),
    )
