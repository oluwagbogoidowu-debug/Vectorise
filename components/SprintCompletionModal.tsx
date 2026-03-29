import React, { useState } from 'react';
import Button from './Button';
import LocalLogo from './LocalLogo';

interface SprintCompletionModalProps {
    isOpen: boolean;
    onStartNext: (rating: number) => void;
    onClose: () => void;
}

const SprintCompletionModal: React.FC<SprintCompletionModalProps> = ({ isOpen, onStartNext, onClose }) => {
    const [rating, setRating] = useState<number>(0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <LocalLogo type="favicon" className="w-10 h-10" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight italic mb-2">
                        Sprint Completed
                    </h2>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8">
                        You showed up and finished strong. That matters.
                    </p>

                    <div className="mb-8">
                        <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-4">
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
                                            : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="text-sm font-black">{star}</span>
                                </button>
                            ))}
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
                            className="text-[9px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors"
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
