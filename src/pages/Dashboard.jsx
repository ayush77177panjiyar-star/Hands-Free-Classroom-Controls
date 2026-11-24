import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  GraduationCap,
  Camera,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  MousePointer2,
  Zap,
  Clock,
  RotateCcw,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import Webcam from '../components/Webcam';
import HandTracking from '../components/HandTracking';
import { useWebcam } from '../hooks/useWebcam';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const webcam = useWebcam({ autoStart: false });
  const [sessions, setSessions] = useState([]);
  const [calibrationProfile, setCalibrationProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [sessRes, calRes] = await Promise.allSettled([
          api.getSessions(),
          api.getCalibration('default_student'),
        ]);

        if (sessRes.status === 'fulfilled' && sessRes.value?.data) {
          setSessions(sessRes.value.data);
        }
        if (calRes.status === 'fulfilled' && calRes.value?.data) {
          setCalibrationProfile(calRes.value.data);
        }
      } catch (e) {
        console.warn('Dashboard data load warning:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Hero Section */}
      <div className="relative rounded-3xl p-8 overflow-hidden glass-card border border-indigo-500/20 bg-gradient-to-r from-navy-900 via-navy-900/90 to-indigo-950/40">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-60 h-60 rounded-full bg-violet-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Touchless Learning Environment</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Welcome to <span className="text-gradient">Hands-Free Classroom</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Empower students with natural webcam gesture controls. Navigate lessons, answer
            interactive quizzes, and solve diagram activities without touching a mouse or keyboard.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => navigate('/classroom')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-glow-indigo transition-all duration-300 flex items-center gap-2 group"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Start Classroom</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => navigate('/calibration')}
              className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/80 font-semibold text-sm transition-all duration-200 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Start Calibration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Stat Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Successful Commands"
          value="428"
          subtitle="Across 14 classroom modules"
          icon={CheckCircle2}
          trend="+12.4% this week"
          trendPositive={true}
          badgeText="Verified gestures"
        />
        <StatCard
          title="Calibration Status"
          value={calibrationProfile ? `${calibrationProfile.calibration_score}%` : '94%'}
          subtitle="Profile: Right-hand dominant"
          icon={ShieldCheck}
          trend="Calibrated"
          trendPositive={true}
          badgeText="Optimal tracking"
        />
        <StatCard
          title="Avg. Response Time"
          value="215 ms"
          subtitle="Latency from gesture to click"
          icon={Clock}
          trend="-35ms faster"
          trendPositive={true}
          badgeText="High responsiveness"
        />
        <StatCard
          title="Recognition Accuracy"
          value="96.2%"
          subtitle="Pinch & swipe detection rate"
          icon={TrendingUp}
          trend="+2.1% improvement"
          trendPositive={true}
          badgeText="Low false-positives"
        />
      </div>

      {/* Main Grid: Live Webcam Feed & Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Webcam Status & Gesture Activity Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Webcam Connection Box */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-400" />
                  <span>Webcam Connection & Live Guide</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live visual feed with interaction boundary overlay and pointer tracking
                </p>
              </div>

              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5',
                  webcam.isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                )}
              >
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    webcam.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  )}
                />
                {webcam.isActive ? 'Stream Ready' : 'Camera Idle'}
              </span>
            </div>

            <Webcam
              videoRef={webcam.videoRef}
              isActive={webcam.isActive}
              hasPermission={webcam.hasPermission}
              error={webcam.error}
              devices={webcam.devices}
              selectedDeviceId={webcam.selectedDeviceId}
              onSelectDevice={webcam.setSelectedDeviceId}
              isMirror={webcam.isMirror}
              onToggleMirror={() => webcam.setIsMirror(!webcam.isMirror)}
              onStart={webcam.startStream}
              onStop={webcam.stopStream}
              overlayChildren={
                <HandTracking
                  handPosition={{ x: 50, y: 45 }}
                  isDetected={webcam.isActive}
                  handSide={calibrationProfile?.preferred_hand === 'left' ? 'Left' : 'Right'}
                  gestureName="Pointing Ready"
                  confidence={0.96}
                />
              }
            />
          </div>

          {/* Gesture Activity Overview */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <span>Gesture Activity Breakdown</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'Pinch Click', count: 184, rate: '96.2%', color: 'border-indigo-500/30' },
                { name: 'Swipe Next', count: 122, rate: '97.5%', color: 'border-blue-500/30' },
                { name: 'Swipe Prev', count: 58, rate: '93.1%', color: 'border-cyan-500/30' },
                { name: 'Palm Pause', count: 36, rate: '91.7%', color: 'border-violet-500/30' },
              ].map((g) => (
                <div
                  key={g.name}
                  className={cn(
                    'p-4 rounded-xl bg-slate-900/60 border hover:border-indigo-500/50 transition-colors',
                    g.color
                  )}
                >
                  <p className="text-xs font-medium text-slate-400">{g.name}</p>
                  <p className="text-xl font-bold text-white mt-1">{g.count}</p>
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">
                    {g.rate} accuracy
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Recent Sessions & Quick Calibration Check */}
        <div className="space-y-6">
          {/* Quick Calibration Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Current Calibration</h3>
              <button
                onClick={() => navigate('/calibration')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <span>Tweak</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Hand Preference</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {calibrationProfile?.preferred_hand || 'Right'} Hand
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Cursor Speed</span>
                <span className="font-semibold text-slate-200">
                  {calibrationProfile?.sensitivity?.cursor_speed || 1.2}x
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Dwell Click Timer</span>
                <span className="font-semibold text-slate-200">
                  {calibrationProfile?.sensitivity?.dwell_time_ms || 700} ms
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Smoothing Factor</span>
                <span className="font-semibold text-slate-200">
                  {calibrationProfile?.sensitivity?.smoothing_factor || 0.65}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Tracking Reliability</span>
                  <span className="font-bold text-emerald-400">94%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 w-[94%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Classroom Sessions List */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Recent Sessions</h3>
              <button
                onClick={() => navigate('/analytics')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {sessions.length > 0 ? (
                sessions.map((sess) => (
                  <div
                    key={sess.session_id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="truncate pr-2">
                        <p className="text-xs font-semibold text-white truncate">
                          {sess.lesson_title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {sess.total_commands} gestures • {sess.average_response_ms}ms avg
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {sess.accuracy_percentage}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No previous sessions recorded yet. Launch a classroom session to see logs!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
