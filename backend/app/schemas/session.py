from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class GestureEvent(BaseModel):
    timestamp_ms: int
    gesture_name: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    action_triggered: str
    target_element: Optional[str] = None
    was_successful: bool = True
    was_accidental: bool = False


class ClassroomSession(BaseModel):
    session_id: str
    student_id: str = "student_alpha"
    lesson_id: str = "bio_cell_structure_101"
    lesson_title: str = "Biology: Cell Structure & Functions"
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    total_commands: int = 0
    successful_commands: int = 0
    failed_gestures: int = 0
    accidental_activations: int = 0
    accuracy_percentage: float = 0.0
    average_response_ms: float = 0.0
    events: List[GestureEvent] = Field(default_factory=list)
