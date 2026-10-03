import React from 'react';
import { Sprint, ParticipantSprint } from '../types';
import Button from './Button';
import LocalLogo from './LocalLogo';
import { Sparkles, ArrowRight, Play, Check, Layers, Clock } from 'lucide-react';

export interface QueuedSprintItem {
    enrollment: ParticipantSprint;
    sprint: Sprint;
}

interface NextSprintModalProps {
    isOpen: boolean;
    sprint?: Sprint;
    queuedSprints?: QueuedSprintItem[];
    onStart: (enrollmentId?: string, sprintId?: string) => void;
    onClose: () => void;
}

const fallbackImage = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1350&q=80';

const NextSprintModal: React.FC<NextSprintModalProps> = ({ 
    isOpen, 
    sprint, 
    queuedSprints = [], 
    onStart, 
    onClose 
}) => {
    if (!isOpen) return null;

    // Determine the items to show (up to 2 from queue, or fallback to single sprint)
    const effectiveQueuedList: QueuedSprintItem[] = queuedSprints.length > 0 
        ? queuedSprints.slice(0, 2)
        : sprint 
            ? [{ enrollment: { id: `enroll_${sprint.id}`, sprint_id: sprint.id } as any, sprint }] 
            : [];

    if (effectiveQueuedList.length === 0) return null;

    const isMultiple = effectiveQueuedList.length >= 2;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in">
            <div className={`bg-white dark:bg-zinc-900 rounded-[2.5rem] w-full ${isMultiple ? 'max-w-xl' : 'max-w-md'} shadow-2xl relative overflow-hidden animate-slide-up flex flex-col border border-gray-100 dark:border-zinc-800`}>
                
                {/* Background Ambient Glow */}
                <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#0E7850]/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="p-6 sm:p-8 text-center relative z-10 flex flex-col">
                    <div className="w-14 h-14 bg-[#0E7850]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#0E7850]">
                        <LocalLogo type="favicon" className="w-8 h-8" />
                    </div>
                    
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-[#0E7850] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 text-[9px] font-black uppercase tracking-widest rounded-full mx-auto mb-3">
                        <Sparkles className="w-3 h-3" />
                        {isMultiple ? 'Queue Selection' : 'Next Growth Sprint'}
                    </span>

                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-1.5">
                        {isMultiple ? 'Choose Your Next Sprint' : 'Keep Your Growth Going'}
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-zinc-400 font-medium leading-relaxed mb-6">
                        {isMultiple 
                            ? 'Select which sprint to activate next from your queue' 
                            : 'Your next sprint builds on your recent breakthroughs'}
                    </p>

                    {/* Queued Sprints Cards */}
                    <div className={`grid ${isMultiple ? 'grid-cols-1 sm:grid-cols-2 gap-4' : 'grid-cols-1 gap-4'} mb-6 text-left`}>
                        {effectiveQueuedList.map((item, idx) => {
                            const curSprint = item.sprint;
                            const curEnrollment = item.enrollment;
                            const cover = curSprint.coverImageUrl || fallbackImage;

                            return (
                                <div 
                                    key={curSprint.id || idx}
                                    className="bg-gray-50/80 dark:bg-zinc-800/60 rounded-3xl p-5 border border-gray-100 dark:border-zinc-700/60 flex flex-col justify-between hover:border-[#0E7850]/40 transition-all group"
                                >
                                    <div>
                                        <div className="flex items-center gap-3 mb-3.5">
                                            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-zinc-700 shadow-xs">
                                                <img src={cover} alt={curSprint.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="text-[8px] font-black text-[#0E7850] dark:text-emerald-400 uppercase tracking-widest block truncate">
                                                    {curSprint.category || 'Sprint'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{curSprint.duration || 7} Moves</span>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-snug tracking-tight mb-2 line-clamp-2">
                                            {curSprint.title}
                                        </h3>
                                        
                                        {curSprint.subtitle && (
                                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium line-clamp-2 mb-4">
                                                {curSprint.subtitle}
                                            </p>
                                        )}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onStart(curEnrollment?.id, curSprint.id)}
                                        className="w-full py-3 px-4 bg-[#0E7850] hover:bg-[#0b5d3e] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                                    >
                                        <span>Start This Sprint</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col items-center">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="text-[10px] font-black text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 uppercase tracking-widest transition-colors py-2 px-4 cursor-pointer"
                        >
                            I'll start later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NextSprintModal;
