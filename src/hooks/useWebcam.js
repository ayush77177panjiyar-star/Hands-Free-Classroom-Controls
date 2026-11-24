import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebcam(options = {}) {
  const { autoStart = true } = options;
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isMirror, setIsMirror] = useState(true);

  // Enumerate video devices
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = deviceList.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Failed to enumerate media devices:', e);
    }
  }, [selectedDeviceId]);

  const startStream = useCallback(async (deviceId = selectedDeviceId) => {
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam mediaDevices API is not supported in this browser.');
      }

      // Stop any existing tracks
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      setHasPermission(true);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      refreshDevices();
    } catch (err) {
      console.warn('Webcam stream request error:', err.message);
      setError(err.name === 'NotAllowedError' ? 'Camera permission was denied' : err.message);
      setHasPermission(false);
      setIsActive(false);
    }
  }, [selectedDeviceId, stream, refreshDevices]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, [stream]);

  useEffect(() => {
    if (autoStart) {
      startStream();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    videoRef,
    stream,
    isActive,
    hasPermission,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isMirror,
    setIsMirror,
    startStream,
    stopStream,
  };
}
