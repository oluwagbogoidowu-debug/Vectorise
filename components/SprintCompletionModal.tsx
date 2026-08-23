import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, ArrowRight, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { sprintService } from '../services/sprintService';
import { shineService } from '../services/shineService';
import { userService } from '../services/userService';
import { MILESTONES, computeMilestoneStats, calculateMilestoneStatValue } from '../services/milestoneConstants';
import { toast } from 'sonner';
import { Participant } from '../types';

interface SprintCompletionModalProps {
    isOpen: boolean;
    onStartNext: (rating: number) => void;
    onClose: () => void;
    sprintTitle?: string;
    streakCount?: number;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ 
    isOpen, 
    onStartNext, 
    onClose,
    sprintTitle = "Growth Sprint",
    streakCount = 0
}) => {
    const { user } = useAuth();
    const [rating, setRating] = useState<number>(0);
    const [outcome, setOutcome] = useState<string>('');
    const [unclaimedMilestones, setUnclaimedMilestones] = useState<any[]>([]);
    const [isClaimingIndex, setIsClaimingIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setOutcome('');

            // Load unclaimed milestones
            if (user) {
                const loadMilestones = async () => {
                    try {
                        const enrollments = await sprintService.getUserEnrollments(user.id);
                        const reflections = await shineService.getPostsByUserId(user.id).catch(() => []);
                        const referralsCount = (user as any)?.referralsCount || 0;

                        const stats = computeMilestoneStats(enrollments, reflections, referralsCount);
                        const claimed = (user as Participant).claimedMilestoneIds || [];

                        const unclaimed = MILESTONES.filter(m => {
                            const val = calculateMilestoneStatValue(m.id, stats);
                            return val >= m.targetValue && !claimed.includes(m.id);
                        });

                        setUnclaimedMilestones(unclaimed);
                    } catch (err) {
                        console.error("Error loading milestones:", err);
                    }
                };
                loadMilestones();
            }

            // High intensity celebration effect
            const duration = 4 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 35, spread: 360, ticks: 70, zIndex: 1000, scalar: 1.2 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(() => {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 60 * (timeLeft / duration);
                
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#FCD34D', '#10B981']
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                    colors: ['#0E7850', '#159E6A', '#34D399', '#3B82F6', '#6366F1']
                });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [isOpen, user]);

    const handleClaimMilestone = async (milestone: any, index: number) => {
        if (!user || isClaimingIndex !== null) return;
        setIsClaimingIndex(index);
        try {
            await userService.claimMilestone(user.id, milestone.id, milestone.points);
            toast.success(`Claimed! +${milestone.points} Growth Coins added to your wallet.`);
            setUnclaimedMilestones(prev => prev.filter((_, idx) => idx !== index));
        } catch (err) {
            console.error("Failed to claim milestone:", err);
            toast.error("Failed to claim milestone. Please try again.");
        } finally {
            setIsClaimingIndex(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-white sm:bg-black/70 sm:backdrop-blur-md flex flex-col justify-center items-center p-0 sm:p-6 overflow-y-auto animate-fade-in">
            {/* Full-bleed container on mobile, rounded card on desktop */}
            <div className="w-full min-h-screen sm:min-h-0 sm:max-w-md bg-white sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between p-6 sm:p-8 border-0 sm:border sm:border-gray-100 animate-slide-up">
                
                {/* Background Ambient Glows */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />

                {/* Top bar with Close button */}
                <div className="relative z-10 flex items-center justify-between w-full mb-6">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#0E7850]/10 border border-[#0E7850]/20 rounded-full text-[#0E7850] text-[10px] font-black uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5 text-[#0E7850] animate-pulse" />
                        <span>Sprint Milestone</span>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-9 h-9 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-full flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 my-auto flex-1 flex flex-col justify-center">
                    {/* Header Title */}
                    <div className="text-left mb-6">
                        <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase">
                            Sprint Completed!
                        </h2>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">
                            {sprintTitle}
                        </p>
                    </div>

                    {/* Milestone Unlocked Card (if any unclaimed milestone) */}
                    {unclaimedMilestones.length > 0 && (
                        <div className="w-full bg-[#FFFBEB] border border-amber-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 relative overflow-hidden mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 text-lg">
                                    {unclaimedMilestones[0].icon || '🏆'}
                                </div>
                                <div className="text-left min-w-0">
                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">
                                        Milestone Unlocked
                                    </p>
                                    <p className="text-xs sm:text-sm font-black text-amber-950 tracking-tight mt-1 truncate">
                                        {unclaimedMilestones[0].description || unclaimedMilestones[0].title}
                                    </p>
                                    <p className="text-[10px] font-bold text-amber-700 tracking-tight mt-0.5">
                                        Reward: +{unclaimedMilestones[0].points} Growth Coins
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleClaimMilestone(unclaimedMilestones[0], 0)}
                                disabled={isClaimingIndex === 0}
                                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                            >
                                {isClaimingIndex === 0 ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <span>Claim</span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Interactive Ratings & Reflection Section */}
                    <AnimatePresence mode="wait">
                        {rating === 0 ? (
                            <motion.div
                                key="rating-prompt"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="my-2 space-y-4 bg-gray-50/80 p-5 rounded-[2rem] border border-gray-100 text-left"
                            >
                                <div>
                                    <p className="text-xs font-black text-gray-900 uppercase tracking-widest mb-3">
                                        How would you rate this sprint?
                                    </p>
                                    <div className="flex justify-between gap-2">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="flex-1 py-3.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer bg-white text-gray-400 hover:bg-amber-50 hover:text-amber-400 hover:scale-105 border border-gray-100 shadow-sm active:scale-95 group"
                                            >
                                                <Star className="w-5 h-5 text-gray-300 group-hover:text-amber-400 group-hover:fill-amber-400 transition-colors" />
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
                                className="my-2 space-y-3 bg-gray-50/80 p-5 rounded-[2rem] border border-gray-100 text-left"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRating(star)}
                                                className="p-1 cursor-pointer transition-transform hover:scale-110"
                                            >
                                                <Star 
                                                    className={`w-4 h-4 ${
                                                        star <= rating 
                                                            ? 'fill-amber-400 text-amber-400' 
                                                            : 'text-gray-300'
                                                    }`} 
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 tracking-wide uppercase">
                                        {rating} of 5 Stars
                                    </span>
                                </div>

                                <div className="pt-1">
                                    <h4 className="text-xs sm:text-sm font-black text-gray-900 tracking-tight leading-snug">
                                        Want to share what this sprint helped you with?
                                    </h4>
                                    <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                        Your response helps us improve the experience.
                                    </p>
                                </div>

                                <textarea
                                    value={outcome}
                                    onChange={(e) => setOutcome(e.target.value)}
                                    placeholder="Share your experience..."
                                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-[#0E7850] focus:border-[#0E7850] outline-none transition-all resize-none h-24 text-gray-800 placeholder:text-gray-400"
                                    autoFocus
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer CTAs */}
                <div className="relative z-10 pt-4 space-y-3">
                    <button 
                        type="button"
                        onClick={() => onStartNext(rating)}
                        className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-3xl font-black uppercase tracking-[0.15em] text-xs transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>Start your next sprint</span>
                        <ArrowRight className="w-4 h-4 text-white" />
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

