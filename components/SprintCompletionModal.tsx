import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ArrowRight,
  X,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  HeartHandshake,
  Share2,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { Participant } from '../types';
import { recordDeferredPromptState } from '../utils/deferredPrompts';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface SprintCompletionModalProps {
  isOpen: boolean;
  onStartNext: (rating: number) => void;
  onClose: () => void;
  sprintId?: string;
  enrollmentId?: string;
  sprintTitle?: string;
  streakCount?: number;
  totalDays?: number;
  completedDay?: number;
  completionNote?: string;
  soundEnabled?: boolean;
  isPreview?: boolean;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({
  isOpen,
  onStartNext,
  onClose,
  sprintId,
  enrollmentId,
  sprintTitle = 'Growth Sprint',
  soundEnabled: initialSoundEnabled = true,
  isPreview = false,
}) => {
  const { user } = useAuth();
  const [stage, setStage] = useState<'completion' | 'rating'>('completion');
  const [hasSharedReferral, setHasSharedReferral] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState(!initialSoundEnabled);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const confettiIntervalRef = useRef<any>(null);

  const playCelebrationFanfare = useCallback(() => {
    if (isAudioMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const notes = [
        { freq: 523.25, time: 0.0, duration: 0.16, gain: 0.22 },
        { freq: 659.25, time: 0.1, duration: 0.18, gain: 0.24 },
        { freq: 783.99, time: 0.22, duration: 0.22, gain: 0.26 },
        { freq: 1046.5, time: 0.36, duration: 0.65, gain: 0.28 },
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
      // Ignore Web Audio autoplay restrictions
    }
  }, [isAudioMuted]);

  const launchConfetti = useCallback((intensity: 'full' | 'burst' = 'full') => {
    const brandColors = ['#0E7850', '#10B981', '#34D399', '#FCD34D', '#F59E0B', '#FFFFFF'];

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

    confetti({
      particleCount: 70,
      spread: 95,
      origin: { y: 0.65 },
      colors: brandColors,
      startVelocity: 42,
      zIndex: 9999,
    });

    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 60,
        origin: { x: 0.1, y: 0.7 },
        colors: brandColors,
        startVelocity: 45,
        zIndex: 9999,
      });
    }, 180);

    setTimeout(() => {
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 60,
        origin: { x: 0.9, y: 0.7 },
        colors: brandColors,
        startVelocity: 45,
        zIndex: 9999,
      });
    }, 360);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStage('completion');
      setHasSharedReferral(false);
      setRating(0);
      setHoveredRating(0);
      setIsSubmittingReview(false);

      launchConfetti('full');
      playCelebrationFanfare();
      triggerHaptic(hapticPatterns.success);

      const timer = setTimeout(() => {
        launchConfetti('burst');
      }, 1200);

      return () => {
        clearTimeout(timer);
        if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
      };
    }
  }, [isOpen, launchConfetti, playCelebrationFanfare]);

  const handleShareReferral = async () => {
    triggerHaptic(hapticPatterns.light);
    const referralCode = (user as any)?.referralCode as string | undefined;
    const refSuffix = referralCode ? `?ref=${referralCode}` : '';
    const shareUrl = sprintId
      ? `${window.location.origin}/sprint/${sprintId}${refSuffix}`
      : `${window.location.origin}${refSuffix}`;
    const title = sprintTitle?.trim() || 'VectoRise Sprint';
    const shareText = `I just completed "${title}" on VectoRise. Know someone who could benefit from it too?`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        setHasSharedReferral(true);
        recordDeferredPromptState({
          userId: user?.id,
          sprintId,
          enrollmentId,
          type: 'referral',
          status: 'completed',
          isPreview,
        }).catch(() => {});
        toast.success('Shared with a friend!');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setHasSharedReferral(true);
      recordDeferredPromptState({
        userId: user?.id,
        sprintId,
        enrollmentId,
        type: 'referral',
        status: 'completed',
        isPreview,
      }).catch(() => {});
      toast.success('Referral link copied — ready to share!');
    } catch {
      toast.error('Could not copy link right now.');
    }
  };

  const handleProceedFromReferral = () => {
    triggerHaptic(hapticPatterns.light);
    if (!hasSharedReferral) {
      recordDeferredPromptState({
        userId: user?.id,
        sprintId,
        enrollmentId,
        type: 'referral',
        status: 'skipped',
        isPreview,
      }).catch(() => {});
    }
    setStage('rating');
  };

  const handleSubmitRatingAndContinue = async () => {
    if (rating <= 0 || isSubmittingReview) return;
    triggerHaptic(hapticPatterns.light);
    setIsSubmittingReview(true);
    try {
      if (!isPreview && user && sprintId) {
        const p = user as Participant;
        await sprintService.addReview(sprintId, {
          participantId: user.id,
          userName: user.name || (p as any)?.displayName || user.email?.split('@')[0] || 'Participant',
          userAvatar: (p as any)?.profileImageUrl || (p as any)?.avatar || '',
          rating,
          comment: '',
          timestamp: new Date().toISOString(),
        });
      }
      await recordDeferredPromptState({
        userId: user?.id,
        sprintId,
        enrollmentId,
        type: 'rating',
        status: 'completed',
        ratingValue: rating,
        isPreview,
      });
    } catch (err) {
      console.warn('Could not save review on sprint completion:', err);
    } finally {
      setIsSubmittingReview(false);
      onStartNext(rating);
    }
  };

  const handleSkipRating = () => {
    triggerHaptic(hapticPatterns.light);
    recordDeferredPromptState({
      userId: user?.id,
      sprintId,
      enrollmentId,
      type: 'rating',
      status: 'skipped',
      isPreview,
    }).catch(() => {});
    onStartNext(5);
  };

  const handleClose = () => {
    triggerHaptic(hapticPatterns.light);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <MotionConfig reducedMotion="user">
      <div className="fixed inset-0 z-[300] bg-white sm:bg-black/75 sm:backdrop-blur-md flex flex-col justify-center items-center p-0 sm:p-6 overflow-y-auto select-none">
        {/* Ambient Celebratory Glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-teal-500/15 rounded-full blur-[120px]" />
        </div>

        {/* Full-bleed container on mobile, rounded card on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full min-h-[100dvh] sm:min-h-[600px] sm:max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 border-0 sm:border sm:border-gray-100"
        >
          {/* Background Ambient Glows */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />

          {/* Top bar */}
          <div className="relative z-10 flex items-center justify-between w-full mb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850] text-[10px] font-black uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-[#0E7850] animate-pulse" />
                <span>Sprint Milestone</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAudioMuted((prev) => !prev)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                title={isAudioMuted ? 'Unmute celebration chime' : 'Mute celebration chime'}
                aria-label={isAudioMuted ? 'Unmute sound' : 'Mute sound'}
              >
                {isAudioMuted ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors cursor-pointer active:scale-95"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {stage === 'completion' ? (
              <motion.div
                key="completion-stage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex-1 flex flex-col justify-between"
              >
                <div className="my-auto py-2 flex flex-col items-center text-center">
                  {/* Compact Radiant Trophy */}
                  <div className="relative mx-auto mb-5 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                      className="absolute w-20 h-20 bg-gradient-to-tr from-emerald-500/20 via-amber-400/15 to-teal-400/20 rounded-full blur-xl pointer-events-none"
                    />
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 16, stiffness: 220, delay: 0.05 }}
                      className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0E7850] via-[#10B981] to-[#047857] text-white flex items-center justify-center shadow-lg shadow-emerald-600/25 border border-emerald-300/40"
                    >
                      <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-200 drop-shadow-sm" />
                    </motion.div>
                  </div>

                  {/* Completion Copy */}
                  <h2 className="text-2xl sm:text-[28px] font-black text-gray-900 tracking-tight leading-tight">
                    Sprint Completed!
                  </h2>
                  <p className="text-sm font-bold text-[#0E7850] mt-1.5">
                    You&apos;ve made meaningful progress.
                  </p>
                  <p className="text-xs sm:text-[13px] text-gray-500 font-normal leading-relaxed max-w-sm mx-auto mt-2.5">
                    You&apos;ve completed <span className="font-bold text-gray-800">{sprintTitle}</span>. Take a moment to appreciate the work you&apos;ve put in.
                  </p>

                  {/* Share the value + Referral Content */}
                  <div className="mt-6 w-full rounded-2xl border border-gray-200/80 bg-gray-50/75 p-4 sm:p-5 text-left">
                    <div className="flex items-center gap-2 text-[#0E7850]">
                      <div className="w-7 h-7 rounded-xl bg-[#0E7850]/10 border border-[#0E7850]/15 flex items-center justify-center shrink-0">
                        <HeartHandshake className="w-3.5 h-3.5 text-[#0E7850]" strokeWidth={1.85} />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest">
                        Share the value
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-[15px] font-extrabold text-gray-900 tracking-tight leading-snug mt-3">
                      Someone else could benefit from this too.
                    </h3>
                    <p className="text-xs text-gray-500 font-normal leading-relaxed mt-1">
                      You&apos;ve taken a step towards meaningful progress. Know a friend who could benefit from this sprint?
                    </p>

                    {hasSharedReferral && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E7850]/10 text-[#0E7850] text-[11px] font-semibold">
                        <Check className="w-3 h-3" />
                        <span>Referral link ready to share</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Referral & Progression Buttons */}
                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleShareReferral}
                    className="w-full py-3.5 sm:py-4 bg-[#0E7850] hover:bg-[#0b6140] text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-md shadow-[#0E7850]/15 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share it with them.</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedFromReferral}
                    className="w-full py-3 bg-transparent hover:bg-gray-100/80 text-gray-500 hover:text-gray-800 rounded-2xl font-semibold text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{hasSharedReferral ? 'Continue' : 'Skip for now'}</span>
                    {hasSharedReferral && <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="rating-stage"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex-1 flex flex-col justify-between"
              >
                <div className="my-auto py-4 flex flex-col items-center text-center">
                  <h2 className="text-2xl sm:text-[26px] font-black text-gray-900 tracking-tight leading-snug max-w-xs sm:max-w-sm">
                    How would you rate this sprint?
                  </h2>

                  <p className="mt-2.5 text-sm text-gray-500 font-normal leading-relaxed max-w-xs sm:max-w-sm">
                    Your feedback helps us improve the VectoRise experience.
                  </p>

                  <div className="mt-7 w-full bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                    <div
                      className="flex justify-between gap-2"
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = star <= (hoveredRating || rating);
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              triggerHaptic(hapticPatterns.light);
                              setRating(star);
                            }}
                            onMouseEnter={() => setHoveredRating(star)}
                            aria-label={`Rate ${star} out of 5 stars`}
                            className={`flex-1 py-3.5 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-xs active:scale-95 ${
                              isFilled
                                ? 'bg-amber-50 border-amber-200 text-amber-400 scale-[1.02]'
                                : 'bg-white border-gray-100 text-gray-300 hover:bg-amber-50/60 hover:text-amber-400'
                            }`}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                isFilled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs font-medium text-gray-400">
                      {rating > 0
                        ? `${rating} of 5 Stars`
                        : 'Tap a star to rate your experience.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmitRatingAndContinue}
                    disabled={rating <= 0 || isSubmittingReview}
                    className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                      rating > 0 && !isSubmittingReview
                        ? 'bg-[#0E7850] hover:bg-[#0b6140] text-white shadow-md shadow-[#0E7850]/15 active:scale-[0.98] cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isSubmittingReview ? 'Saving...' : 'Continue to next sprint'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipRating}
                    disabled={isSubmittingReview}
                    className="w-full py-3 bg-transparent hover:bg-gray-100/80 text-gray-500 hover:text-gray-800 rounded-2xl font-semibold text-xs tracking-wide transition-colors cursor-pointer"
                  >
                    Skip for now
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MotionConfig>
  );
};

export default SprintCompletionModal;
