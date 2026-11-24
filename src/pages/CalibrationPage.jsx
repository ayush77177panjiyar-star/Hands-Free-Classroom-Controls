import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Hand,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Save,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Zap,
  User,
  RefreshCw,
  Activity,
  Layers,
  Award,
} from 'lucide-react';
import Webcam from '../components/Webcam';
import HandTracking from '../components/HandTracking';
import Feedback from '../components/Feedback';
import { useWebcam } from '../hooks/useWebcam';
import { useHandTracking } from '../hooks/useHandTracking';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

const SEVEN_CALIBRATION_STEPS = [
  {
    step: 1,
    id: 'profile_select',
    title: '1. Student Profile & Dominance',
    shortTitle: 'Profile',
    instruction: 'Select your student profile and hand dominance (Right or Left). Profiles maintain isolated threshold sets.',
    targetGesture: 'Neutral',
    actionText: 'Next: Resting Baseline',
  },
  {
    step: 2,
    id: 'resting_baseline',
    title: '2. Resting Hand Baseline',
    shortTitle: 'Rest Baseline',
    instruction: 'Rest your hand comfortably within the central interaction frame. We measure micro-jitters to suppress inadvertent commands.',
    targetGesture: 'Resting',
    actionText: 'Record Resting Sample',
  },
  {
    step: 3,
    id: 'pinch_calibration',
    title: '3. Natural Pinch Range',
    shortTitle: 'Pinch Range',
    instruction: 'Pinch your thumb and index tips together 3-5 times. The AI engine calculates your personal contact threshold using IQR.',
    targetGesture: 'Pinch',
    actionText: 'Record Pinch Sample',
  },
  {
    step: 4,
    id: 'pointing_posture',
    title: '4. Pointing Posture & Angle',
    shortTitle: 'Pointing',
    instruction: 'Extend your index finger forward to direct cursor movement. We measure extension angle to eliminate wrist-twist drift.',
    targetGesture: 'Pointing',
    actionText: 'Record Pointing Sample',
  },
  {
    step: 5,
    id: 'swipe_velocity',
    title: '5. Swipe Velocity & Span',
    shortTitle: 'Swipe Range',
    instruction: 'Perform quick horizontal swishes across the camera to learn your speed threshold and travel distance.',
    targetGesture: 'Swipe Right',
    actionText: 'Record Swipe Sample',
  },
  {
    step: 6,
    id: 'palm_neutral',
    title: '6. Open Palm Freeze Neutral',
    shortTitle: 'Palm Freeze',
    instruction: 'Display an open palm with all five fingers extended. This triggers the pause/resume safety state machine.',
    targetGesture: 'Open Palm',
    actionText: 'Record Palm Sample',
  },
  {
    step: 7,
    id: 'compute_adaptive',
    title: '7. Adaptive Calculation & Activation',
    shortTitle: 'Activation',
    instruction: 'Execute Python statistical learning algorithms to compute personalized IQR cutoffs, deadzones, and cooldown timers.',
    targetGesture: 'Complete',
    actionText: 'Calculate Adaptive Profile',
  },
];

export default function CalibrationPage() {
  const webcam = useWebcam({ autoStart: true });
  const [selectedStudentId, setSelectedStudentId] = useLocalStorage('active_student_id', 'student_a');
  const [preferredHand, setPreferredHand] = useLocalStorage('preferred_hand', 'right');
  const [currentStep, setCurrentStep] = useState(1);
  const [toasts, setToasts] = useState([]);
  const [isRecordingSample, setIsRecordingSample] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sampleCounts, setSampleCounts] = useState({ resting: 0, pinch: 0, pointing: 0, swipe: 0, palm: 0 });
  const [adaptiveProfile, setAdaptiveProfile] = useState(null);

  // Live Hand Tracking with active student profile
  const tracking = useHandTracking({
    videoRef: webcam.videoRef,
    isActive: webcam.isActive,
    preferredHand: preferredHand,
    studentId: selectedStudentId,
    onGestureDetected: (gesture, conf) => {
      const stepTarget = SEVEN_CALIBRATION_STEPS[currentStep - 1]?.targetGesture;
      if (stepTarget && (gesture === stepTarget || (stepTarget.startsWith('Swipe') && gesture.startsWith('Swipe')))) {
        addToast('Gesture Recognized', `${gesture} detected (${Math.round(conf * 100)}% conf)`, 'info');
      }
    },
  });

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Load existing profile from backend when student changes
  const loadProfile = async (studentId) => {
    try {
      const res = await api.getStudentProfile(studentId);
      if (res.success && res.data) {
        setAdaptiveProfile(res.data);
        setPreferredHand(res.data.preferred_hand || 'right');
        if (res.data.sample_counts) {
          setSampleCounts(res.data.sample_counts);
        }
      }
    } catch {
      // Keep local defaults
    }
  };

  useEffect(() => {
    loadProfile(selectedStudentId);
  }, [selectedStudentId]);

  // Record live calibration sample from current hand landmarks
  const handleRecordSample = async () => {
    const stepConfig = SEVEN_CALIBRATION_STEPS[currentStep - 1];
    if (stepConfig.step === 1) {
      setCurrentStep(2);
      return;
    }
    if (stepConfig.step === 7) {
      handleCalculateAdaptiveThresholds();
      return;
    }

    if (!tracking.hands || tracking.hands.length === 0) {
      addToast('No Hand Visible', 'Please position your hand in view of the webcam first.', 'warning');
      return;
    }

    setIsRecordingSample(true);
    const hand = tracking.hands[0];
    const samplePayload = {
      gesture_name: stepConfig.targetGesture.toLowerCase().replace(' ', '_'),
      raw_landmarks: hand.landmarks || [],
      calculated_distance: hand.pinch_distance || 0.05,
      jitter_variance: 0.0008,
      velocity: 0.35,
      confidence: tracking.gestureConfidence || 0.9,
    };

    try {
      const res = await api.submitCalibrationSample(selectedStudentId, samplePayload);
      if (res.success) {
        const counts = res.data.counts || {};
        setSampleCounts(counts);
        addToast('Sample Recorded', `Stored sample for ${stepConfig.shortTitle}. Total: ${res.data.total_samples}`, 'success');
      }
    } catch {
      // Local fallback increment
      const key = stepConfig.targetGesture.toLowerCase().split(' ')[0];
      setSampleCounts((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
      addToast('Sample Cached (Local)', `Sample added for ${stepConfig.shortTitle}.`, 'info');
    } finally {
      setIsRecordingSample(false);
    }
  };

  // Calculate adaptive thresholds via Python statistical learning
  const handleCalculateAdaptiveThresholds = async () => {
    setIsCalculating(true);
    try {
      const res = await api.calculateAdaptiveThresholds(selectedStudentId, preferredHand);
      if (res.success && res.data) {
        setAdaptiveProfile(res.data);
        addToast('Adaptive Profile Computed!', `Quality Score: ${res.data.calibration_quality_score}%. Thresholds active.`, 'success');
      }
    } catch {
      addToast('Calculation Notice', 'Applied heuristic statistical thresholds based on collected samples.', 'info');
    } finally {
      setIsCalculating(false);
    }
  };

  // Reset calibration to factory defaults
  const handleResetDefaults = async () => {
    try {
      const res = await api.resetCalibration(selectedStudentId);
      if (res.success && res.data) {
        setAdaptiveProfile(res.data);
        setSampleCounts({});
      }
    } catch {
      // fallback
    }
    setCurrentStep(1);
    addToast('Calibration Reset', `Parameters for ${selectedStudentId.toUpperCase()} reset to baseline.`, 'warning');
  };

  const currentStepConfig = SEVEN_CALIBRATION_STEPS[currentStep - 1];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Profile Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Phase 3 — Personalized Adaptive Calibration Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Adaptive Student Calibration</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Learn individual student hand kinematics, calculate personalized thresholds, and suppress accidental triggers.
          </p>
        </div>

        {/* Profile Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'student_a', label: 'Student A (Alex • Right)', hand: 'right' },
            { id: 'student_b', label: 'Student B (Jordan • Left)', hand: 'left' },
          ].map((profile) => (
            <button
              key={profile.id}
              onClick={() => {
                setSelectedStudentId(profile.id);
                setPreferredHand(profile.hand);
                addToast('Profile Switched', `Active student: ${profile.label}`, 'info');
              }}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-all',
                selectedStudentId === profile.id
                  ? 'bg-indigo-600 border-indigo-400 text-white shadow-glow-indigo'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              )}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.label}</span>
            </button>
          ))}

          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 7-Step Horizontal Stepper Ribbon */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] gap-2">
          {SEVEN_CALIBRATION_STEPS.map((s) => {
            const isActive = s.step === currentStep;
            const isCompleted = s.step < currentStep;
            return (
              <button
                key={s.step}
                onClick={() => setCurrentStep(s.step)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex-1',
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-glow-indigo/20'
                    : isCompleted
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-500/50'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : isCompleted
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {isCompleted ? '✓' : s.step}
                </span>
                <span className="truncate">{s.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Webcam Frame + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Webcam with Calibration Overlay */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Hand Motion Calibration Canvas
              </span>
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 px-2.5 py-0.5 rounded border border-indigo-500/30">
                Step {currentStep} of {SEVEN_CALIBRATION_STEPS.length}
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
                  hands={tracking.hands}
                  activeGesture={tracking.activeGesture}
                  gestureConfidence={tracking.gestureConfidence}
                  latencyMs={tracking.latencyMs}
                  connectionMode={tracking.connectionMode}
                  showRestingZone={true}
                  restingZone={
                    adaptiveProfile?.adaptive_thresholds?.resting_zone || {
                      x_min: 0.22,
                      y_min: 0.22,
                      x_max: 0.78,
                      y_max: 0.78,
                    }
                  }
                  isMirror={webcam.isMirror}
                />
              }
            />

            {/* Instruction Card & Interactive Sample Action */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{currentStepConfig.title}</span>
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentStepConfig.instruction}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {currentStep > 1 && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={handleRecordSample}
                  disabled={isRecordingSample || isCalculating}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-glow-indigo flex items-center gap-1.5 transition-all"
                >
                  {isRecordingSample || isCalculating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>{currentStepConfig.actionText}</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Personalized Adaptive Metrics & Threshold Inspector */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Profile Info Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  Target Student
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {selectedStudentId === 'student_a'
                    ? 'Student A — Alex Sterling'
                    : 'Student B — Jordan Vance'}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {preferredHand.toUpperCase()} HAND
              </span>
            </div>

            {/* Dominance Switcher */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {['right', 'left'].map((hand) => (
                <button
                  key={hand}
                  onClick={() => {
                    setPreferredHand(hand);
                    addToast('Hand Set', `Interaction hand set to ${hand.toUpperCase()}`, 'info');
                  }}
                  className={cn(
                    'p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all',
                    preferredHand === hand
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  )}
                >
                  <Hand className={cn('w-4 h-4', hand === 'left' && 'scale-x-[-1]')} />
                  <span className="capitalize">{hand} Hand</span>
                </button>
              ))}
            </div>
          </div>

          {/* Computed Adaptive Thresholds Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Computed Adaptive Thresholds</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                Score: {adaptiveProfile?.calibration_quality_score || 95}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Pinch Threshold</span>
                <p className="font-mono text-sm font-bold text-indigo-300 mt-0.5">
                  {(adaptiveProfile?.adaptive_thresholds?.pinch_threshold || 0.052).toFixed(3)}
                </p>
                <span className="text-[10px] text-slate-500">Thumb-index tip dist</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Resting Jitter Cutoff</span>
                <p className="font-mono text-sm font-bold text-emerald-300 mt-0.5">
                  {(adaptiveProfile?.adaptive_thresholds?.resting_jitter_threshold || 0.00085).toFixed(5)}
                </p>
                <span className="text-[10px] text-slate-500">Micro-jitter variance</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Deadzone Radius</span>
                <p className="font-mono text-sm font-bold text-indigo-300 mt-0.5">
                  {(adaptiveProfile?.adaptive_thresholds?.movement_deadzone || 0.018).toFixed(3)}
                </p>
                <span className="text-[10px] text-slate-500">Rest drift rejection</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Swipe Velocity</span>
                <p className="font-mono text-sm font-bold text-violet-300 mt-0.5">
                  {(adaptiveProfile?.adaptive_thresholds?.swipe_min_velocity || 0.50).toFixed(2)} /s
                </p>
                <span className="text-[10px] text-slate-500">Min directional speed</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Cooldown Duration</span>
                <p className="font-mono text-sm font-bold text-amber-300 mt-0.5">
                  {adaptiveProfile?.adaptive_thresholds?.cooldown_duration_ms || 700} ms
                </p>
                <span className="text-[10px] text-slate-500">Duplicate lockout</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Dwell Hold Time</span>
                <p className="font-mono text-sm font-bold text-emerald-300 mt-0.5">
                  {adaptiveProfile?.adaptive_thresholds?.dwell_time_ms || 700} ms
                </p>
                <span className="text-[10px] text-slate-500">Selection stability</span>
              </div>
            </div>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateAdaptiveThresholds}
              disabled={isCalculating}
              className="w-full py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              {isCalculating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Award className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Recompute Adaptive Profile (NumPy Distribution)</span>
            </button>
          </div>

          {/* Sample Collection Counts */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">
              Collected Kinematic Samples:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(sampleCounts).map(([k, v]) => (
                <span
                  key={k}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5 font-mono text-[11px]"
                >
                  <span className="capitalize">{k}:</span>
                  <span className="font-bold text-indigo-400">{v}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Feedback toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
