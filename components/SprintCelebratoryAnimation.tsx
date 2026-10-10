import React, { useEffect, useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Sparkles, CheckCircle2, ArrowRight, X, Volume2, VolumeX, Flame } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

export interface SprintCelebratoryAnimationProps {
  isOpen: boolean;
  onClose?: () => void;
  onContinue?: () => void;
  sprintTitle?: string;
  totalDays?: number;
  completedDay?: number;
  streakCount?: number;
  completionNote?: string;
  soundEnabled?: boolean;
}

export const SprintCelebratoryAnimation: React.FC<SprintCelebratoryAnimationProps> = ({
  isOpen,
  onClose,
  onContinue,
  sprintTitle = 'Growth Sprint',
  totalDays = 5,
  completedDay = 5,
  streakCount = 0,
  completionNote,
  soundEnabled: initialSoundEnabled = true,
}) => {
  const [isAudioMuted, setIsAudioMuted] = useState(!initialSoundEnabled);
  const [hasInteracted, setHasInteracted] = useState(false);
  const confettiIntervalRef = useRef<any>(null);

  // Synthesize an uplifting celebratory chime using Web Audio API (works offline, zero latency, no 404s)
  const playCelebrationFanfare = useCallback(() => {
    if (isAudioMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Joyful rising arpeggio chord: C5 -> E5 -> G5 -> C6 (sparkling fanfare)
      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.16, gain: 0.22 },
        { freq: 659.25, time: 0.1, duration: 0.18, gain: 0.24 },
        { freq: 783.99, time: 0.22, duration: 0.22, gain: 0.26 },
        { freq: 1046.50, time: 0.36, duration: 0.65, gain: 0.28 },
      ];

      notes.forEach(({ freq, time, duration, gain: peakGain }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        gainNode.gain.setValueAtTime(0, now + time);
        gainNode.gain.linearRampToValueAtTime(peakGain, now + time + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + duration);
      });
    } catch {
      // Audio playback fails gracefully if blocked by autoplay policy
    }
  }, [isAudioMuted]);

  // High-energy confetti burst from center and flanks
  const launchConfetti = useCallback((intensity: 'full' | 'burst' = 'full') => {
    const brandColors = ['#0E7850', '#10B981', '#34D399', '#F59E0B', '#3B82F6', '#8B5CF6', '#FFFFFF'];

    if (intensity === 'burst') {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: brandColors,
        zIndex: 9999,
      });
      return;
    }

    // Phase 1: Center fountain
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.65 },
      colors: brandColors,
      startVelocity: 45,
      zIndex: 9999,
    });

    // Phase 2: Left flank cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 65,
        origin: { x: 0.1, y: 0.7 },
        colors: brandColors,
        startVelocity: 50,
        zIndex: 9999,
      });
    }, 180);

    // Phase 3: Right flank cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 65,
        origin: { x: 0.9, y: 0.7 },
        colors: brandColors,
        startVelocity: 50,
        zIndex: 9999,
      });
    }, 360);
  }, []);

  // Trigger celebration on open
  useEffect(() => {
    if (!isOpen) return;

    setHasInteracted(false);
    launchConfetti('full');
    playCelebrationFanfare();
    triggerHaptic(hapticPatterns.success);

    // Secondary subtle sparkle burst
    const timer = setTimeout(() => {
      launchConfetti('burst');
    }, 1400);

    return () => {
      clearTimeout(timer);
      if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
    };
  }, [isOpen, launchConfetti, playCelebrationFanfare]);

  // Handle keyboard escape or enter
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === 'Enter') {
        if (onContinue) onContinue();
        else onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onContinue]);

  const handleManualConfetti = () => {
    setHasInteracted(true);
    triggerHaptic(hapticPatterns.light);
    launchConfetti('burst');
    playCelebrationFanfare();
  };

  const handlePrimaryAction = () => {
    triggerHaptic(hapticPatterns.light);
    if (onContinue) {
      onContinue();
    } else if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[320] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in select-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="celebration-title"
      >
        {/* Ambient celebratory radial lighting */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-400/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-[120px]" />
        </div>

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden text-center p-6 sm:p-8 my-auto"
        >
          {/* Top Bar Controls */}
          <div className="flex items-center justify-between w-full mb-4">
            <button
              type="button"
              onClick={() => setIsAudioMuted((prev) => !prev)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              title={isAudioMuted ? 'Unmute celebration sound' : 'Mute celebration sound'}
              aria-label={isAudioMuted ? 'Unmute sound' : 'Mute sound'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-600" />}
            </button>

            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#0E7850] dark:text-emerald-400">
              Final Milestone Completed
            </span>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-95"
                title="Close celebration"
                aria-label="Close celebration"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Trophy & Badge Centerpiece */}
          <div className="relative mx-auto my-3 flex items-center justify-center">
            {/* Shimmering Aura Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              className="absolute w-36 h-36 rounded-full border border-dashed border-emerald-400/40 dark:border-emerald-500/30 pointer-events-none"
            />
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="absolute w-28 h-28 bg-gradient-to-tr from-emerald-500/20 via-amber-400/20 to-teal-400/20 rounded-full blur-xl pointer-events-none"
            />

            {/* Radiant Trophy Box */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
              className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-[#0E7850] via-[#10B981] to-[#047857] text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 border-2 border-emerald-300/40"
            >
              <Trophy className="w-12 h-12 sm:w-14 sm:h-14 text-amber-200 drop-shadow-md animate-bounce" />
              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs font-black shadow-sm">
                ★
              </div>
            </motion.div>
          </div>

          {/* Headline & Title */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="space-y-1.5 mt-4"
          >
            <h2
              id="celebration-title"
              className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-zinc-50 tracking-tight"
            >
              Sprint Conquered! 🎉
            </h2>
            <p className="text-sm sm:text-base font-bold text-[#0E7850] dark:text-emerald-400">
              {sprintTitle}
            </p>
          </motion.div>

          {/* Motivational Reinforcement Text */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 leading-relaxed max-w-sm mx-auto mt-2"
          >
            {completionNote ? (
              <span className="italic">"{completionNote}"</span>
            ) : (
              'You committed to the process, showed up every single move, and finished strong. Transforming ambition into consistent daily action is how real mastery is built.'
            )}
          </motion.p>

          {/* Achievement Highlights Grid */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="grid grid-cols-2 gap-2.5 my-5 max-w-md mx-auto text-left"
          >
            <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                  Progress
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100">
                  {completedDay} of {totalDays} Moves (100%)
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                  Momentum
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-950 dark:text-amber-100">
                  {streakCount > 0 ? `${streakCount}-Day Streak` : 'Sprint Complete'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Interactive Actions */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="space-y-2.5 pt-1"
          >
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="w-full py-4 px-6 rounded-2xl bg-[#0E7850] hover:bg-[#0b6342] text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-700/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleManualConfetti}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50/60 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{hasInteracted ? 'Throw More Confetti 🎊' : 'Celebrate with Confetti 🎊'}</span>
            </button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SprintCelebratoryAnimation;
