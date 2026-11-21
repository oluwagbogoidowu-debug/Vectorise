import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  X,
  Star,
  Trophy,
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

const getRatingFeedbackPrompt = (stars: number) => {
  if (stars <= 2) {
    return {
      title: 'What could be improved?',
      placeholder: "Tell us what didn't quite work for you...",
    };
  }
  if (stars === 3) {
    return {
      title: 'What was missing?',
      placeholder: 'Share what would have made this sprint better...',
    };
  }
  return {
    title: 'Thank you! What did you like about this sprint?',
    placeholder: 'Share what stood out or helped you most...',
  };
};

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
  const [stage, setStage] = useState<'completion' | 'referral'>('completion');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [hasSharedReferral, setHasSharedReferral] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const confettiIntervalRef = useRef<any>(null);

  const playCelebrationPop = useCallback(() => {
    if (!initialSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, now);
      compressor.knee.setValueAtTime(18, now);
      compressor.ratio.setValueAtTime(4, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.15, now);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.8, now);
      compressor.connect(masterGain);
      masterGain.connect(ctx.destination);

      // 1. Tactile party-popper punch + upward "pop!" snap
      const triggerPop = (startTime: number, volume: number, basePitch = 420, peakPitch = 1180) => {
        // Low-end thump for physical weight
        const thumpOsc = ctx.createOscillator();
        const thumpGain = ctx.createGain();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.setValueAtTime(210, startTime);
        thumpOsc.frequency.exponentialRampToValueAtTime(58, startTime + 0.075);
        thumpGain.gain.setValueAtTime(0.001, startTime);
        thumpGain.gain.linearRampToValueAtTime(volume * 0.85, startTime + 0.005);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.085);
        thumpOsc.connect(thumpGain);
        thumpGain.connect(compressor);
        thumpOsc.start(startTime);
        thumpOsc.stop(startTime + 0.09);

        // Crisp bubble/cork pop sweep
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'sine';
        popOsc.frequency.setValueAtTime(basePitch, startTime);
        popOsc.frequency.exponentialRampToValueAtTime(peakPitch, startTime + 0.038);
        popGain.gain.setValueAtTime(0.001, startTime);
        popGain.gain.linearRampToValueAtTime(volume, startTime + 0.004);
        popGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.065);
        popOsc.connect(popGain);
        popGain.connect(compressor);
        popOsc.start(startTime);
        popOsc.stop(startTime + 0.07);

        // Filtered confetti air burst
        const bufferSize = Math.floor(ctx.sampleRate * 0.09);
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.28));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2800, startTime);
        filter.Q.setValueAtTime(1.1, startTime);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.55, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(compressor);
        noise.start(startTime);
      };

      // Primary pop + playful secondary confetti pop
      triggerPop(now, 0.34, 420, 1220);
      triggerPop(now + 0.14, 0.18, 540, 1460);

      // 2. Warm uplifting chime sparkle over the pop
      const chimeNotes = [
        { freq: 523.25, time: 0.05, duration: 0.24, gain: 0.14 },  // C5
        { freq: 659.25, time: 0.11, duration: 0.26, gain: 0.15 },  // E5
        { freq: 783.99, time: 0.17, duration: 0.3, gain: 0.16 },   // G5
        { freq: 1046.5, time: 0.24, duration: 0.52, gain: 0.18 },  // C6
        { freq: 1318.51, time: 0.31, duration: 0.58, gain: 0.11 }, // E6 shimmer
      ];

      chimeNotes.forEach(({ freq, time, duration, gain: peakGain }) => {
        const fundamental = ctx.createOscillator();
        const harmonic = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const harmonicGain = ctx.createGain();

        fundamental.type = 'sine';
        fundamental.frequency.setValueAtTime(freq, now + time);

        harmonic.type = 'sine';
        harmonic.frequency.setValueAtTime(freq * 2, now + time);

        noteGain.gain.setValueAtTime(0.001, now + time);
        noteGain.gain.linearRampToValueAtTime(peakGain, now + time + 0.014);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

        harmonicGain.gain.setValueAtTime(0.001, now + time);
        harmonicGain.gain.linearRampToValueAtTime(peakGain * 0.22, now + time + 0.01);
        harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + time + duration * 0.55);

        fundamental.connect(noteGain);
        harmonic.connect(harmonicGain);
        noteGain.connect(compressor);
        harmonicGain.connect(compressor);

        fundamental.start(now + time);
        fundamental.stop(now + time + duration + 0.02);
        harmonic.start(now + time);
        harmonic.stop(now + time + duration * 0.6);
      });

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1500);
    } catch {
      // Ignore Web Audio autoplay restrictions
    }
  }, [initialSoundEnabled]);

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
      setRating(0);
      setHoveredRating(0);
      setFeedbackComment('');
      setHasSharedReferral(false);
      setIsSubmittingReview(false);

      launchConfetti('full');
      playCelebrationPop();
      triggerHaptic(hapticPatterns.success);

      const timer = setTimeout(() => {
        launchConfetti('burst');
      }, 1200);

      return () => {
        clearTimeout(timer);
        if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
      };
    }
  }, [isOpen, launchConfetti, playCelebrationPop]);

  const handleSubmitRatingContinue = async () => {
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
          comment: feedbackComment.trim(),
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
      setStage('referral');
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
    setStage('referral');
  };

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

  const handleContinueToNextSprint = () => {
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
    onStartNext(rating > 0 ? rating : 5);
  };

  const handleClose = () => {
    triggerHaptic(hapticPatterns.light);
    onClose();
  };

  if (!isOpen) return null;

  const feedbackPrompt = rating > 0 ? getRatingFeedbackPrompt(rating) : null;

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
          <div className="relative z-10 flex items-center justify-end w-full mb-3">
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
                key="completion-rating-stage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex-1 flex flex-col justify-between"
              >
                <div className="my-auto py-2 flex flex-col items-center text-center">
                  {/* Compact Radiant Trophy */}
                  <div className="relative mx-auto mb-4 flex items-center justify-center">
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
                    You&apos;ve made meaningful progress. Well done!
                  </p>

                  {/* Rating Section Below */}
                  <div className="mt-7 w-full bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-gray-100 text-left">
                    <h3 className="text-sm font-black text-gray-900 tracking-tight text-center">
                      How would you rate this sprint?
                    </h3>

                    <div
                      className="mt-3.5 flex justify-between gap-2"
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
                            className={`flex-1 py-3 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-xs active:scale-95 ${
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

                    {rating === 0 ? (
                      <p className="mt-3 text-xs font-medium text-gray-400 text-center">
                        Tap a star to rate your experience.
                      </p>
                    ) : (
                      feedbackPrompt && (
                        <motion.div
                          key={rating <= 2 ? 'low' : rating === 3 ? 'mid' : 'high'}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22 }}
                          className="mt-4 pt-3.5 border-t border-gray-200/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-900 leading-snug">
                              {feedbackPrompt.title}
                            </p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                              {rating}/5
                            </span>
                          </div>
                          <textarea
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder={feedbackPrompt.placeholder}
                            rows={2}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:ring-[#0E7850] focus:border-[#0E7850] outline-none transition-all resize-none"
                          />
                        </motion.div>
                      )
                    )}
                  </div>
                </div>

                {/* Page 1 Footer Buttons */}
                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleSubmitRatingContinue}
                    disabled={rating <= 0 || isSubmittingReview}
                    className={`w-full py-3.5 sm:py-4 rounded-2xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
                      rating > 0 && !isSubmittingReview
                        ? 'bg-[#0E7850] hover:bg-[#0b6140] text-white shadow-md shadow-[#0E7850]/15 active:scale-[0.98] cursor-pointer'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isSubmittingReview ? 'Saving...' : 'Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSkipRating}
                    disabled={isSubmittingReview}
                    className="w-full py-3 bg-transparent hover:bg-gray-100/80 text-gray-500 hover:text-gray-800 rounded-2xl font-semibold text-xs tracking-wide transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="referral-stage"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 flex-1 flex flex-col justify-between"
              >
                <div className="my-auto py-4 flex flex-col items-center text-center px-2">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="w-16 h-16 rounded-2xl bg-[#0E7850]/[0.08] border border-[#0E7850]/15 flex items-center justify-center mb-6"
                  >
                    <HeartHandshake className="w-7 h-7 text-[#0E7850]" strokeWidth={1.75} />
                  </motion.div>

                  <h2 className="text-2xl sm:text-[26px] font-black text-gray-900 tracking-tight leading-snug max-w-xs sm:max-w-sm">
                    Someone else could benefit from this too.
                  </h2>

                  {hasSharedReferral && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0E7850]/10 text-[#0E7850] text-xs font-semibold"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Referral link ready to share</span>
                    </motion.div>
                  )}
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handleShareReferral}
                    className="w-full py-3.5 sm:py-4 bg-[#0E7850] hover:bg-[#0b6140] text-white rounded-2xl font-bold text-sm tracking-wide transition-all shadow-md shadow-[#0E7850]/15 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share it with them</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueToNextSprint}
                    className="w-full py-3 bg-transparent hover:bg-gray-100/80 text-gray-600 hover:text-gray-900 rounded-2xl font-semibold text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Continue to your next sprint</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
