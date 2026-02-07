import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ParticipantSprint, Sprint, DailyContent } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import FormattedText from '../../components/FormattedText';

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

    // Timer Logic: Countdown to Midnight
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

    const canSubmit = useMemo(() => {
        if (!dayContent) return false;
        if (dayContent.proofType === 'confirmation') return true;
        if (dayContent.proofType === 'picker') return !!proofSelection;
        if (dayContent.proofType === 'note') return !!textSubmission.trim();
        return true;
    }, [dayContent, proofSelection, textSubmission]);

    const handleCompleteDay = async () => {
        if (!enrollment || !user || !canSubmit) return;
        setIsSubmitting(true);
        try {
            const updatedProgress = enrollment.progress.map(p => 
                p.day === viewingDay ? { 
                    ...p, 
                    completed: true, 
                    completedAt: new Date().toISOString(), 
                    submission: textSubmission,
                    proofSelection: proofSelection
                } : p
            );
            
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { progress: updatedProgress });
            
            setTextSubmission('');
            setProofSelection('');
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

    const isDayLocked = (day: number) => {
        if (day === 1) return false;
        const prevDay = enrollment.progress.find(p => p.day === day - 1);
        // If prev day isn't done, it's locked
        if (!prevDay?.completed) return true;
        
        // If prev day WAS done, we check if it's currently "today" relative to the completion
        // For the sake of this UI, if prev day is done, day is unlocked unless it's strictly a 24h wait
        // The user requested: "timer down till 12 AM to unlock the next day"
        const nowMs = new Date().getTime();
        const completedDate = new Date(prevDay.completedAt!);
        const nextMidnightMs = new Date(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate() + 1, 0, 0, 0).getTime();
        
        return nowMs < nextMidnightMs;
    };

    return (
        <div className="min-h-screen w-full bg-[#FAFAFA] flex flex-col font-sans text-dark overflow-y-auto animate-fade-in pb-12">
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
                        <h1 className="text-xl font-black text-gray-900 tracking-tight truncate">{sprint.title}</h1>
                        <p className="text-[8px] font-black text-primary uppercase tracking-[0.3em] opacity-60">Cycle Registry</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => navigate(`/sprint/${sprint.id}`)}
                            className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
                            title="View Description"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        <button 
                            className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
                            title="Reach Coach"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Curriculum Timeline - Reduced Size */}
                <div className="bg-white rounded-3xl p-5 border border-gray-50 shadow-sm overflow-hidden">
                    <h2 className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Curriculum Timeline</h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar items-center">
                        {enrollment.progress.map((p) => {
                            const locked = isDayLocked(p.day);
                            const active = viewingDay === p.day;
                            const done = p.completed;

                            return (
                                <button 
                                    key={p.day}
                                    onClick={() => !locked && setViewingDay(p.day)}
                                    disabled={locked}
                                    className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative shadow-sm border ${
                                        active 
                                        ? 'bg-[#0E7850] text-white border-[#0E7850] shadow-lg shadow-green-100' 
                                        : done 
                                        ? 'bg-white text-primary border-primary/20' 
                                        : 'bg-gray-50 text-gray-400 border-transparent'
                                    } ${locked ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                >
                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-60 mb-0.5">Day</span>
                                    <span className="text-xl font-black leading-none">{p.day}</span>
                                    {done && !active && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-primary rounded-full"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Lesson Material - Reduced padding */}
                <div>
                    <h2 className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Lesson Material</h2>
                    <div className="bg-white rounded-2xl border border-gray-50 p-6 shadow-sm min-h-[160px]">
                        <div className="prose max-w-none text-gray-600 font-medium text-xs sm:text-sm leading-relaxed">
                            <FormattedText text={dayContent?.lessonText || "Lesson material is being synchronized..."} />
                        </div>
                    </div>
                </div>

                {/* Actionable Task - Reduced padding */}
                <div>
                    <h2 className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Actionable Task</h2>
                    <div className="bg-white rounded-2xl border border-gray-50 p-6 shadow-sm">
                        <p className="text-gray-900 font-bold text-sm sm:text-base leading-tight">
                            <FormattedText text={dayContent?.taskPrompt || "Task protocol is loading..."} />
                        </p>
                    </div>
                </div>

                {/* Proof of Action & Completion Button at the end */}
                <div>
                    <h2 className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Proof of Action</h2>
                    {!isDayCompleted ? (
                        <div className="space-y-4">
                             {dayContent?.proofType === 'picker' && (
                                 <div className="grid grid-cols-1 gap-2">
                                     {(dayContent.proofOptions || []).map((option, idx) => (
                                         <button
                                            key={idx}
                                            onClick={() => setProofSelection(option)}
                                            className={`w-full py-3.5 px-5 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between group ${
                                                proofSelection === option 
                                                ? 'bg-primary border-primary text-white shadow-md' 
                                                : 'bg-white border-gray-100 text-gray-600 hover:border-primary/20'
                                            }`}
                                         >
                                             {option}
                                             <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${proofSelection === option ? 'bg-white border-white' : 'border-gray-200 group-hover:border-primary/40'}`}>
                                                 {proofSelection === option && <div className="w-2 h-2 bg-primary rounded-full" />}
                                             </div>
                                         </button>
                                     ))}
                                 </div>
                             )}

                             {dayContent?.proofType === 'note' && (
                                 <textarea 
                                    value={textSubmission}
                                    onChange={(e) => setTextSubmission(e.target.value)}
                                    placeholder="Drop a critique or guidance for this section..."
                                    className="w-full bg-[#F2F7F5] border border-[#E1EBE7] rounded-xl p-4 text-xs font-medium text-primary placeholder-[#B8CCBE] outline-none focus:ring-2 focus:ring-primary/10 transition-all min-h-[100px] resize-none"
                                 />
                             )}

                             {dayContent?.proofType === 'confirmation' && (
                                 <div className="p-6 bg-white rounded-2xl border border-gray-100 text-center shadow-sm">
                                     <p className="text-[10px] font-medium text-gray-400 italic">"No submission required. Confirm your action below."</p>
                                 </div>
                             )}

                            {/* MARK COMPLETE BUTTON - AT THE END */}
                            <button 
                                onClick={handleCompleteDay}
                                disabled={!canSubmit || isSubmitting}
                                className={`w-full bg-[#159E5B] text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale`}
                            >
                                {isSubmitting ? 'Processing...' : 'Complete Task & Advance'}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-[#F2F7F5] border border-[#E1EBE7] rounded-2xl p-5 flex flex-col items-center text-center space-y-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-sm">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Entry Confirmed</p>
                                <p className="text-[10px] text-gray-500 font-medium italic">"Next cycle window opens in {timeToNextDay || '...'} at 12:00 AM"</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default SprintView;