import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, ArrowRight, X, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

    useEffect(() => {
        if (isOpen) {
            setRating(0);
            setOutcome('');
            // High intensity, beautiful premium celebration effect with waves of confetti
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
                
                // Explode colored circles from both left and right sides of the screen
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
    }, [isOpen]);

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

                    {/* Full Bleed Hero Card */}
                    <div className="w-full bg-gradient-to-br from-[#0E7850] to-[#085C3D] text-white p-6 rounded-[2rem] shadow-lg relative overflow-hidden my-2 flex items-center gap-4">
                        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                        <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
                            <Trophy className="w-7 h-7 text-amber-300" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest leading-none">
                                100% Action Steps Completed
                            </p>
                            <p className="text-lg font-black tracking-tight text-white mt-1 leading-snug">
                                True momentum. What you build next compounds your growth.
                            </p>
                        </div>
                    </div>

                    {/* Interactive Ratings & Reflection Section */}
                    <div className="my-6 space-y-4 bg-gray-50/80 p-5 rounded-[2rem] border border-gray-100 text-left">
                        <div>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">
                                How effective was this sprint for your growth?
                            </p>
                            <div className="flex justify-between gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className={`flex-1 py-3 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                            rating >= star 
                                                ? 'bg-[#0E7850] text-white shadow-md scale-105' 
                                                : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
                                        }`}
                                    >
                                        <Star className={`w-4 h-4 ${rating >= star ? 'fill-amber-300 text-amber-300' : 'text-gray-300'}`} />
                                        <span className="text-[11px] font-black">{star}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-200/60 pt-4">
                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2 block">
                                Key realization or takeaway
                            </label>
                            <textarea
                                value={outcome}
                                onChange={(e) => setOutcome(e.target.value)}
                                placeholder="I learned that consistent daily execution beats big plans..."
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-[#0E7850] focus:border-[#0E7850] outline-none transition-all resize-none h-20"
                            />
                        </div>
                    </div>
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
                    
                    <button 
                        type="button"
                        onClick={onClose}
                        className="w-full py-2.5 text-gray-400 hover:text-gray-600 font-black uppercase tracking-widest text-[10px] transition-colors cursor-pointer text-center block"
                    >
                        I'll decide later
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
