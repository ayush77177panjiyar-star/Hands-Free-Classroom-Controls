import React, { useState } from 'react';
import {
  Settings,
  Camera,
  Sliders,
  Sparkles,
  Accessibility,
  User,
  RotateCcw,
  Save,
  Check,
  Download,
  Upload,
  AlertTriangle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import Feedback from '../components/Feedback';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

export default function SettingsPage() {
  const [toasts, setToasts] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);

  // Settings State in LocalStorage
  const [cameraPrefs, setCameraPrefs] = useLocalStorage('settings_camera', {
    resolution: '720p',
    targetFps: '30',
    mirrorVideo: true,
    autoStart: true,
  });

  const [sensitivity, setSensitivity] = useLocalStorage('gesture_sensitivity', {
    cursor_speed: 1.2,
    smoothing_factor: 0.65,
    pinch_threshold: 0.05,
    dwell_time_ms: 700,
    deadzone_radius: 0.02,
  });

  const [gestureMappings, setGestureMappings] = useLocalStorage('gesture_mappings', {
    pinch: 'Select / Click',
    swipeRight: 'Next Question / Slide',
    swipeLeft: 'Previous Question / Slide',
    openPalm: 'Pause / Freeze Interaction',
    peaceSign: 'Open Accessibility Menu',
  });

  const [accessibility, setAccessibility] = useLocalStorage('settings_accessibility', {
    highContrast: false,
    audioCues: true,
    cursorSize: 'medium', // small, medium, large
    leftHandMode: false,
  });

  const [profileName, setProfileName] = useLocalStorage('active_profile_name', 'Alex Sterling');

  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const handleSaveAll = () => {
    addToast('Preferences Saved', 'All camera, gesture, and accessibility settings saved.', 'success');
  };

  const handleExportJson = () => {
    const data = {
      cameraPrefs,
      sensitivity,
      gestureMappings,
      accessibility,
      profileName,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hands_free_config_${Date.now()}.json`;
    a.click();
    addToast('Settings Exported', 'Configuration JSON downloaded to your device.', 'info');
  };

  const handleConfirmReset = async () => {
    setSensitivity({
      cursor_speed: 1.2,
      smoothing_factor: 0.65,
      pinch_threshold: 0.05,
      dwell_time_ms: 700,
      deadzone_radius: 0.02,
    });
    setGestureMappings({
      pinch: 'Select / Click',
      swipeRight: 'Next Question / Slide',
      swipeLeft: 'Previous Question / Slide',
      openPalm: 'Pause / Freeze Interaction',
      peaceSign: 'Open Accessibility Menu',
    });
    setAccessibility({
      highContrast: false,
      audioCues: true,
      cursorSize: 'medium',
      leftHandMode: false,
    });

    try {
      await api.resetCalibration('default_student');
    } catch {}

    setShowResetModal(false);
    addToast('Factory Defaults Restored', 'All calibration and sensitivity settings have been reset.', 'warning');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Settings className="w-4 h-4" />
            <span>Preferences & Hardware Configuration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">Application Settings</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Customize webcam processing parameters, fine-tune gesture thresholds, and map controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-rose-400" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-glow-indigo flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Camera Preferences */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-indigo-400" />
            <span>Camera & Stream Preferences</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Resolution */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Capture Resolution</p>
                <p className="text-[11px] text-slate-400">Higher resolutions increase precision but require more GPU</p>
              </div>
              <select
                value={cameraPrefs.resolution}
                onChange={(e) => setCameraPrefs({ ...cameraPrefs, resolution: e.target.value })}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="480p">480p (Fast)</option>
                <option value="720p">720p (Recommended)</option>
                <option value="1080p">1080p (High Res)</option>
              </select>
            </div>

            {/* Target FPS */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Target Frame Rate</p>
                <p className="text-[11px] text-slate-400">Target video capture rate for tracking pipeline</p>
              </div>
              <select
                value={cameraPrefs.targetFps}
                onChange={(e) => setCameraPrefs({ ...cameraPrefs, targetFps: e.target.value })}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="30">30 FPS (Balanced)</option>
                <option value="60">60 FPS (Ultra Smooth)</option>
              </select>
            </div>

            {/* Mirror Mode */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Mirror Video Feed</p>
                <p className="text-[11px] text-slate-400">Flips feed horizontally like a physical mirror</p>
              </div>
              <input
                type="checkbox"
                checked={cameraPrefs.mirrorVideo}
                onChange={(e) => setCameraPrefs({ ...cameraPrefs, mirrorVideo: e.target.checked })}
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2. Gesture Sensitivity */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Gesture Sensitivity Thresholds</span>
          </h3>

          <div className="space-y-4 text-xs">
            {/* Speed */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Movement Velocity Multiplier</span>
                <span className="font-mono text-indigo-300 font-semibold">{sensitivity.cursor_speed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={sensitivity.cursor_speed}
                onChange={(e) =>
                  setSensitivity({ ...sensitivity, cursor_speed: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Dwell Timer */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Dwell Selection Timer</span>
                <span className="font-mono text-indigo-300 font-semibold">{sensitivity.dwell_time_ms} ms</span>
              </div>
              <input
                type="range"
                min="400"
                max="1500"
                step="50"
                value={sensitivity.dwell_time_ms}
                onChange={(e) =>
                  setSensitivity({ ...sensitivity, dwell_time_ms: parseInt(e.target.value) })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Deadzone */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Micro-Jitter Deadzone Radius</span>
                <span className="font-mono text-indigo-300 font-semibold">{sensitivity.deadzone_radius}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.05"
                step="0.005"
                value={sensitivity.deadzone_radius}
                onChange={(e) =>
                  setSensitivity({ ...sensitivity, deadzone_radius: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 3. Gesture Mappings Editor */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Gesture Action Mappings</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            {[
              { key: 'pinch', label: 'Index + Thumb Pinch' },
              { key: 'swipeRight', label: 'Wave Right (⇨)' },
              { key: 'swipeLeft', label: 'Wave Left (⇦)' },
              { key: 'openPalm', label: 'Open Palm Hold' },
              { key: 'peaceSign', label: 'Two Fingers Peace Sign' },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800"
              >
                <span className="font-medium text-slate-300">{label}</span>
                <input
                  type="text"
                  value={gestureMappings[key] || ''}
                  onChange={(e) =>
                    setGestureMappings({ ...gestureMappings, [key]: e.target.value })
                  }
                  className="bg-slate-950 border border-slate-700 text-indigo-300 text-xs rounded-lg px-2.5 py-1 w-48 text-right focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Accessibility Preferences & Profile Management */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Accessibility className="w-4 h-4 text-indigo-400" />
            <span>Accessibility & Profile Management</span>
          </h3>

          <div className="space-y-3 text-xs">
            {/* Active Profile */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
              <label className="font-semibold text-white">Active Student Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Audio Cues Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Audio Feedback Cues</p>
                <p className="text-[11px] text-slate-400">Play subtle sound chime when a gesture triggers</p>
              </div>
              <input
                type="checkbox"
                checked={accessibility.audioCues}
                onChange={(e) =>
                  setAccessibility({ ...accessibility, audioCues: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
              />
            </div>

            {/* Virtual Cursor Size */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <p className="font-semibold text-white">Virtual Cursor Pointer Size</p>
                <p className="text-[11px] text-slate-400">Enlarge pointer for higher visibility</p>
              </div>
              <select
                value={accessibility.cursorSize}
                onChange={(e) =>
                  setAccessibility({ ...accessibility, cursorSize: e.target.value })
                }
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none"
              >
                <option value="small">Small (28px)</option>
                <option value="medium">Medium (36px)</option>
                <option value="large">Large (48px)</option>
              </select>
            </div>

            {/* Export & Import Profile */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExportJson}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Profile JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Reset Defaults */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full p-6 glass-card rounded-2xl border border-rose-500/30 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 flex-shrink-0" />
              <h4 className="text-base font-bold text-white">Reset Calibration to Defaults?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will reset all sensitivity thresholds, resting zones, and gesture mappings back to
              original factory recommendations. Any custom tuning will be overwritten.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md"
              >
                Yes, Reset Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      <Feedback toasts={toasts} onDismiss={(id) => setToasts(toasts.filter((t) => t.id !== id))} />
    </div>
  );
}
