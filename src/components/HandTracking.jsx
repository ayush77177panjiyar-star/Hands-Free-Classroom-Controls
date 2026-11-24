import React, { useRef, useEffect } from 'react';
import { cn } from '../utils/helpers';

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

export default function HandTracking({
  hands = [],
  activeGesture = 'Resting',
  gestureConfidence = 0.0,
  latencyMs = 0,
  connectionMode = 'idle',
  showRestingZone = true,
  restingZone = { x_min: 0.25, y_min: 0.25, x_max: 0.75, y_max: 0.75 },
  isMirror = true,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match internal coordinate dimensions to display size
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 360;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Resting / Interaction Zone
    if (showRestingZone) {
      const rx = restingZone.x_min * width;
      const ry = restingZone.y_min * height;
      const rw = (restingZone.x_max - restingZone.x_min) * width;
      const rh = (restingZone.y_max - restingZone.y_min) * height;

      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.fillStyle = 'rgba(99, 102, 241, 0.03)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.restore();
    }

    // 2. Draw Hand Skeletons & 21 Landmarks
    hands.forEach((hand) => {
      const landmarks = hand.landmarks || [];
      if (landmarks.length < 21) return;

      const isRight = hand.handedness === 'Right';
      const boneColor = isRight ? 'rgba(99, 102, 241, 0.7)' : 'rgba(139, 92, 246, 0.7)';
      const nodeColor = isRight ? '#818CF8' : '#A78BFA';
      const tipColor = '#34D399'; // Emerald for fingertips

      // (a) Draw Skeleton Bones
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = boneColor;
      ctx.lineCap = 'round';

      SKELETON_CONNECTIONS.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (!p1 || !p2) return;

        // Coordinates in canvas space
        const x1 = p1.x * width;
        const y1 = p1.y * height;
        const x2 = p2.x * width;
        const y2 = p2.y * height;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.restore();

      // (b) Draw 21 Landmark Nodes
      landmarks.forEach((p) => {
        const px = p.x * width;
        const py = p.y * height;
        const isFingertip = [4, 8, 12, 16, 20].includes(p.id);

        ctx.save();
        ctx.beginPath();
        ctx.arc(px, py, isFingertip ? 5 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isFingertip ? tipColor : nodeColor;
        ctx.shadowColor = isFingertip ? 'rgba(52, 211, 153, 0.8)' : 'rgba(99, 102, 241, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      });

      // (c) Draw Bounding Box & Handedness Tag
      if (hand.bounding_box) {
        const bx = hand.bounding_box.x_min * width;
        const by = hand.bounding_box.y_min * height;
        const bw = (hand.bounding_box.x_max - hand.bounding_box.x_min) * width;
        const bh = (hand.bounding_box.y_max - hand.bounding_box.y_min) * height;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);

        // Tag Pill
        const label = `${hand.handedness} Hand (${Math.round(hand.confidence * 100)}%)`;
        ctx.font = 'bold 10px Inter, sans-serif';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(bx, by - 18, textWidth + 12, 16);
        ctx.fillStyle = isRight ? '#818CF8' : '#A78BFA';
        ctx.fillText(label, bx + 6, by - 6);
        ctx.restore();
      }
    });
  }, [hands, showRestingZone, restingZone]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20">
      {/* Real-time HTML5 Canvas for Hand Skeleton */}
      <canvas ref={canvasRef} className="w-full h-full object-cover" />

      {/* Top HUD: Python MediaPipe Diagnostics Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-navy-950/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            connectionMode === 'websocket'
              ? 'bg-emerald-400 animate-pulse'
              : connectionMode === 'http'
              ? 'bg-blue-400'
              : 'bg-slate-500'
          )}
        />
        <span>MediaPipe: {latencyMs > 0 ? `${latencyMs}ms` : 'Ready'}</span>
        <span className="text-slate-500 uppercase">({connectionMode})</span>
      </div>

      {/* Bottom HUD: Detected Gesture Pill */}
      {hands.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950/90 backdrop-blur-md border border-indigo-500/40 text-xs shadow-lg animate-in fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Gesture:</span>
          <span className="font-bold text-white text-gradient">{activeGesture}</span>
          <span className="text-indigo-400 font-mono text-[11px]">
            ({Math.round(gestureConfidence * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}
