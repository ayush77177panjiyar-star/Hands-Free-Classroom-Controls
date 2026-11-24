import { useState, useEffect, useRef, useCallback } from 'react';

const SKELETON_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12], [5, 9],
  // Ring
  [13, 14], [14, 15], [15, 16], [9, 13],
  // Pinky
  [17, 18], [18, 19], [19, 20], [13, 17], [0, 17],
];

export function useHandTracking({
  videoRef,
  isActive = false,
  targetFps = 20,
  preferredHand = 'right',
  studentId = 'student_a',
  smoothingFactor = 0.65,
  onGestureDetected = null,
  onCommandValidated = null,
} = {}) {
  const [hands, setHands] = useState([]);
  const [activeGesture, setActiveGesture] = useState('Resting');
  const [gestureConfidence, setGestureConfidence] = useState(0);
  const [cursorPosition, setCursorPosition] = useState({ x: 50, y: 50 });
  const [latencyMs, setLatencyMs] = useState(0);
  const [connectionMode, setConnectionMode] = useState('idle'); // 'websocket' | 'http' | 'idle'
  const [isProcessing, setIsProcessing] = useState(false);
  const [intentValidation, setIntentValidation] = useState({
    state: 'IDLE',
    validated_command: 'NO_COMMAND',
    rejection_reason: null,
    cooldown_remaining_ms: 0,
    confidence: 0,
    candidate_gesture: 'Resting',
    execution_data: {},
  });

  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const loopTimerRef = useRef(null);
  const isMountedRef = useRef(true);
  const isRequestInProgressRef = useRef(false);
  const lastGestureRef = useRef('Resting');

  // Offscreen canvas for frame extraction
  const offscreenCanvasRef = useRef(document.createElement('canvas'));

  // Initialize WebSocket connection if available
  const initWebSocket = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/tracking/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isMountedRef.current) {
          console.log('[useHandTracking] WebSocket connected to Python MediaPipe stream');
          setConnectionMode('websocket');
        }
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const res = JSON.parse(event.data);
          if (res.type === 'pong') return;

          handleTrackingResponse(res);
        } catch (e) {
          console.warn('[useHandTracking] Failed to parse tracking WS payload:', e);
        } finally {
          isRequestInProgressRef.current = false;
        }
      };

      ws.onerror = () => {
        if (isMountedRef.current) {
          setConnectionMode('http');
        }
      };

      ws.onclose = () => {
        if (isMountedRef.current) {
          setConnectionMode('http');
        }
      };

      wsRef.current = ws;
    } catch {
      setConnectionMode('http');
    }
  }, []);

  const handleTrackingResponse = (res) => {
    if (!res.success) return;

    setHands(res.hands || []);
    setActiveGesture(res.active_gesture || 'Resting');
    setGestureConfidence(res.gesture_confidence || 0);
    setLatencyMs(res.processing_time_ms || 0);

    if (res.cursor_position) {
      setCursorPosition({
        x: res.cursor_position.x,
        y: res.cursor_position.y,
      });
    }

    if (res.intent_validation) {
      setIntentValidation(res.intent_validation);
      if (
        onCommandValidated &&
        res.intent_validation.validated_command &&
        res.intent_validation.validated_command !== 'NO_COMMAND'
      ) {
        onCommandValidated(res.intent_validation);
      }
    }

    // Trigger callback on gesture transition
    if (onGestureDetected && res.active_gesture && res.active_gesture !== lastGestureRef.current) {
      onGestureDetected(res.active_gesture, res.gesture_confidence);
      lastGestureRef.current = res.active_gesture;
    }
  };

  // HTTP POST frame processing fallback
  const processFrameViaHttp = async (base64Image) => {
    isRequestInProgressRef.current = true;
    try {
      const response = await fetch('/api/v1/tracking/process-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          session_id: 'browser_session',
          student_id: studentId,
          client_timestamp_ms: Date.now(),
          preferred_hand: preferredHand,
          smoothing_factor: smoothingFactor,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const res = await response.json();
      if (isMountedRef.current) {
        handleTrackingResponse(res);
        setConnectionMode('http');
      }
    } catch (err) {
      // ignore frame drops
    } finally {
      isRequestInProgressRef.current = false;
    }
  };

  // Capture single frame from video element
  const captureFrame = useCallback(() => {
    const video = videoRef?.current;
    if (!video || video.readyState < 2 || isRequestInProgressRef.current) {
      return;
    }

    const canvas = offscreenCanvasRef.current;
    // Downscale for network & inference efficiency (480x270)
    const targetWidth = 480;
    const targetHeight = Math.round((video.videoHeight / (video.videoWidth || 1)) * targetWidth) || 270;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const base64Image = canvas.toDataURL('image/jpeg', 0.65);

    // Send via WebSocket if open, else HTTP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isRequestInProgressRef.current = true;
      wsRef.current.send(
        JSON.stringify({
          image: base64Image,
          session_id: 'ws_browser_session',
          student_id: studentId,
          client_timestamp_ms: Date.now(),
          preferred_hand: preferredHand,
          smoothing_factor: smoothingFactor,
        })
      );
    } else {
      processFrameViaHttp(base64Image);
    }
  }, [videoRef, preferredHand, studentId, smoothingFactor]);

  // Frame processing loop
  useEffect(() => {
    isMountedRef.current = true;
    if (!isActive) {
      setHands([]);
      setActiveGesture('Resting');
      setConnectionMode('idle');
      return;
    }

    initWebSocket();
    const intervalMs = Math.max(30, Math.round(1000 / targetFps));

    loopTimerRef.current = setInterval(() => {
      captureFrame();
    }, intervalMs);

    return () => {
      isMountedRef.current = false;
      if (loopTimerRef.current) clearInterval(loopTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
    };
  }, [isActive, targetFps, captureFrame, initWebSocket]);

  return {
    hands,
    activeGesture,
    gestureConfidence,
    cursorPosition,
    latencyMs,
    connectionMode,
    isProcessing,
    intentValidation,
    skeletonConnections: SKELETON_CONNECTIONS,
  };
}
