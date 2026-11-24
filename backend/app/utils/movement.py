import math
from typing import List, Tuple, Dict, Any, Optional
import numpy as np


def euclidean_dist_2d(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    """Calculates 2D Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)


def euclidean_dist_3d(p1: Tuple[float, float, float], p2: Tuple[float, float, float]) -> float:
    """Calculates 3D Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2 + (p1[2] - p2[2]) ** 2)


def calculate_angle_3points(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float]
) -> float:
    """
    Calculates angle at point b formed by segments ab and bc in degrees.
    """
    ab = np.array([a[0] - b[0], a[1] - b[1]])
    cb = np.array([c[0] - b[0], c[1] - b[1]])

    norm_ab = np.linalg.norm(ab)
    norm_cb = np.linalg.norm(cb)

    if norm_ab < 1e-7 or norm_cb < 1e-7:
        return 180.0

    cosine_angle = np.dot(ab, cb) / (norm_ab * norm_cb)
    cosine_angle = np.clip(cosine_angle, -1.0, 1.0)
    angle = np.degrees(np.arccos(cosine_angle))
    return float(angle)


def compute_velocity(
    p_curr: Tuple[float, float],
    p_prev: Tuple[float, float],
    dt_seconds: float
) -> Tuple[float, float, float]:
    """
    Computes velocity vector (vx, vy) and scalar speed.
    """
    if dt_seconds <= 1e-5:
        return 0.0, 0.0, 0.0

    vx = (p_curr[0] - p_prev[0]) / dt_seconds
    vy = (p_curr[1] - p_prev[1]) / dt_seconds
    speed = math.sqrt(vx ** 2 + vy ** 2)
    return vx, vy, speed


def compute_jitter_variance(points: List[Tuple[float, float]]) -> float:
    """
    Computes variance of spatial displacement across a window of points.
    A high variance indicates erratic twitching; low variance indicates steady hold.
    """
    if len(points) < 3:
        return 0.0

    arr = np.array(points)
    var_x = float(np.var(arr[:, 0]))
    var_y = float(np.var(arr[:, 1]))
    return var_x + var_y


def exponential_moving_average(
    current_val: float,
    previous_smoothed: float,
    alpha: float = 0.65
) -> float:
    """
    Applies EMA smoothing filter.
    alpha near 1.0 favors previous smoothed values (higher damping/smoothing);
    alpha near 0.0 favors fresh input (higher responsiveness).
    """
    return previous_smoothed * alpha + current_val * (1.0 - alpha)


def classify_dominant_direction(
    dx: float,
    dy: float,
    min_dist: float = 0.05
) -> str:
    """
    Determines primary direction of motion: 'LEFT', 'RIGHT', 'UP', 'DOWN', or 'NEUTRAL'.
    """
    total_dist = math.sqrt(dx ** 2 + dy ** 2)
    if total_dist < min_dist:
        return "NEUTRAL"

    if abs(dx) > 1.4 * abs(dy):
        return "RIGHT" if dx > 0 else "LEFT"
    elif abs(dy) > 1.4 * abs(dx):
        return "DOWN" if dy > 0 else "UP"
    return "DIAGONAL"
