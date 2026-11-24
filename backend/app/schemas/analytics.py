from typing import List, Dict, Any
from pydantic import BaseModel, Field


class GestureAccuracyMetric(BaseModel):
    gesture_name: str
    sample_count: int
    success_rate: float
    avg_latency_ms: float
    accidental_rate: float


class TelemetrySummary(BaseModel):
    is_demo_preview: bool = True
    disclaimer: str = "DEMO PREVIEW: The following analytics represent simulated baseline metrics for demonstration purposes."
    total_sessions: int = 14
    total_successful_commands: int = 428
    failed_gestures: int = 24
    accidental_activations: int = 11
    overall_accuracy_percentage: float = 94.7
    average_response_time_ms: float = 230.5
    gestures_breakdown: List[GestureAccuracyMetric]
    daily_trend: List[Dict[str, Any]]


class StudentProfileBenchmark(BaseModel):
    student_name: str
    dominant_hand: str
    calibration_score: int
    accuracy_percentage: float
    avg_response_time_ms: float
    accidental_activation_rate: float
    total_commands_tested: int
    stability_index: float


class ComparativeBenchmarkReport(BaseModel):
    is_demo_preview: bool = True
    test_suite: str = "Standard Classroom Interactive Benchmark Suite"
    student_a: StudentProfileBenchmark
    student_b: StudentProfileBenchmark
    comparisons: List[Dict[str, Any]]
