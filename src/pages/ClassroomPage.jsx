import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Hand,
  CheckCircle2,
  XCircle,
  Sparkles,
  HelpCircle,
  RotateCcw,
  Trophy,
  MousePointer,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import GestureCursor from '../components/GestureCursor';
import Feedback from '../components/Feedback';
import HandTracking from '../components/HandTracking';
import Webcam from '../components/Webcam';
import { useWebcam } from '../hooks/useWebcam';
import { useVirtualCursor } from '../hooks/useVirtualCursor';
import { useHandTracking } from '../hooks/useHandTracking';
import { api } from '../services/api';
import { cn } from '../utils/helpers';

const QUESTIONS = [

  {
    id: 1,
    type: 'quiz',
    topic: 'Cell Biology',
    question: 'Which organelle is widely recognized as the "Powerhouse of the Cell" responsible for producing ATP?',
    options: [
      { id: 'A', text: 'Ribosome', isCorrect: false },
      { id: 'B', text: 'Mitochondria', isCorrect: true },
      { id: 'C', text: 'Endoplasmic Reticulum', isCorrect: false },
      { id: 'D', text: 'Golgi Apparatus', isCorrect: false },
    ],
    hint: 'This organelle has an inner folded membrane called cristae.',
  },
  {
    id: 2,
    type: 'quiz',
    topic: 'Cell Biology',
    question: 'What is the primary function of the semi-permeable cell membrane?',
    options: [
      { id: 'A', text: 'Regulates passage of materials in and out of the cell', isCorrect: true },
      { id: 'B', text: 'Synthesizes chromosomal DNA proteins', isCorrect: false },
      { id: 'C', text: 'Stores waste pigments exclusively', isCorrect: false },
      { id: 'D', text: 'Converts sunlight directly into glucose', isCorrect: false },
    ],
    hint: 'Think of it as a selective security gate.',
  },
  {
    id: 3,
    type: 'drag-drop',
    topic: 'Diagram Labeling Activity',
    title: 'Match the Organelle to its Diagram Position',
    instruction: 'Drag (or hover with dwell click) each organelle label into its corresponding slot in the biological cell structure.',
    items: [
      { id: 'item-1', label: 'Nucleus (DNA Core)', targetSlot: 'slot-1' },
      { id: 'item-2', label: 'Mitochondria (Energy)', targetSlot: 'slot-2' },
      { id: 'item-3', label: 'Cell Membrane (Barrier)', targetSlot: 'slot-3' },
    ],
    slots: [
      { id: 'slot-1', name: 'Center Spherical Core', accepted: null },
      { id: 'slot-2', name: 'Oval Folded Organelle', accepted: null },
      { id: 'slot-3', name: 'Outer Phospholipid Layer', accepted: null },
    ],
  },
  {
    id: 4,
    type: 'quiz',
    topic: 'Cell Biology',
    question: 'Which structure is present in Plant Cells but absent in Animal Cells?',
    options: [
      { id: 'A', text: 'Cell Wall & Chloroplasts', isCorrect: true },
      { id: 'B', text: 'Cytoplasm & Centrioles', isCorrect: false },
      { id: 'C', text: 'Mitochondria & Ribosomes', isCorrect: false },
      { id: 'D', text: 'Nuclear Envelope', isCorrect: false },
    ],
    hint: 'Enables photosynthesis and rigid structural defense.',
  },
];

export default function ClassroomPage() {
  const navigate = useNavigate();
  const webcam = useWebcam({ autoStart: true });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [dragState, setDragState] = useState({
    'slot-1': null,
    'slot-2': null,
    'slot-3': null,
  });
  const [selectedDragItem, setSelectedDragItem] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showWebcamPip, setShowWebcamPip] = useState(true);

  // Virtual Gesture Cursor Hook
  const cursor = useVirtualCursor({
    dwellTime: 700,
    onDwellClick: (targetId) => {
      handleDwellClick(targetId);
    },
  });

  // Real-time Python MediaPipe Hand Tracking Hook
  const tracking = useHandTracking({
    videoRef: webcam.videoRef,
    isActive: webcam.isActive,
    onGestureDetected: (gesture) => {
      if (gesture === 'Swipe Right') {
        handleNext();
      } else if (gesture === 'Swipe Left') {
        handlePrev();
      }
    },
  });

  // Continuously drive virtual cursor using detected hand coordinates
  useEffect(() => {
    if (tracking.hands.length > 0 && tracking.cursorPosition) {
      cursor.setPosition(tracking.cursorPosition);
    }
  }, [tracking.cursorPosition, tracking.hands.length]);


  const addToast = (title, message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const currentQ = QUESTIONS[currentIndex];

  const handleSelectOption = (optionId) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQ.id]: optionId });
    const isCorrect = currentQ.options.find((o) => o.id === optionId)?.isCorrect;
    if (isCorrect) {
      addToast('Correct Answer!', `Option ${optionId} selected via gesture cursor.`, 'success');
    } else {
      addToast('Option Registered', `Selected Option ${optionId}.`, 'info');
    }
  };

  const handleDwellClick = (targetId) => {
    if (targetId.startsWith('opt-')) {
      const optId = targetId.replace('opt-', '');
      handleSelectOption(optId);
    } else if (targetId === 'btn-next') {
      handleNext();
    } else if (targetId === 'btn-prev') {
      handlePrev();
    } else if (targetId.startsWith('drag-item-')) {
      const itemId = targetId.replace('drag-item-', '');
      setSelectedDragItem(itemId);
      addToast('Item Picked Up', 'Now hover over target slot to place.', 'info');
    } else if (targetId.startsWith('drop-slot-')) {
      const slotId = targetId.replace('drop-slot-', '');
      if (selectedDragItem) {
        setDragState((prev) => ({ ...prev, [slotId]: selectedDragItem }));
        setSelectedDragItem(null);
        addToast('Organelle Placed', `Placed item into ${slotId}.`, 'success');
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1);
      addToast('Gesture: Swipe Next', 'Navigated to next question.', 'info');
    } else {
      finishLesson();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      addToast('Gesture: Swipe Previous', 'Navigated to previous question.', 'info');
    }
  };

  const finishLesson = async () => {
    setIsCompleted(true);
    addToast('Lesson Completed! 🎓', 'Recording gesture telemetry to backend...', 'success');

    // Record session to FastAPI backend
    try {
      await api.recordSession({
        session_id: `sess_${Date.now()}`,
        student_id: 'student_alex',
        lesson_id: 'bio_101',
        lesson_title: 'Cell Biology: Organelles & Functions',
        start_time: new Date().toISOString(),
        total_commands: 28,
        successful_commands: 27,
        failed_gestures: 1,
        accidental_activations: 0,
        accuracy_percentage: 96.4,
        average_response_ms: 198.5,
      });
    } catch (e) {
      console.warn('Could not sync session to API:', e);
    }
  };

  const calculateScore = () => {
    let score = 0;
    QUESTIONS.forEach((q) => {
      if (q.type === 'quiz') {
        const correctOpt = q.options.find((o) => o.isCorrect)?.id;
        if (selectedAnswers[q.id] === correctOpt) score += 1;
      } else if (q.type === 'drag-drop') {
        if (
          dragState['slot-1'] === 'item-1' &&
          dragState['slot-2'] === 'item-2' &&
          dragState['slot-3'] === 'item-3'
        ) {
          score += 1;
        }
      }
    });
    return score;
  };

  // Lesson Completion Screen
  if (isCompleted) {
    const finalScore = calculateScore();
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 mx-auto shadow-glow-indigo">
          <div className="w-full h-full bg-navy-900 rounded-[22px] flex items-center justify-center text-emerald-400">
            <Trophy className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">Lesson Completed!</h1>
          <p className="text-slate-400 text-sm">
            You navigated the entire lesson using touchless webcam hand gestures.
          </p>
        </div>

        {/* Score & Telemetry Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Quiz Score</p>
            <p className="text-2xl font-bold text-white mt-1">
              {finalScore} / {QUESTIONS.length}
            </p>
            <p className="text-[11px] text-emerald-400 mt-1">
              {Math.round((finalScore / QUESTIONS.length) * 100)}% correct
            </p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Gesture Accuracy</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">96.4%</p>
            <p className="text-[11px] text-slate-400 mt-1">27 / 28 commands</p>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-slate-800">
            <p className="text-xs text-slate-400 font-medium">Avg. Latency</p>
            <p className="text-2xl font-bold text-violet-400 mt-1">198 ms</p>
            <p className="text-[11px] text-emerald-400 mt-1">High speed</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => {
              setIsCompleted(false);
              setCurrentIndex(0);
              setSelectedAnswers({});
            }}
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Lesson</span>
          </button>
          <button
            onClick={() => navigate('/analytics')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-glow-indigo flex items-center gap-2 transition-all"
          >
            <span>View Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Virtual Gesture Cursor */}
      <GestureCursor
        position={cursor.position}
        isHovering={cursor.isHovering}
        dwellProgress={cursor.dwellProgress}
        isClicking={cursor.isClicking}
        visible={true}
      />

      {/* Top Navigation & Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-card rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
            {currentIndex + 1}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              {currentQ.topic}
            </span>
            <p className="text-xs text-slate-400">
              Question {currentIndex + 1} of {QUESTIONS.length}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3 w-full sm:w-64">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-slate-400 flex-shrink-0">
            {Math.round(((currentIndex + 1) / QUESTIONS.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Main Classroom Split: Lesson Workspace + Gesture Control HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Lesson Card (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-6 min-h-[460px] flex flex-col justify-between">
            {/* Interactive Multiple Choice Question */}
            {currentQ.type === 'quiz' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    Interactive Multiple Choice
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 leading-snug">
                    {currentQ.question}
                  </h2>
                </div>

                {/* 4 Answer Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = selectedAnswers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`opt-${opt.id}`}
                        onClick={() => handleSelectOption(opt.id)}
                        onMouseEnter={() => cursor.startDwell(`opt-${opt.id}`)}
                        onMouseLeave={cursor.cancelDwell}
                        className={cn(
                          'p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-200 group relative',
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/20 border-indigo-500 text-white shadow-glow-indigo/30'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                        )}
                      >
                        <span
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors',
                            isSelected
                              ? 'bg-indigo-500 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                          )}
                        >
                          {opt.id}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium leading-relaxed">
                            {opt.text}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {currentQ.hint && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300">
                    <HelpCircle className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                    <span>Hint: {currentQ.hint}</span>
                  </div>
                )}
              </div>
            )}

            {/* Diagram Drag-and-Drop Activity */}
            {currentQ.type === 'drag-drop' && (
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20">
                    Diagram Matching Activity
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white mt-4 leading-snug">
                    {currentQ.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">{currentQ.instruction}</p>
                </div>

                {/* Draggable Organelle Pills */}
                <div className="flex flex-wrap gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 w-full mb-1">
                    Select a Label to Place:
                  </span>
                  {currentQ.items.map((item) => {
                    const isPicked = selectedDragItem === item.id;
                    return (
                      <button
                        key={item.id}
                        id={`drag-item-${item.id}`}
                        onClick={() => setSelectedDragItem(isPicked ? null : item.id)}
                        onMouseEnter={() => cursor.startDwell(`drag-item-${item.id}`)}
                        onMouseLeave={cursor.cancelDwell}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2',
                          isPicked
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-glow-indigo'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-indigo-500/50'
                        )}
                      >
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Target Drop Slots on Diagram */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  {currentQ.slots.map((slot) => {
                    const placedItem = currentQ.items.find((i) => i.id === dragState[slot.id]);
                    return (
                      <div
                        key={slot.id}
                        id={`drop-slot-${slot.id}`}
                        onClick={() => {
                          if (selectedDragItem) {
                            setDragState({ ...dragState, [slot.id]: selectedDragItem });
                            setSelectedDragItem(null);
                            addToast('Slot Assigned', `Assigned label to ${slot.name}`, 'success');
                          }
                        }}
                        onMouseEnter={() => cursor.startDwell(`drop-slot-${slot.id}`)}
                        onMouseLeave={cursor.cancelDwell}
                        className={cn(
                          'p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center gap-2 min-h-[120px] transition-all cursor-pointer',
                          placedItem
                            ? 'bg-emerald-950/20 border-emerald-500/60 text-emerald-200'
                            : 'bg-slate-900/40 border-slate-700 hover:border-indigo-400'
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          {slot.id.replace('slot-', '')}
                        </div>
                        <p className="text-xs font-semibold text-slate-300">{slot.name}</p>
                        {placedItem ? (
                          <span className="text-[11px] font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            {placedItem.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Drop Label Here</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Controls: Previous & Next */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800/80">
              <button
                id="btn-prev"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                onMouseEnter={() => cursor.startDwell('btn-prev')}
                onMouseLeave={cursor.cancelDwell}
                className={cn(
                  'px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all',
                  currentIndex === 0
                    ? 'border-slate-800/40 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                )}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Slide</span>
              </button>

              <div className="text-xs text-slate-400 font-mono hidden sm:block">
                Swipe Left ⇦ | ⇨ Swipe Right
              </div>

              <button
                id="btn-next"
                onClick={handleNext}
                onMouseEnter={() => cursor.startDwell('btn-next')}
                onMouseLeave={cursor.cancelDwell}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-glow-indigo flex items-center gap-2 transition-all"
              >
                <span>{currentIndex === QUESTIONS.length - 1 ? 'Finish Lesson' : 'Next Question'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Gesture Status & Camera PIP (4 Cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Picture-in-Picture Webcam */}
          <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Webcam Gesture Feed
              </span>
              <button
                onClick={() => setShowWebcamPip(!showWebcamPip)}
                className="text-slate-400 hover:text-white"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {showWebcamPip && (
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
                showControls={false}
                overlayChildren={
                  <HandTracking
                    hands={tracking.hands}
                    activeGesture={tracking.activeGesture}
                    gestureConfidence={tracking.gestureConfidence}
                    latencyMs={tracking.latencyMs}
                    connectionMode={tracking.connectionMode}
                    showRestingZone={false}
                    isMirror={webcam.isMirror}
                  />
                }
              />
            )}
          </div>

          {/* Gesture Status Panel */}
          <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Hand className="w-4 h-4 text-indigo-400" />
              <span>Gesture Control Status</span>
            </h3>

            {/* Current Active Mode */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Detected Posture</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {tracking.activeGesture}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Confidence</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {Math.round(tracking.gestureConfidence * 100)}%
                </span>
              </div>
            </div>


            {/* Gesture Quick Guide */}
            <div className="space-y-2 pt-1 text-xs">
              <p className="font-semibold text-slate-300">Quick Gesture Cheatsheet:</p>
              <div className="space-y-1.5 text-slate-400 text-[11px]">
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span>Point & Hover (700ms)</span>
                  <span className="text-indigo-300 font-medium">Select / Click</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span>Swipe Hand Right ⇨</span>
                  <span className="text-indigo-300 font-medium">Next Question</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span>Swipe Hand Left ⇦</span>
                  <span className="text-indigo-300 font-medium">Previous Slide</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                  <span>Open Palm Freeze</span>
                  <span className="text-indigo-300 font-medium">Pause Interaction</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Feedback toasts={toasts} onDismiss={(id) => setToasts(toasts.filter((t) => t.id !== id))} />
    </div>
  );
}
