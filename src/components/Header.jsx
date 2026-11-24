import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  Maximize2,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

export default function Header({
  pageTitle = 'Dashboard',
  webcamActive = true,
  onToggleWebcam = null,
}) {
  const [backendHealth, setBackendHealth] = useState({ status: 'checking', service: '' });
  const [isChecking, setIsChecking] = useState(false);
  const [notification, setNotification] = useState(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const res = await api.checkHealth();
      if (res.status === 'healthy') {
        setBackendHealth({ status: 'healthy', service: res.service || 'FastAPI 1.0.0' });
      } else {
        setBackendHealth({ status: 'offline', error: res.error });
      }
    } catch {
      setBackendHealth({ status: 'offline' });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const triggerFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="h-16 px-6 bg-navy-900/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Mode */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold tracking-tight text-white">{pageTitle}</h2>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          Smart EdTech Suite
        </span>
      </div>

      {/* Right Action Chips */}
      <div className="flex items-center gap-3">
        {/* Backend API Status Pill */}
        <div
          onClick={checkHealth}
          className="cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all"
          title="Click to re-check FastAPI backend health"
        >
          {backendHealth.status === 'healthy' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 hidden md:inline">FastAPI:</span>
              <span className="text-emerald-400 font-semibold">Online</span>
            </>
          ) : backendHealth.status === 'checking' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
              <span className="text-slate-400">Connecting...</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 hidden md:inline">API:</span>
              <span className="text-amber-400 font-semibold">Standby</span>
            </>
          )}
        </div>

        {/* Camera Quick Toggle */}
        {onToggleWebcam && (
          <button
            onClick={onToggleWebcam}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
              webcamActive
                ? 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            )}
            title={webcamActive ? 'Disable webcam' : 'Enable webcam'}
          >
            {webcamActive ? (
              <>
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Cam Active</span>
              </>
            ) : (
              <>
                <CameraOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Cam Muted</span>
              </>
            )}
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={triggerFullscreen}
          className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          onClick={() => setNotification(notification ? null : 'Gesture system operating normally.')}
          className="relative p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-navy-900" />
        </button>
      </div>

      {/* Floating notification modal */}
      {notification && (
        <div className="absolute top-16 right-6 p-4 rounded-xl glass-card border border-indigo-500/30 shadow-glass w-72 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200">System Notification</span>
            <button
              onClick={() => setNotification(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2">{notification}</p>
        </div>
      )}
    </header>
  );
}
