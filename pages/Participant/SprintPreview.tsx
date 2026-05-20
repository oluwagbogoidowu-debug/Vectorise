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
    const [showLockModal, setShowLockModal] = useState(false);
    const [revealedHints, setRevealedHints] = useState<Record<number, boolean>>({});

    const prefilledEmail = location.state?.prefilledEmail || localStorage.getItem('guest_email');

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
                    
                    {/* Lesson Content - Fully Visible */}
                    <div className="space-y-2 mb-10">
                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Today's Insight</h2>
                        <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                            <FormattedText text={day1Content?.lessonText || ""} />
                        </div>
                    </div>

                    {/* Action Step */}
                    <div className="space-y-6 relative">
                        {(() => {
                            const activePrompts = day1Content?.taskPrompts?.filter(p => p && p.trim()) || (day1Content?.taskPrompt ? [day1Content.taskPrompt] : []);
                            if (activePrompts.length === 0) {
                                return (
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden text-center text-gray-400 font-medium text-xs">
                                        No action steps defined yet for Day 1.
                                    </div>
                                );
                            }
                            
                            const prompt = activePrompts[activeTaskIndex] || activePrompts[0] || "";
                            const i = activeTaskIndex;
                            return (
                                <>
                                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative overflow-hidden animate-fade-in">
                                        <h2 className="text-[8px] font-black text-primary uppercase tracking-[0.4em] mb-4">Action Step {i + 1} of {activePrompts.length}</h2>
                                        <div className="text-gray-900 font-bold text-sm sm:text-base leading-snug relative mb-4">
                                            <FormattedText text={prompt} />
                                        </div>
                                        {day1Content?.taskHints?.[i] && (
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
                                        <textarea 
                                            rows={4}
                                            value={taskInputs[i] || ''}
                                            onChange={(e) => {
                                                const newInputs = [...taskInputs];
                                                newInputs[i] = e.target.value;
                                                setTaskInputs(newInputs);
                                            }}
                                            placeholder="What's on your mind..."
                                            className="w-full px-4 py-3 bg-white border border-primary/10 rounded-xl text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all mb-4 resize-none"
                                        />
                                        
                                        <div className="flex justify-between items-center gap-4 pt-4">
                                            {i > 0 ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveTaskIndex(i - 1)}
                                                    className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 active:scale-95"
                                                >
                                                    Back
                                                </button>
                                            ) : <div />}
                                            
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!taskInputs[i] || !taskInputs[i].trim()) {
                                                        toast.error("Please provide an answer to continue.");
                                                        return;
                                                    }

                                                    if (!user) {
                                                        // Explicit guest check. First action goes through but next action is locked
                                                        const pendingObj = {
                                                            sprintId: sprint.id,
                                                            pricingType: sprint.pricingType || 'cash',
                                                            firstActionInput: taskInputs[0],
                                                            prefilledEmail: prefilledEmail || ''
                                                        };
                                                        localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                                        setShowLockModal(true);
                                                        return;
                                                    }

                                                    if (i < activePrompts.length - 1) {
                                                        setActiveTaskIndex(i + 1);
                                                    } else {
                                                        // Last step prompts the signup modal
                                                        setShowSignupModal(true);
                                                    }
                                                }}
                                                className="px-6 py-2.5 rounded-xl text-xs font-bold transition-all bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95"
                                            >
                                                {i < activePrompts.length - 1 ? 'Next Step' : 'Complete Action'}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {activePrompts.length > 1 && (
                                        <div className="flex justify-center items-center gap-2 mt-8">
                                            {activePrompts.map((_, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx} 
                                                    onClick={() => {
                                                        if (idx <= activeTaskIndex) {
                                                            setActiveTaskIndex(idx);
                                                        }
                                                    }}
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx <= activeTaskIndex ? 'cursor-pointer' : 'cursor-not-allowed'} ${idx === activeTaskIndex ? 'w-8 bg-primary' : idx < activeTaskIndex ? 'w-2 bg-primary/40 hover:bg-primary/60' : 'w-2 bg-gray-200'}`}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
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
            
            {showLockModal && sprint && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center relative overflow-hidden animate-slide-up border border-gray-100">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2 col-auto">Unlock Full Sprint</h3>
                        <p className="text-amber-600 font-extrabold text-[10px] uppercase tracking-widest mb-4">
                            Unlock full sprint at log in / sign up
                        </p>
                        <p className="text-gray-500 font-medium text-xs leading-relaxed mb-8">
                            {sprint.pricingType === 'credits'
                                ? "This is a coin-based sprint! Sign up now to receive your free coins gift and pay to unlock the full daily process."
                                : "Check out securely to save your Day 1 progress and continue with the remaining steps."
                            }
                        </p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={() => {
                                    const pendingObj = {
                                        sprintId: sprint.id,
                                        pricingType: sprint.pricingType || 'cash',
                                        firstActionInput: taskInputs[0],
                                        prefilledEmail: prefilledEmail || ''
                                    };
                                    localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                    navigate('/signup', { state: { prefilledEmail, targetSprintId: sprintId } });
                                }}
                                className="w-full py-4 bg-[#0E7850] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#0b5d3e] transition-colors shadow-lg active:scale-95"
                            >
                                Sign Up and Unlock
                            </button>
                            <button 
                                onClick={() => {
                                    const pendingObj = {
                                        sprintId: sprint.id,
                                        pricingType: sprint.pricingType || 'cash',
                                        firstActionInput: taskInputs[0],
                                        prefilledEmail: prefilledEmail || ''
                                    };
                                    localStorage.setItem('pending_first_action', JSON.stringify(pendingObj));
                                    navigate('/login', { state: { prefilledEmail, targetSprintId: sprintId } });
                                }}
                                className="w-full py-4 bg-gray-50 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-100 transition-colors"
                            >
                                Log In to Unlock
                            </button>
                            <button 
                                onClick={() => setShowLockModal(false)}
                                className="w-full py-4 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:text-gray-500 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
