import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Sprint, DailyContent } from '../../types';
import { sprintService } from '../../services/sprintService';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';
import { useAuth } from '../../contexts/AuthContext';

import { toast } from 'sonner';

const SprintPreview: React.FC = () => {
    const { sprintId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [taskInputs, setTaskInputs] = useState<string[]>([]);
    const [showSignupModal, setShowSignupModal] = useState(false);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

    const prefilledEmail = location.state?.prefilledEmail;

    useEffect(() => {
        const fetchSprint = async () => {
            if (!sprintId) return;
            setIsLoading(true);
            try {
                const data = await sprintService.getSprintById(sprintId);
                setSprint(data);
            } catch (err) {
                console.error("Error fetching sprint for preview:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSprint();
    }, [sprintId]);

    if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#FAFAFA]"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (!sprint) return <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-4 text-center"><h2 className="text-base font-black mb-4">Sprint not found.</h2><button onClick={() => navigate('/discover')} className="text-primary font-black uppercase tracking-widest text-xs">Back to Discover</button></div>;

    const day1Content = Array.isArray(sprint.dailyContent) ? sprint.dailyContent.find(dc => dc.day === 1) : undefined;
    
    const insightParts = { visible: day1Content?.lessonText || "", locked: "" };

    return (
        <div className="w-full bg-[#FAFAFA] min-h-screen flex flex-col font-sans text-dark animate-fade-in pb-24">
            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <div className="w-10"></div> {/* Spacer */}
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Day Selector (Disabled/Preview) */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1 opacity-50">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => (
                        <div
                            key={day}
                            className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 ${
                                day === 1 ? 'bg-[#0E7850] text-white shadow-xl' : 'bg-[#F3F4F6] text-gray-400'
                            }`}
                        >
                            <span className={`text-[8px] font-black uppercase tracking-widest ${day === 1 ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                            <span className="text-3xl font-black leading-none">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day 1 (Preview)</h2>
                    
                    {/* Lesson Content - Paragraph Based Lock with Blur */}
                    <div className="space-y-2 mb-10 relative">
                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Insight</h2>
                        <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch] relative">
                            <FormattedText text={insightParts.visible} />
                            {insightParts.locked && (
                                <div className="relative mt-4">
                                    <div className="blur-[4px] select-none pointer-events-none opacity-40">
                                        <FormattedText text={insightParts.locked} />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white/80 px-4 py-2 rounded-full shadow-sm backdrop-blur-sm">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                            Sprint Locked
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Step */}
                    <div className="space-y-6 relative">
                        {day1Content?.taskPrompts && day1Content.taskPrompts.some(p => p.trim()) ? (
                            day1Content.taskPrompts.map((prompt, i) => {
                                if (i !== activeTaskIndex) return null;
                                return (
                                <div key={i} className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                                    <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Action Step {i + 1}</h2>
                                    <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug relative mb-4">
                                        <FormattedText text={prompt} />
                                    </div>
                                    {day1Content.taskHints?.[i] && (
                                        <div className="mb-4">
                                            <button 
                                                type="button"
                                                onClick={() => setRevealedHints(prev => ({ ...prev, [i]: !prev[i] }))}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${revealedHints[i] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                            >
                                                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${revealedHints[i] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {revealedHints[i] ? 'Hide Hint' : 'View Hint'}
                                            </button>
                                            {revealedHints[i] && (
                                                <div className="mt-3 p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-sm font-medium text-amber-900 animate-fade-in leading-relaxed italic">
                                                    <FormattedText text={day1Content.taskHints[i]} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <input 
                                        type="text"
                                        value={taskInputs[i] || ''}
                                        onChange={(e) => {
                                            const newInputs = [...taskInputs];
                                            newInputs[i] = e.target.value;
                                            setTaskInputs(newInputs);
                                        }}
                                        placeholder="Your response..."
                                        className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all mb-4"
                                    />
                                    
                                    <div className="flex justify-end pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!taskInputs[i] || !taskInputs[i].trim()) {
                                                    toast.error("Please provide an answer to continue.");
                                                    return;
                                                }
                                                // Always prompt signup after the first step in preview
                                                setShowSignupModal(true);
                                            }}
                                            className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                                        >
                                            Next Action Step
                                        </button>
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden">
                                <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Action Steps</h2>
                                <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug relative mb-4">
                                    <FormattedText text={day1Content?.taskPrompt || "Action step..."} />
                                </div>
                                {day1Content?.taskHints?.[0] && (
                                    <div className="mb-4">
                                        <button 
                                            type="button"
                                            onClick={() => setRevealedHints(prev => ({ ...prev, 0: !prev[0] }))}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${revealedHints[0] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400 hover:text-primary hover:bg-primary/5'}`}
                                        >
                                            <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${revealedHints[0] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {revealedHints[0] ? 'Hide Hint' : 'View Hint'}
                                        </button>
                                        {revealedHints[0] && (
                                            <div className="mt-3 p-4 bg-amber-50/50 border border-amber-100 rounded-xl text-sm font-medium text-amber-900 animate-fade-in leading-relaxed italic">
                                                <FormattedText text={day1Content.taskHints[0]} />
                                            </div>
                                        )}
                                    </div>
                                )}
                                <input 
                                    type="text"
                                    value={taskInputs[0] || ''}
                                    onChange={(e) => {
                                        const newInputs = [...taskInputs];
                                        newInputs[0] = e.target.value;
                                        setTaskInputs(newInputs);
                                    }}
                                    placeholder="Your response..."
                                    className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all mb-4"
                                />
                                
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!taskInputs[0] || !taskInputs[0].trim()) {
                                                return;
                                            }
                                            setShowSignupModal(true);
                                        }}
                                        className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
            
            {showSignupModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Unlock Full Sprint</h3>
                        <p className="text-gray-500 font-medium mb-8 text-sm">Sign up to save your progress and continue with the next execution steps.</p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } })}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-colors shadow-lg active:scale-95"
                            >
                                Sign Up to Continue
                            </button>
                            <button 
                                onClick={() => setShowSignupModal(false)}
                                className="w-full py-4 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SprintPreview;
