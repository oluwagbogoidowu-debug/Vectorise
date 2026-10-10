import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, ArrowRight, X, Star, Trophy, Flame, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { Participant } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface SprintCompletionModalProps {
    isOpen: boolean;
    onStartNext: (rating: number) => void;
    onClose: () => void;
    sprintId?: string;
    sprintTitle?: string;
    streakCount?: number;
    totalDays?: number;
    completedDay?: number;
    completionNote?: string;
    soundEnabled?: boolean;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ 
    isOpen, 
    onStartNext, 
    onClose,
    sprintId,
    sprintTitle = "Growth Sprint",
    streakCount = 0,
    totalDays = 5,
    completedDay = 5,
    completionNote,
    soundEnabled: initialSoundEnabled = true
}) => {
    const { user } = useAuth();
    const [rating, setRating] = useState<number>(0);
    const [outcome, setOutcome] = useState<string>('');
    const [showReviewSection, setShowReviewSection] = useState<boolean>(false);
    const [isAudioMuted, setIsAudioMuted] = useState(!initialSoundEnabled);
    const [hasInteracted, setHasInteracted] = useState(false);
    const confettiIntervalRef = useRef<any>(null);

    // Uplifting celebratory chime using Web Audio API
    const playCelebrationFanfare = useCallback(() => {
        if (isAudioMuted) return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            // Rising joyful arpeggio: C5 -> E5 -> G5 -> C6
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
            // Audio fails gracefully if blocked by autoplay policy
        }
    }, [isAudioMuted]);

    // High intensity celebratory confetti launch
    const launchConfetti = useCallback((intensity: 'full' | 'burst' = 'full') => {
        const brandColors = ['#0E7850', '#10B981', '#34D399', '#FCD34D', '#F59E0B', '#3B82F6', '#8B5CF6', '#FFFFFF'];

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

        // Phase 2: Left flank
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

        // Phase 3: Right flank
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

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setOutcome('');
            setShowReviewSection(false);
            setHasInteracted(false);

            // Trigger animation, fanfare & haptic
            launchConfetti('full');
            playCelebrationFanfare();
            triggerHaptic(hapticPatterns.success);

            // Follow-up sparkle burst
            const timer = setTimeout(() => {
                launchConfetti('burst');
            }, 1400);

            // Ongoing subtle ambient celebratory bursts
            const duration = 4 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 9999, scalar: 1.2 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            confettiIntervalRef.current = setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    return clearInterval(confettiIntervalRef.current);
                }
                const particleCount = 40 * (timeLeft / duration);
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.15, 0.35), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#FCD34D', '#10B981']
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.65, 0.85), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#3B82F6', '#6366F1']
                });
            }, 300);

            return () => {
                clearTimeout(timer);
                if (confettiIntervalRef.current) clearInterval(confettiIntervalRef.current);
            };
        }
    }, [isOpen, user, launchConfetti, playCelebrationFanfare]);

    const handleManualConfetti = () => {
        setHasInteracted(true);
        triggerHaptic(hapticPatterns.light);
        launchConfetti('burst');
        playCelebrationFanfare();
    };

    const [isSubmittingReview, setIsSubmittingReview] = useState(false);

    const saveReviewIfAny = async () => {
        if (user && sprintId && (rating > 0 || outcome.trim())) {
            try {
                const finalRating = rating > 0 ? rating : 5;
                const p = user as Participant;
                await sprintService.addReview(sprintId, {
                    participantId: user.id,
                    userName: user.name || (p as any)?.displayName || user.email?.split('@')[0] || 'Participant',
                    userAvatar: (p as any)?.profileImageUrl || (p as any)?.avatar || '',
                    rating: finalRating,
                    comment: outcome.trim(),
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.warn("Could not save review on sprint completion:", err);
            }
        }
    };

    const handleStartNextAction = async () => {
        triggerHaptic(hapticPatterns.light);
        setIsSubmittingReview(true);
        try {
            await saveReviewIfAny();
        } finally {
            setIsSubmittingReview(false);
            onStartNext(rating > 0 ? rating : 5);
        }
    };

    const handleClose = () => {
        triggerHaptic(hapticPatterns.light);
        saveReviewIfAny().catch(() => {});
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-white sm:bg-black/75 sm:backdrop-blur-md flex flex-col justify-center items-center p-0 sm:p-6 overflow-y-auto animate-fade-in select-none">
            {/* Ambient Celebratory Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-400/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-teal-500/20 rounded-full blur-[120px]" />
            </div>

            {/* Full-bleed container on mobile, rounded card on desktop */}
            <div className="w-full min-h-screen sm:min-h-0 sm:max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 border-0 sm:border sm:border-gray-100 animate-slide-up">
                
                {/* Background Ambient Glows */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Top bar with Milestone Badge, Audio Toggle & Close button */}
                <div className="relative z-10 flex items-center justify-between w-full mb-4">
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
                            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
                        </button>
                    </div>

                    <button 
                        onClick={handleClose}
                        className="w-9 h-9 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors cursor-pointer active:scale-95"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 my-auto flex-1 flex flex-col justify-center text-center">
                    
                    {/* Animated Radiant Trophy Centerpiece */}
                    <div className="relative mx-auto my-3 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
                            className="absolute w-32 h-32 rounded-full border border-dashed border-emerald-400/40 pointer-events-none"
                        />
                        <motion.div
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                            className="absolute w-24 h-24 bg-gradient-to-tr from-emerald-500/25 via-amber-400/20 to-teal-400/25 rounded-full blur-xl pointer-events-none"
                        />
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', damping: 14, stiffness: 200, delay: 0.1 }}
                            className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#0E7850] via-[#10B981] to-[#047857] text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 border-2 border-emerald-300/40"
                        >
                            <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-amber-200 drop-shadow-md animate-bounce" />
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[10px] font-black shadow-sm">
                                ★
                            </div>
                        </motion.div>
                    </div>

                    {/* Header Title */}
                    <div className="text-center mb-3">
                        <motion.h2 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase"
                        >
                            Sprint Completed! 🎉
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-xs text-[#0E7850] font-black uppercase tracking-wider mt-1"
                        >
                            {sprintTitle}
                        </motion.p>
                    </div>

                    {/* Completion Note or Motivational Text */}
                    {completionNote ? (
                        <motion.p 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs sm:text-sm text-gray-600 font-medium italic leading-relaxed max-w-sm mx-auto mb-3 px-2"
                        >
                            "{completionNote}"
                        </motion.p>
                    ) : (
                        <motion.p 
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs text-gray-500 font-medium leading-relaxed max-w-xs mx-auto mb-3 px-2"
                        >
                            You committed to the process, showed up every single move, and finished strong.
                        </motion.p>
                    )}

                    {/* Achievement Highlights Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="grid grid-cols-2 gap-2 my-2 text-left"
                    >
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 block">
                                    Progress
                                </span>
                                <span className="text-xs font-black text-emerald-950 truncate block">
                                    {completedDay} of {totalDays} Moves (100%)
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-2xl flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                                <Flame className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 block">
                                    Momentum
                                </span>
                                <span className="text-xs font-black text-amber-950 truncate block">
                                    {streakCount > 0 ? `${streakCount}-Day Streak` : 'Sprint Complete'}
                                </span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Interactive Ratings & Reflection Section */}
                    {!showReviewSection ? (
                        <div className="my-2 text-center">
                            <button
                                type="button"
                                onClick={() => setShowReviewSection(true)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0E7850] transition-colors py-1 cursor-pointer group"
                            >
                                <span className="underline underline-offset-4 decoration-gray-300 group-hover:decoration-[#0E7850]">
                                    Give review about this sprint
                                </span>
                            </button>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            {rating === 0 ? (
                                <motion.div
                                    key="rating-prompt"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="my-2 space-y-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-left"
                                >
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2">
                                            How would you rate this sprint?
                                        </p>
                                        <div className="flex justify-between gap-1.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="flex-1 py-3 rounded-xl flex items-center justify-center transition-all cursor-pointer bg-white text-gray-400 hover:bg-amber-50 hover:text-amber-400 hover:scale-105 border border-gray-100 shadow-xs active:scale-95 group"
                                                >
                                                    <Star className="w-4 h-4 text-gray-300 group-hover:text-amber-400 group-hover:fill-amber-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="feedback-prompt"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.2 }}
                                    className="my-2 space-y-2.5 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-left"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className="p-0.5 cursor-pointer transition-transform hover:scale-110"
                                                >
                                                    <Star 
                                                        className={`w-3.5 h-3.5 ${
                                                            star <= rating 
                                                                ? 'fill-amber-400 text-amber-400' 
                                                                : 'text-gray-300'
                                                        }`} 
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 tracking-wide uppercase">
                                            {rating} of 5 Stars
                                        </span>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 tracking-tight leading-snug">
                                            Want to share what this sprint helped you with?
                                        </h4>
                                        <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                            Your response helps us improve the experience.
                                        </p>
                                    </div>

                                    <textarea
                                        value={outcome}
                                        onChange={(e) => setOutcome(e.target.value)}
                                        placeholder="Share your experience..."
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#0E7850] focus:border-[#0E7850] outline-none transition-all resize-none h-20 text-gray-800 placeholder:text-gray-400"
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    )}
                </div>

                {/* Footer CTAs */}
                <div className="relative z-10 pt-3 space-y-2">
                    <button 
                        type="button"
                        onClick={handleStartNextAction}
                        disabled={isSubmittingReview}
                        className="w-full py-4 bg-[#0E7850] hover:bg-[#0b6342] text-white rounded-2xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg shadow-emerald-700/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>Start your next sprint</span>
                        <ArrowRight className="w-4 h-4 text-white" />
                    </button>

                    <button
                        type="button"
                        onClick={handleManualConfetti}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>{hasInteracted ? 'Throw More Confetti 🎊' : 'Celebrate with Confetti 🎊'}</span>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintCompletionModal;
