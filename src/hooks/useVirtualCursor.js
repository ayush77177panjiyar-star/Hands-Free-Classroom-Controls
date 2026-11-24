import { useState, useEffect, useRef, useCallback } from 'react';

export function useVirtualCursor({
  enabled = true,
  dwellTime = 800,
  smoothing = 0.65,
  onDwellClick = null,
} = {}) {
  const [position, setPosition] = useState({ x: 50, y: 50 }); // percentage (0-100)
  const [isHovering, setIsHovering] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0); // 0 to 100
  const [isClicking, setIsClicking] = useState(false);
  const [activeGesture, setActiveGesture] = useState('Pointing');

  const dwellTimerRef = useRef(null);
  const dwellStartRef = useRef(null);
  const progressAnimRef = useRef(null);

  // Smooth position update
  const updatePosition = useCallback((targetX, targetY) => {
    setPosition((prev) => ({
      x: prev.x + (targetX - prev.x) * (1 - smoothing),
      y: prev.y + (targetY - prev.y) * (1 - smoothing),
    }));
  }, [smoothing]);

  // Start dwell timer on interactive target
  const startDwell = useCallback((elementId) => {
    setIsHovering(true);
    dwellStartRef.current = Date.now();

    const checkProgress = () => {
      const elapsed = Date.now() - dwellStartRef.current;
      const progress = Math.min(100, (elapsed / dwellTime) * 100);
      setDwellProgress(progress);

      if (progress >= 100) {
        setIsClicking(true);
        setTimeout(() => setIsClicking(false), 300);
        if (onDwellClick) onDwellClick(elementId);
        cancelDwell();
      } else {
        progressAnimRef.current = requestAnimationFrame(checkProgress);
      }
    };

    progressAnimRef.current = requestAnimationFrame(checkProgress);
  }, [dwellTime, onDwellClick]);

  const cancelDwell = useCallback(() => {
    setIsHovering(false);
    setDwellProgress(0);
    if (progressAnimRef.current) {
      cancelAnimationFrame(progressAnimRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (progressAnimRef.current) {
        cancelAnimationFrame(progressAnimRef.current);
      }
    };
  }, []);

  return {
    position,
    setPosition,
    updatePosition,
    isHovering,
    dwellProgress,
    isClicking,
    activeGesture,
    setActiveGesture,
    startDwell,
    cancelDwell,
  };
}
