from typing import List, Dict, Any
from backend.app.schemas.analytics import (
    TelemetrySummary,
    GestureAccuracyMetric,
    StudentProfileBenchmark,
    ComparativeBenchmarkReport,
)


class AnalyticsService:
    def get_summary(self) -> TelemetrySummary:
        gestures = [
            GestureAccuracyMetric(
                gesture_name="Pinch to Select",
                sample_count=184,
                success_rate=96.2,
                avg_latency_ms=195.4,
                accidental_rate=1.8,
            ),
            GestureAccuracyMetric(
                gesture_name="Swipe Next",
                sample_count=122,
                success_rate=97.5,
                avg_latency_ms=210.0,
                accidental_rate=2.1,
            ),
            GestureAccuracyMetric(
                gesture_name="Swipe Previous",
                sample_count=58,
                success_rate=93.1,
                avg_latency_ms=225.8,
                accidental_rate=3.4,
            ),
            GestureAccuracyMetric(
                gesture_name="Palm Pause / Menu",
                sample_count=36,
                success_rate=91.7,
                avg_latency_ms=280.2,
                accidental_rate=4.2,
            ),
            GestureAccuracyMetric(
                gesture_name="Virtual Cursor Pointing",
                sample_count=240,
                success_rate=95.0,
                avg_latency_ms=145.0,
                accidental_rate=2.0,
            ),
        ]

        daily_trend = [
            {"day": "Mon", "accuracy": 92.4, "responseTime": 260, "commands": 48},
            {"day": "Tue", "accuracy": 93.8, "responseTime": 245, "commands": 62},
            {"day": "Wed", "accuracy": 95.1, "responseTime": 235, "commands": 85},
            {"day": "Thu", "accuracy": 94.6, "responseTime": 228, "commands": 74},
            {"day": "Fri", "accuracy": 96.0, "responseTime": 215, "commands": 92},
            {"day": "Sat", "accuracy": 96.8, "responseTime": 204, "commands": 67},
        ]

        return TelemetrySummary(
            is_demo_preview=True,
            disclaimer="DEMO PREVIEW: The following analytics represent simulated baseline metrics for demonstration purposes.",
            total_sessions=14,
            total_successful_commands=428,
            failed_gestures=24,
            accidental_activations=11,
            overall_accuracy_percentage=94.7,
            average_response_time_ms=230.5,
            gestures_breakdown=gestures,
            daily_trend=daily_trend,
        )

    def get_comparison(self) -> ComparativeBenchmarkReport:
        student_a = StudentProfileBenchmark(
            student_name="Student A (Alex)",
            dominant_hand="Right",
            calibration_score=94,
            accuracy_percentage=96.4,
            avg_response_time_ms=205.2,
            accidental_activation_rate=1.9,
            total_commands_tested=160,
            stability_index=0.92,
        )

        student_b = StudentProfileBenchmark(
            student_name="Student B (Jordan)",
            dominant_hand="Left",
            calibration_score=89,
            accuracy_percentage=93.1,
            avg_response_time_ms=248.6,
            accidental_activation_rate=3.8,
            total_commands_tested=160,
            stability_index=0.86,
        )

        comparisons = [
            {
                "metric": "Recognition Accuracy (%)",
                "student_a": 96.4,
                "student_b": 93.1,
                "difference": "+3.3% Student A",
                "category": "accuracy"
            },
            {
                "metric": "Average Response Time (ms)",
                "student_a": 205.2,
                "student_b": 248.6,
                "difference": "-43.4 ms (faster)",
                "category": "speed"
            },
            {
                "metric": "Accidental Activations (%)",
                "student_a": 1.9,
                "student_b": 3.8,
                "difference": "-1.9% (better rejection)",
                "category": "stability"
            },
            {
                "metric": "Target Click Dwell Stability",
                "student_a": 0.92,
                "student_b": 0.86,
                "difference": "+0.06 index",
                "category": "stability"
            },
        ]

        return ComparativeBenchmarkReport(
            is_demo_preview=True,
            test_suite="Standard Classroom Interactive Benchmark Suite",
            student_a=student_a,
            student_b=student_b,
            comparisons=comparisons,
        )


analytics_service = AnalyticsService()
