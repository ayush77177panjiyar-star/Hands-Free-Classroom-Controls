import React from 'react';
import { cn } from '../utils/helpers';

export default function HandTracking({
  handPosition = { x: 50, y: 50 }, // percentage
  isDetected = true,
  handSide = 'Right',
  restingZone = { x_min: 0.25, y_min: 0.25, x_max: 0.75, y_max: 0.75 },
  gestureName = 'Pointing',
  confidence = 0.94,
  showRestingZone = true,
}) {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Calibration / Resting Zone Box */}
      {showRestingZone && (
        <div
          className="absolute border-2 border-dashed border-indigo-400/40 rounded-2xl bg-indigo-500/5 transition-all duration-300"
          style={{
            left: `${restingZone.x_min * 100}%`,
            top: `${restingZone.y_min * 100}%`,
            width: `${(restingZone.x_max - restingZone.x_min) * 100}%`,
            height: `${(restingZone.y_max - restingZone.y_min) * 100}%`,
          }}
        >
          <span className="absolute -top-3 left-4 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 uppercase tracking-wider">
            Interaction Zone
          </span>
        </div>
      )}

      {/* Detected Hand Skeleton / Landmark Points */}
      {isDetected && (
        <>
          {/* Hand Palm Center */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
            style={{ left: `${handPosition.x}%`, top: `${handPosition.y}%` }}
          >
            {/* Glowing Aura */}
            <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-400/60 animate-ping-slow" />

            {/* Fingertip / Pointer Dot */}
            <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-indigo-400 border-2 border-white shadow-glow-indigo" />

            {/* Info Tag below hand */}
            <div className="absolute top-14 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-navy-950/90 border border-slate-700 backdrop-blur-md whitespace-nowrap text-[10px] font-medium text-slate-200 flex items-center gap-1.5 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{handSide} Hand:</span>
              <span className="text-indigo-300 font-semibold">{gestureName}</span>
              <span className="text-slate-500">({Math.round(confidence * 100)}%)</span>
            </div>
          </div>
        </>
      )}

      {/* Target Crosshair in Center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 border-t border-l border-slate-600/30" />
      <div className="absolute top-1/2 left-1/2 translate-x-1/2 translate-y-1/2 w-6 h-6 border-b border-r border-slate-600/30" />
    </div>
  );
}
