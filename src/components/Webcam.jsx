import React, { useState } from 'react';
import { Camera, CameraOff, RefreshCw, FlipHorizontal, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/helpers';

export default function Webcam({
  videoRef,
  isActive = false,
  hasPermission = null,
  error = null,
  devices = [],
  selectedDeviceId = '',
  onSelectDevice = null,
  isMirror = true,
  onToggleMirror = null,
  onStart = null,
  onStop = null,
  overlayChildren = null,
  className = '',
  showControls = true,
}) {
  const [privacyCover, setPrivacyCover] = useState(false);

  return (
    <div className={cn('relative rounded-2xl overflow-hidden glass-card border border-slate-800 bg-slate-950 flex flex-col', className)}>
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-video flex items-center justify-center bg-navy-950 overflow-hidden">
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            'w-full h-full object-cover transition-transform duration-200',
            isMirror && 'scale-x-[-1]',
            (!isActive || privacyCover) && 'hidden'
          )}
        />

        {/* Privacy Cover Overlay */}
        {isActive && privacyCover && (
          <div className="absolute inset-0 bg-navy-950/90 flex flex-col items-center justify-center text-slate-400 gap-2 z-10">
            <EyeOff className="w-10 h-10 text-indigo-400" />
            <p className="text-sm font-medium">Camera Privacy Cover Active</p>
            <p className="text-xs text-slate-500">Video feed is blanked for privacy</p>
          </div>
        )}

        {/* Fallback / Simulator if Camera is Offline or Permission Denied */}
        {(!isActive || hasPermission === false) && !privacyCover && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-gradient-to-b from-navy-900 to-navy-950">
            {hasPermission === false ? (
              <div className="space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">Camera Access Required</h4>
                <p className="text-xs text-slate-400">
                  {error || 'Webcam permission was blocked. Enable camera access in your browser or use the simulation mode.'}
                </p>
                {onStart && (
                  <button
                    onClick={onStart}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo/50 transition-all"
                  >
                    Request Camera Access
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-w-sm">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto animate-pulse">
                  <Camera className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-white">Camera on Standby</h4>
                <p className="text-xs text-slate-400">
                  Click activate below to start live webcam gesture tracking.
                </p>
                {onStart && (
                  <button
                    onClick={onStart}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo/50 transition-all"
                  >
                    Activate Camera
                  </button>
                )}
              </div>
            )}

            {/* Subtle Grid Simulation Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>
        )}

        {/* Custom Overlays (Hand tracking landmarks, calibration boundary) */}
        {isActive && !privacyCover && overlayChildren && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {overlayChildren}
          </div>
        )}

        {/* Live Status Tag */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-medium text-slate-200">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              isActive && !privacyCover ? 'bg-emerald-400 animate-ping-slow' : 'bg-slate-500'
            )}
          />
          <span>{isActive && !privacyCover ? 'LIVE 720p 30fps' : 'STANDBY'}</span>
        </div>
      </div>

      {/* Control Bar */}
      {showControls && (
        <div className="px-4 py-3 bg-navy-900 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Camera Selection */}
          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <Camera className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice && onSelectDevice(e.target.value)}
              disabled={devices.length === 0}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500/50 w-full truncate"
            >
              {devices.length > 0 ? (
                devices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Default Web Camera</option>
              )}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {/* Mirror Toggle */}
            {onToggleMirror && (
              <button
                onClick={onToggleMirror}
                className={cn(
                  'p-1.5 rounded-lg border text-slate-400 hover:text-white transition-colors',
                  isMirror ? 'border-indigo-500/40 text-indigo-400 bg-indigo-500/10' : 'border-slate-800'
                )}
                title="Toggle Mirror Mode"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            )}

            {/* Privacy Blinder */}
            {isActive && (
              <button
                onClick={() => setPrivacyCover(!privacyCover)}
                className={cn(
                  'p-1.5 rounded-lg border transition-colors',
                  privacyCover
                    ? 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                )}
                title={privacyCover ? 'Disable Privacy Cover' : 'Enable Privacy Cover'}
              >
                {privacyCover ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {/* Stream On/Off */}
            {isActive ? (
              <button
                onClick={onStop}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium transition-colors"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={onStart}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-glow-indigo/40 transition-colors"
              >
                Start
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
