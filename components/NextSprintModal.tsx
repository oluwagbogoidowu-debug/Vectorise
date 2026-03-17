import React from 'react';
import { Sprint } from '../types';
import Button from './Button';
import LocalLogo from './LocalLogo';

interface NextSprintModalProps {
    isOpen: boolean;
    sprint: Sprint;
    onStart: () => void;
    onClose: () => void;
}

const NextSprintModal: React.FC<NextSprintModalProps> = ({ isOpen, sprint, onStart, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <LocalLogo type="favicon" className="w-10 h-10" />
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight italic mb-2">
                        Next Focus Ready
                    </h2>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-8">
                        You've completed your last protocol. Your next journey is waiting in the queue.
                    </p>

                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-8 text-left">
                        <p className="text-[8px] font-black text-primary uppercase tracking-widest mb-1">{sprint.category}</p>
                        <h3 className="text-lg font-black text-gray-900 leading-tight mb-2">{sprint.title}</h3>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-gray-400">{sprint.duration} Days</span>
                            <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                            <span className="text-[10px] font-bold text-gray-400">Execution Protocol</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Button 
                            onClick={onStart}
                            className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                        >
                            Start Next Sprint &rarr;
                        </Button>
                        <button 
                            onClick={onClose}
                            className="text-[9px] font-black text-gray-300 hover:text-gray-500 uppercase tracking-widest transition-colors"
                        >
                            I'll start later
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

export default NextSprintModal;
