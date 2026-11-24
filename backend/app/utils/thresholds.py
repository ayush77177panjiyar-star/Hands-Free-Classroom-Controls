from typing import List, Dict, Any, Tuple
import numpy as np


def compute_adaptive_pinch_threshold(pinch_distances: List[float]) -> Tuple[float, float]:
    """
    Computes personalized pinch threshold from student calibration samples.
    Returns: (recommended_threshold, confidence_score)
    """
    if not pinch_distances or len(pinch_distances) < 3:
        # Safe default
        return 0.055, 0.70

    arr = np.array(pinch_distances)
    mean_val = float(np.mean(arr))
    std_val = float(np.std(arr))

    # Threshold set slightly above the student's comfortable pinch closure distance:
    # mean + 1.96 * std with safety clamp [0.035, 0.09]
    thresh = float(np.clip(mean_val + 1.96 * std_val, 0.035, 0.090))
    conf = float(np.clip(1.0 - (std_val / (mean_val + 1e-5)), 0.75, 0.99))
    return round(thresh, 4), round(conf, 2)


def compute_resting_baseline_thresholds(
    resting_jitter_samples: List[float],
    resting_positions: List[Tuple[float, float]]
) -> Dict[str, Any]:
    """
    Calculates resting jitter threshold and interaction bounding box.
    Filters micro-jitters during thinking/resting.
    """
    if not resting_jitter_samples or len(resting_jitter_samples) < 3:
        return {
            "resting_jitter_threshold": 0.0008,
            "movement_deadzone": 0.020,
            "resting_zone": {"x_min": 0.25, "y_min": 0.25, "x_max": 0.75, "y_max": 0.75},
        }

    jitter_arr = np.array(resting_jitter_samples)
    # 95th percentile of resting jitter captures 95% of accidental twitches
    p95_jitter = float(np.percentile(jitter_arr, 95))
    jitter_thresh = float(np.clip(p95_jitter * 1.3, 0.0003, 0.0030))

    # Deadzone scaled relative to resting jitter
    deadzone = float(np.clip(np.sqrt(jitter_thresh) * 0.8, 0.012, 0.035))

    # Bounding box calculation if positions provided
    x_min, y_min, x_max, y_max = 0.25, 0.25, 0.75, 0.75
    if resting_positions and len(resting_positions) >= 3:
        pos_arr = np.array(resting_positions)
        mean_x = float(np.mean(pos_arr[:, 0]))
        mean_y = float(np.mean(pos_arr[:, 1]))
        std_x = float(np.std(pos_arr[:, 0]))
        std_y = float(np.std(pos_arr[:, 1]))

        # Resting zone centered around student's resting cluster
        x_min = max(0.1, min(0.35, mean_x - 2.5 * std_x))
        x_max = min(0.9, max(0.65, mean_x + 2.5 * std_x))
        y_min = max(0.1, min(0.35, mean_y - 2.5 * std_y))
        y_max = min(0.9, max(0.65, mean_y + 2.5 * std_y))

    return {
        "resting_jitter_threshold": round(jitter_thresh, 5),
        "movement_deadzone": round(deadzone, 4),
        "resting_zone": {
            "x_min": round(x_min, 3),
            "y_min": round(y_min, 3),
            "x_max": round(x_max, 3),
            "y_max": round(y_max, 3),
        },
    }


def compute_swipe_thresholds(
    swipe_velocities: List[float],
    swipe_displacements: List[float]
) -> Dict[str, float]:
    """
    Computes minimum swipe velocity and displacement adapted to student speed.
    """
    if not swipe_velocities or len(swipe_velocities) < 2:
        return {
            "swipe_min_velocity": 0.40,
            "swipe_min_displacement": 0.15,
        }

    vel_arr = np.array(swipe_velocities)
    disp_arr = np.array(swipe_displacements)

    # 40th percentile ensures student doesn't have to swipe at 100% maximum effort every time
    min_vel = float(np.percentile(vel_arr, 40) * 0.8)
    min_disp = float(np.percentile(disp_arr, 40) * 0.8)

    min_vel = float(np.clip(min_vel, 0.25, 0.70))
    min_disp = float(np.clip(min_disp, 0.10, 0.25))

    return {
        "swipe_min_velocity": round(min_vel, 3),
        "swipe_min_displacement": round(min_disp, 3),
    }
