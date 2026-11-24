import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Users,
  Target,
  Zap,
  Clock,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import StatCard from '../components/StatCard';
import Feedback from '../components/Feedback';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

const COMPARISON_CHART_DATA = [
  { metric: 'Accuracy (%)', studentA: 96.4, studentB: 93.1 },
  { metric: 'Speed Index', studentA: 88, studentB: 79 },
  { metric: 'Stability (%)', studentA: 94.2, studentB: 90.5 },
  { metric: 'Suppression (%)', studentA: 98.1, studentB: 96.2 },
];

export default function TestingPage() {
  const [activeTest, setActiveTest] = useState(null); // 'reaction' | 'target'
  const [reactionState, setReactionState] = useState('idle'); // 'waiting' | 'ready' | 'clicked'
  const [reactionTime, setReactionTime] = useState(null);
  const [targetHits, setTargetHits] = useState(0);
  const [targetPos, setTargetPos] = useState({ top: '40%', left: '45%' });
  const [toasts, setToasts] = useState([]);

  const [profileA, setProfileA] = useState(null);
  const [profileB, setProfileB] = useState(null);
  const [telemetryA, setTelemetryA] = useState(null);
  const [telemetryB, setTelemetryB] = useState(null);

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Fetch real profiles from backend
  useEffect(() => {
    async function loadData() {
      try {
        const [pA, pB, tA, tB] = await Promise.all([
          api.getStudentProfile('student_a').catch(() => null),
          api.getStudentProfile('student_b').catch(() => null),
          api.getGestureTelemetry('student_a').catch(() => null),
          api.getGestureTelemetry('student_b').catch(() => null),
        ]);

        if (pA?.success) setProfileA(pA.data);
        if (pB?.success) setProfileB(pB.data);
        if (tA?.success) setTelemetryA(tA.data);
        if (tB?.success) setTelemetryB(tB.data);
      } catch (e) {
        console.warn('Failed to fetch benchmark profiles:', e);
      }
    }
    loadData();
  }, []);

  // Interactive Reaction Benchmark
  const startReactionTest = () => {
    setReactionState('waiting');
    setReactionTime(null);
    const delay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      setReactionState('ready');
      window._reactionStart = Date.now();
    }, delay);
  };

  const handleReactionClick = () => {
    if (reactionState === 'ready') {
      const elapsed = Date.now() - window._reactionStart;
      setReactionTime(elapsed);
      setReactionState('clicked');
      addToast('Reaction Recorded', `Triggered in ${elapsed} ms!`, 'success');
    } else if (reactionState === 'waiting') {
      setReactionState('idle');
      addToast('Premature Trigger', 'Too early! Wait for the signal to turn green.', 'warning');
    }
  };

  // Interactive Target Accuracy Benchmark
  const handleTargetClick = () => {
    setTargetHits((prev) => prev + 1);
    const top = `${20 + Math.random() * 60}%`;
    const left = `${15 + Math.random() * 70}%`;
    setTargetPos({ top, left });
    addToast('Target Hit 🎯', `Total targets acquired: ${targetHits + 1}`, 'success');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <FlaskConical className="w-4 h-4" />
            <span>Dual-Profile Benchmark Laboratory</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Student Calibration A/B Testing</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Compare hand geometry, accuracy, accidental activations, and response time across different student profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Phase 3 Intelligent Engine Active
          </span>
        </div>
      </div>

      {/* Profiles Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student A Profile */}
        <div className="glass-card rounded-2xl p-6 border border-indigo-500/30 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-sm">
                A
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Student A (Alex Sterling)</h3>
                <p className="text-xs text-slate-400">Right-Hand Dominant • Adult Hand Geometry</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {profileA?.calibration_quality_score || 96}% Quality Score
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Pinch Cutoff</p>
              <p className="text-base font-bold text-white mt-0.5">
                {(profileA?.adaptive_thresholds?.pinch_threshold || 0.052).toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Rest Deadzone</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">
                {(profileA?.adaptive_thresholds?.movement_deadzone || 0.018).toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Cooldown</p>
              <p className="text-base font-bold text-indigo-400 mt-0.5">
                {profileA?.adaptive_thresholds?.cooldown_duration_ms || 700} ms
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 pt-1">
            <p className="flex justify-between">
              <span>Resting Jitter Cutoff:</span>
              <span className="font-mono text-slate-300">
                {(profileA?.adaptive_thresholds?.resting_jitter_threshold || 0.00085).toFixed(5)}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Swipe Min Velocity:</span>
              <span className="font-mono text-slate-300">
                {(profileA?.adaptive_thresholds?.swipe_min_velocity || 0.50).toFixed(2)} /s
              </span>
            </p>
            <p className="flex justify-between">
              <span>Dwell Selection Time:</span>
              <span className="font-mono text-slate-300">
                {profileA?.adaptive_thresholds?.dwell_time_ms || 700} ms
              </span>
            </p>
          </div>
        </div>

        {/* Student B Profile */}
        <div className="glass-card rounded-2xl p-6 border border-violet-500/30 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 font-bold text-sm">
                B
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Student B (Jordan Vance)</h3>
                <p className="text-xs text-slate-400">Left-Hand Dominant • Compact Hand Geometry</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {profileB?.calibration_quality_score || 91}% Quality Score
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Pinch Cutoff</p>
              <p className="text-base font-bold text-white mt-0.5">
                {(profileB?.adaptive_thresholds?.pinch_threshold || 0.046).toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Rest Deadzone</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">
                {(profileB?.adaptive_thresholds?.movement_deadzone || 0.024).toFixed(3)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase">Cooldown</p>
              <p className="text-base font-bold text-violet-400 mt-0.5">
                {profileB?.adaptive_thresholds?.cooldown_duration_ms || 750} ms
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 pt-1">
            <p className="flex justify-between">
              <span>Resting Jitter Cutoff:</span>
              <span className="font-mono text-slate-300">
                {(profileB?.adaptive_thresholds?.resting_jitter_threshold || 0.00095).toFixed(5)}
              </span>
            </p>
            <p className="flex justify-between">
              <span>Swipe Min Velocity:</span>
              <span className="font-mono text-slate-300">
                {(profileB?.adaptive_thresholds?.swipe_min_velocity || 0.45).toFixed(2)} /s
              </span>
            </p>
            <p className="flex justify-between">
              <span>Dwell Selection Time:</span>
              <span className="font-mono text-slate-300">
                {profileB?.adaptive_thresholds?.dwell_time_ms || 850} ms
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Bar Chart */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">A/B Kinematic Performance Benchmark</h3>
            <p className="text-xs text-slate-400">Comparing Student A (Alex) and Student B (Jordan) under identical lighting</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={COMPARISON_CHART_DATA} margin={{ top: 15, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
              <XAxis dataKey="metric" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="studentA" name="Student A (Alex - Right)" fill="#6366F1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="studentB" name="Student B (Jordan - Left)" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Testing Activities Playground */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>Interactive Benchmark Testing Activities</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Test and benchmark real reaction latency and targeting precision using your gestures or mouse pointer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Activity 1: Reaction Time Benchmark */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">1. Gesture Reaction Time Benchmark</h4>
              <p className="text-xs text-slate-400 mt-1">
                Click start, wait for the box to turn green, then trigger as fast as possible.
              </p>
            </div>

            {/* Test Arena */}
            <div
              onClick={handleReactionClick}
              className={cn(
                'h-36 rounded-2xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none text-center p-4',
                reactionState === 'idle' && 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700',
                reactionState === 'waiting' && 'bg-rose-950/40 border-rose-500/50 text-rose-300 animate-pulse',
                reactionState === 'ready' && 'bg-emerald-600 border-emerald-400 text-white font-bold scale-[1.02] shadow-glow-emerald',
                reactionState === 'clicked' && 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
              )}
            >
              {reactionState === 'idle' && (
                <span>Click "Start Test" below to begin</span>
              )}
              {reactionState === 'waiting' && (
                <span className="font-semibold text-rose-300">Wait for Green...</span>
              )}
              {reactionState === 'ready' && (
                <span className="text-lg font-extrabold uppercase">TRIGGER NOW!</span>
              )}
              {reactionState === 'clicked' && (
                <div>
                  <p className="text-2xl font-black text-white">{reactionTime} ms</p>
                  <p className="text-xs text-indigo-300 mt-1">Click to test again</p>
                </div>
              )}
            </div>

            <button
              onClick={startReactionTest}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-glow-indigo transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Reaction Test</span>
            </button>
          </div>

          {/* Activity 2: Dynamic Target Precision Benchmark */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">2. Target Precision Benchmark</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Hover or click moving target rings to test fine motor tracking stability.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Score: {targetHits}
              </span>
            </div>

            {/* Target Field */}
            <div className="relative h-36 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
              <button
                onClick={handleTargetClick}
                className="absolute w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 border-2 border-white shadow-glow-indigo transition-all duration-300 flex items-center justify-center text-white text-xs font-bold -translate-x-1/2 -translate-y-1/2 hover:scale-110 active:scale-95"
                style={{ top: targetPos.top, left: targetPos.left }}
              >
                🎯
              </button>
            </div>

            <button
              onClick={() => {
                setTargetHits(0);
                addToast('Targeting Reset', 'Target counter reset to 0.', 'info');
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Targets</span>
            </button>
          </div>
        </div>
      </div>

      <Feedback toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
