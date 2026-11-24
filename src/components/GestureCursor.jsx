import React from 'react';
import { cn } from '../utils/helpers';

export default function GestureCursor({
  position = { x: 50, y: 50 }, // percentage
  isHovering = false,
  dwellProgress = 0, // 0 to 100
  isClicking = false,
  cursorSize = 36,
  visible = true,
}) {
  if (!visible) return null;

  const radius = cursorSize / 2;
  const strokeWidth = 3.5;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (dwellProgress / 100) * circumference;

  return (
    <div
      className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 select-none"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
    >
      {/* Click Ripple Effect */}
      {isClicking && (
        <div
          className="absolute inset-0 rounded-full bg-indigo-500/40 animate-ping"
          style={{ width: cursorSize * 2, height: cursorSize * 2, left: -cursorSize / 2, top: -cursorSize / 2 }}
        />
      )}

      {/* Circular Progress Ring for Dwell Click */}
      <svg height={cursorSize} width={cursorSize} className="transform -rotate-90">
        {/* Background track */}
        <circle
          stroke="rgba(255, 255, 255, 0.15)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Animated dwell progress ring */}
        <circle
          stroke="#818CF8"
          fill={isHovering ? 'rgba(99, 102, 241, 0.25)' : 'transparent'}
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-75"
        />
      </svg>

      {/* Central Cursor Point */}
      <div
        className={cn(
          'absolute inset-0 m-auto rounded-full transition-all duration-150 border-2 border-white',
          isClicking
            ? 'w-5 h-5 bg-emerald-400 scale-125'
            : isHovering
            ? 'w-3.5 h-3.5 bg-indigo-400 scale-110 shadow-glow-indigo'
            : 'w-2.5 h-2.5 bg-white shadow-md'
        )}
      />

      {/* Subtle Label when hovering */}
      {isHovering && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/40 text-[9px] font-semibold text-indigo-300 tracking-wider uppercase whitespace-nowrap shadow-lg">
          Hold to Click
        </div>
      )}
    </div>
  );
}
