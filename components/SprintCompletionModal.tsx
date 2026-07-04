import React, { useState, useEffect } from 'react';
import Button from './Button';
import LocalLogo from './LocalLogo';
import confetti from 'canvas-confetti';
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col transition-all duration-300">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <LocalLogo type="favicon" className="w-10 h-10" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight italic mb-2">
                        Sprint Completed
                    </h2>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6">
                        You showed up and finished strong. That matters.
                    </p>

                    {/* Interactive Area: Ratings */}
                    <div className="mb-6 space-y-5 bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100">
                        <div>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-3">
                                How effective was this sprint for your growth?
                            </p>
                            <div className="flex justify-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                            rating >= star 
                                                ? 'bg-primary text-white shadow-lg scale-110' 
                                                : 'bg-white text-gray-300 hover:bg-gray-100 border border-gray-100'
                                        }`}
                                    >
                                        <span className="text-sm font-black">{star}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="text-left border-t border-gray-100 pt-4">
                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1.5 block">
                                What can you say about this sprint?
                            </label>
                            <textarea
                                value={outcome}
                                onChange={(e) => setOutcome(e.target.value)}
                                placeholder="I realized I’ve been forcing a path that doesn’t align with how I naturally think and work..."
                                className="w-full px-4 py-3 bg-white border border-gray-200/80 rounded-2xl text-xs font-semibold focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all resize-none h-24 mb-1"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="text-center">
                            <p className="text-[10px] text-gray-400 font-medium italic">
                                What you do next is what compounds it.
                            </p>
                        </div>
                        <Button 
                            onClick={() => onStartNext(rating)}
                            disabled={rating === 0}
                            className={`w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all ${rating === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                        >
                            Start your next sprint &rarr;
                        </Button>
                        <button 
                            onClick={onClose}
                            className="text-[9px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors block mx-auto pt-1"
                        >
                            I'll decide later
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintCompletionModal;
