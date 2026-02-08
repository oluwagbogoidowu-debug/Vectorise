import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ParticipantSprint, Sprint, DailyContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';

const ReflectionModal: React.FC<{
    isOpen: boolean;
    day: number;
    onClose: () => void;
    onFinish: (reflection: string) => void;
    isSubmitting: boolean;
}> = ({ isOpen, day, onClose, onFinish, isSubmitting }) => {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-8 pb-4">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Sprint Reflection</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-8 pb-10 space-y-8 flex-1 overflow-y-auto no-scrollbar">
                    {/* Icon & Question */}
                    <div className="text-center space-y-4 pt-4">
                        <div className="w-16 h-16 bg-[#F2F7F5] rounded-full flex items-center justify-center mx-auto text-[#0E7850]">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0012 18.75c-1.03 0-1.9-.4-2.593-.91L8.828 17.29z" />
                            </svg>
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">What did you learn today?</h4>
                    </div>

                    {/* Textarea */}
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="One idea that shifted my thinking was..."
                        className="w-full bg-[#FAFAFA] border border-gray-100 rounded-2xl p-5 text-sm font-medium text-gray-700 placeholder-gray-300 outline-none focus:ring-4 focus:ring-primary/5 transition-all min-h-[140px] resize-none"
                    />

                    {/* Privacy Notice */}
                    <div className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex gap-3 items-start">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0 shadow-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold italic leading-relaxed">
                            This is only visible to you. No coach sees your reflection. Feel free to share your mind.
                        </p>
                    </div>

                    {/* Finish Button */}
                    <button 
                        onClick={() => onFinish(text)}
                        disabled={isSubmitting}
                        className="w-full bg-[#0E7850] text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? 'Finalizing...' : `Finish Day ${day}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    
    const [proofSelection, setProofSelection] = useState<string>('');
    const [textSubmission, setTextSubmission] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeToNextDay, setTimeToNextDay] = useState<string | null>(null);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);

    // Load Data
    useEffect(() => {
        if (!enrollmentId) return;
        const unsubscribe = sprintService.subscribeToEnrollment(enrollmentId, async (data) => {
            if (data) {
                setEnrollment(data);
                if (!sprint) {
                    const found = await sprintService.getSprintById(data.sprintId);
                    setSprint(found);
                    const firstIncomplete = data.progress.find(p => !p.completed);
                    setViewingDay(firstIncomplete ? firstIncomplete.day : data.progress.length);
                }
            }
        });
        return () => unsubscribe();
    }, [enrollmentId, sprint]);

    // Timer Logic: Countdown to Midnight (12 AM)
    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            
            const diff = midnight.getTime() - now.getTime();
            
            if (diff <= 0) {
                setTimeToNextDay(null);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeToNextDay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const dayContent = sprint?.dailyContent.find(dc => dc.day === viewingDay);
    const currentDayData = enrollment?.progress.find(p => p.day === viewingDay);
    const isDayCompleted = !!currentDayData?.completed;

    const isDayLocked = (day: number) => {
        if (day === 1) return false;
        const prevDay = enrollment?.progress.find(p => p.day === day - 1);
        if (!prevDay?.completed) return true;
        
        const now = new Date();
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
        const completedAt = new Date(prevDay.completedAt!).getTime();
        
        return completedAt >= todayAtMidnight;
    };

    const viewingDayIsLocked = isDayLocked(viewingDay);

    const handleStartCompletion = () => {
        setIsReflectionModalOpen(true);
    };

    const handleFinishDay = async (reflection: string) => {
        if (!enrollment || !user || isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Update Enrollment
            const updatedProgress = enrollment.progress.map(p => 
                p.day === viewingDay ? { 
                    ...p, 
                    completed: true, 
                    completedAt: new Date().toISOString(), 
                    submission: textSubmission,
                    proofSelection: proofSelection,
                    // Store reflection as part of submission for this UI
                    reflection: reflection.trim()
                } : p
            );
            
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { progress: updatedProgress });
            
            setTextSubmission('');
            setProofSelection('');
            setIsReflectionModalOpen(false);

            // Final day logic
            if (viewingDay === enrollment.progress.length) {
                navigate('/discover');
            } else {
                setViewingDay(viewingDay + 1);
            }
        } catch (err) {
            console.error("Completion failed", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!enrollment || !sprint) return (
        <div className="flex items-center justify-center h-screen bg-white">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const overallProgressPercent = Math.round((enrollment.progress.filter(p => p.completed).length / sprint.duration) * 100);

    return (
        <div className="w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
            <ReflectionModal 
                isOpen={isReflectionModalOpen} 
                day={viewingDay}
                onClose={() => setIsReflectionModalOpen(false)}
                onFinish={handleFinishDay}
                isSubmitting={isSubmitting}
            />

            {/* UTILITY HEADER */}
            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/dashboard')} 
                        className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 hover:text-red-500 transition-all active:scale-90"
                        title="Exit Sprint"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 tracking-tight truncate">{sprint.title}</h1>
                        <p className="text-[7px] font-black text-primary uppercase tracking-[0.3em] opacity-60">Cycle Protocol</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => navigate(`/sprint/${sprint.id}`)}
                            className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
                            title="Check Description"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        <button 
                            className="p-2 bg-white border border-gray-100 rounded-xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
                            title="Reach Coach"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* CURRICULUM TIMELINE */}
                <div className="bg-white rounded-3xl p-4 border border-gray-50 shadow-sm overflow-hidden">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Curriculum Timeline</h2>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar items-center">
                        {enrollment.progress.map((p) => {
                            const locked = isDayLocked(p.day);
                            const active = viewingDay === p.day;
                            const done = p.completed;

                            return (
                                <button 
                                    key={p.day}
                                    onClick={() => setViewingDay(p.day)}
                                    className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative shadow-sm border ${
                                        active 
                                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-md' 
                                        : done 
                                        ? 'bg-white text-primary border-primary/20' 
                                        : 'bg-gray-50 text-gray-400 border-transparent'
                                    } ${locked && !active ? 'opacity-30' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    <span className="text-[6px] font-black uppercase tracking-widest opacity-60 mb-0.5">Day</span>
                                    <span className="text-lg font-black leading-none">{p.day}</span>
                                    {done && !active && (
                                        <div className="absolute top-1 right-1 w-1 h-1 bg-primary rounded-full"></div>
                                    )}
                                    {locked && !done && (
                                        <div className="absolute bottom-1 right-1 opacity-40">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    {viewingDayIsLocked && !isDayCompleted ? (
                        /* LOCKED STATE TIMER UI */
                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-50 p-6 md:p-10 animate-fade-in relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-300"></div>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">{sprint.category}</p>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">{sprint.title}</h2>
                                </div>
                                <div className="bg-gray-100 px-3 py-1 rounded-lg">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Day {viewingDay}</span>
                                </div>
                            </div>
                            <div className="bg-[#F9FAFB] rounded-[2rem] p-10 md:p-14 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                                <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 opacity-[0.03] scale-[2] pointer-events-none transition-transform group-hover:rotate-12 duration-1000">
                                    <LocalLogo type="favicon" className="w-64 h-64" />
                                </div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 relative z-10">Next Lesson In</p>
                                <h3 className="text-5xl md:text-7xl font-black text-gray-800 tracking-tighter tabular-nums relative z-10 leading-none">
                                    {timeToNextDay || "00:00:00"}
                                </h3>
                            </div>
                            <div className="mt-10">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Progress</span>
                                    <span className="text-[10px] font-black text-gray-400">{overallProgressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-gray-300 rounded-full transition-all duration-1000" style={{ width: `${overallProgressPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* UNLOCKED CONTENT VIEW */
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Lesson Material</h2>
                                <div className="bg-white rounded-2xl border border-gray-50 p-6 md:p-8 shadow-sm">
                                    <div className="prose max-w-none text-gray-600 font-medium text-xs sm:text-sm leading-relaxed">
                                        <FormattedText text={dayContent?.lessonText || "Lesson material is being synchronized..."} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Actionable Task</h2>
                                <div className="bg-white rounded-2xl border border-gray-50 p-6 md:p-8 shadow-sm">
                                    <p className="text-gray-900 font-bold text-sm sm:text-base leading-snug">
                                        <FormattedText text={dayContent?.taskPrompt || "Task protocol is loading..."} />
                                    </p>
                                </div>
                            </div>

                            <div className="pb-10">
                                {!isDayCompleted ? (
                                    <div className="space-y-4">
                                        {dayContent?.proofType === 'note' && (
                                            <textarea 
                                                value={textSubmission}
                                                onChange={(e) => setTextSubmission(e.target.value)}
                                                placeholder="Write your reflection here..."
                                                className="w-full bg-[#F2F7F5] border border-[#E1EBE7] rounded-xl p-5 text-xs font-medium text-primary placeholder-[#B8CCBE] outline-none focus:ring-2 focus:ring-primary/10 transition-all min-h-[100px] resize-none"
                                            />
                                        )}
                                        <button 
                                            onClick={handleStartCompletion}
                                            disabled={isSubmitting}
                                            className="w-full bg-[#159E5B] text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            Complete Task & Advance
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-[#F2F7F5] border border-[#E1EBE7] rounded-2xl p-6 flex flex-col items-center text-center space-y-3">
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Day Mastered</p>
                                                <p className="text-[10px] text-gray-500 font-medium italic">
                                                    {timeToNextDay 
                                                        ? `"Next window opens in ${timeToNextDay} at 12:00 AM"` 
                                                        : "The next path is now available."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* SAVED REFLECTION - Shown below mark complete as requested */}
                                        {(currentDayData as any)?.reflection && (
                                            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm animate-fade-in relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C14.9124 8 14.017 7.10457 14.017 6V3L19.017 3C20.6739 3 22.017 4.34315 22.017 6V15C22.017 17.7614 19.7784 20 17.017 20L14.017 21ZM2.017 21L2.017 18C2.017 16.8954 2.91243 16 4.017 16H7.017C7.56928 16 8.017 15.5523 8.017 15V9C8.017 8.44772 7.56928 8 7.017 8H4.017C2.91243 8 2.017 7.10457 2.017 6V3L7.017 3C8.67386 3 10.017 4.34315 10.017 6V15C10.017 17.7614 7.77837 20 5.017 20L2.017 21Z" /></svg>
                                                </div>
                                                <div className="relative z-10">
                                                    <p className="text-[9px] font-black text-[#0E7850] uppercase tracking-[0.25em] mb-4">Your Reflection</p>
                                                    <p className="text-gray-700 font-bold italic text-lg leading-tight">
                                                        "{(currentDayData as any).reflection}"
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default SprintView;