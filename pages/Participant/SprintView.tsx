import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { ParticipantSprint, Sprint, DailyContent, GlobalOrchestrationSettings, MicroSelector, MicroSelectorStep } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import FormattedText from '../../components/FormattedText';
import LocalLogo from '../../components/LocalLogo';

const ReflectionModal: React.FC<{
    day: number;
    isOpen: boolean;
    question?: string;
    onClose: () => void;
    onFinish: (reflection: string) => void;
    isSubmitting: boolean;
}> = ({ isOpen, day, question, onClose, onFinish, isSubmitting }) => {
    const [text, setText] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">Sprint Reflection</h3>
                <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-6 leading-tight">
                    {question || "One idea that shifted my thinking was..."}
                </p>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter your breakthrough..."
                    className="w-full bg-[#FAFAFA] border border-gray-100 rounded-2xl p-5 text-sm font-medium min-h-[140px] mb-8"
                />
                <button 
                    onClick={() => onFinish(text)}
                    disabled={isSubmitting}
                    className="w-full bg-[#0E7850] text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? 'Finalizing...' : `Finish Day ${day}`}
                </button>
                <button 
                    onClick={() => onFinish("")}
                    disabled={isSubmitting}
                    className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary transition-colors"
                >
                    Skip reflection for today
                </button>
            </div>
        </div>
    );
};

interface SectionHeadingProps {
    children: React.ReactNode;
    color?: string;
}

const SectionHeading: React.FC<SectionHeadingProps> = ({ children, color = "primary" }) => (
    <h2 className={`text-[8px] font-black text-${color} uppercase tracking-[0.4em] mb-4`}>
        {children}
    </h2>
);

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [timeToUnlock, setTimeToUnlock] = useState<string>('00:00:00');
    
    // Day Completion State (Proof)
    const [proofInput, setProofInput] = useState('');
    const [proofSelected, setProofSelected] = useState('');

    const [reflectionsEnabled, setReflectionsEnabled] = useState(true);
    const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);

    useEffect(() => {
        if (!enrollmentId) return;
        const unsubscribe = sprintService.subscribeToEnrollment(enrollmentId, async (data) => {
            if (data) {
                setEnrollment(data);
                if (data.reflectionsDisabled !== undefined) {
                    setReflectionsEnabled(!data.reflectionsDisabled);
                }
                if (!sprint) {
                    const found = await sprintService.getSprintById(data.sprint_id);
                    setSprint(found);
                    const firstIncomplete = data.progress?.find(p => !p.completed);
                    setViewingDay(firstIncomplete ? firstIncomplete.day : (data.progress?.length || 1));
                }
            }
        });
        return () => unsubscribe();
    }, [enrollmentId, sprint]);

    useEffect(() => {
      const loadSettings = async () => {
        const settings = await sprintService.getGlobalOrchestrationSettings();
        setGlobalSettings(settings);
      };
      loadSettings();
    }, []);

    useEffect(() => {
        setProofInput('');
        setProofSelected('');
    }, [viewingDay]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const dayLockDetails = useMemo(() => {
        if (!enrollment || !sprint || !enrollment.progress) return { isLocked: false, unlockTime: 0 };
        
        if (viewingDay === 1) return { isLocked: false, unlockTime: 0 };

        const prevDay = enrollment.progress.find(p => p.day === viewingDay - 1);
        
        if (!prevDay?.completed) return { isLocked: true, unlockTime: 0, reason: 'Complete previous day first.' };

        if (prevDay.completedAt) {
            const completedDate = new Date(prevDay.completedAt);
            const nextMidnight = new Date(
                completedDate.getFullYear(),
                completedDate.getMonth(),
                completedDate.getDate() + 1,
                0, 0, 0
            ).getTime();
            
            const isLocked = now < nextMidnight;
            return { isLocked, unlockTime: nextMidnight };
        }

        return { isLocked: false, unlockTime: 0 };
    }, [enrollment, sprint, viewingDay, now]);

    useEffect(() => {
        if (dayLockDetails.isLocked && dayLockDetails.unlockTime) {
            const diff = dayLockDetails.unlockTime - now;
            if (diff > 0) {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeToUnlock(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
            } else {
                setTimeToUnlock('00:00:00');
            }
        }
    }, [dayLockDetails, now]);

    const toggleReflectionState = async () => {
        if (!enrollment) return;
        const newState = !reflectionsEnabled;
        setReflectionsEnabled(newState);
        try {
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { reflectionsDisabled: !newState });
        } catch (err) {
            console.error("Toggle reflection state failed", err);
        }
    };

    const handleFinishDay = async (reflection: string) => {
        if (!enrollment || !user || isSubmitting || !enrollment.progress) return;
        setIsSubmitting(true);
        try {
            const timestamp = new Date().toISOString();
            const isLastDay = viewingDay === enrollment.progress.length;
            const updatedProgress = enrollment.progress.map(p => 
                p.day === viewingDay ? { 
                    ...p, 
                    completed: true, 
                    completedAt: timestamp, 
                    reflection: reflection.trim(),
                    submission: proofInput,
                    proofSelection: proofSelected
                } : p
            );
            
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            const updatePayload: any = { 
                progress: updatedProgress,
                last_activity_at: timestamp
            };

            if (isLastDay && updatedProgress.every(p => p.completed)) {
                updatePayload.completed_at = timestamp;
                updatePayload.status = 'completed';
            }

            await updateDoc(enrollmentRef, updatePayload);
            setIsReflectionModalOpen(false);

            if (isLastDay && updatedProgress.every(p => p.completed)) {
                navigate('/discover', { replace: true });
            }
        } catch (err) {
            console.error("Completion failed", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const dayContent = sprint?.dailyContent?.find(dc => dc.day === viewingDay);
    const dayProgress = enrollment?.progress?.find(p => p.day === viewingDay);

    const isProofMet = useMemo(() => {
        if (!dayContent) return false;
        if (dayContent.proofType === 'picker') return !!proofSelected;
        if (dayContent.proofType === 'note') return proofInput.trim().length > 2;
        return true; // confirmation
    }, [dayContent, proofInput, proofSelected]);

    const handleQuickComplete = () => {
        if (!isProofMet) return;
        if (reflectionsEnabled) {
            setIsReflectionModalOpen(true);
        } else {
            handleFinishDay("");
        }
    };

    if (!enrollment || !sprint || !enrollment.progress) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
            <ReflectionModal 
                isOpen={isReflectionModalOpen} 
                day={viewingDay} 
                question={dayContent?.reflectionQuestion}
                onClose={() => setIsReflectionModalOpen(false)} 
                onFinish={handleFinishDay} 
                isSubmitting={isSubmitting} 
            />

            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Link to={`/sprint/${sprint.id}`} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </Link>
                        <button 
                            onClick={toggleReflectionState}
                            className={`p-2.5 rounded-2xl shadow-sm transition-all border ${reflectionsEnabled ? 'bg-white text-primary border-gray-100' : 'bg-primary text-white border-primary'} active:scale-95`}
                            title={reflectionsEnabled ? "Disable Reflections" : "Enable Reflections"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => {
                        const isActive = viewingDay === day;
                        const prog = enrollment.progress?.find(p => p.day === day);
                        const isCompleted = prog?.completed;
                        
                        const firstIncomplete = enrollment.progress?.find(p => !p.completed)?.day || sprint.duration;
                        const isDisabled = day > firstIncomplete;

                        return (
                            <button
                                key={day}
                                disabled={isDisabled}
                                onClick={() => setViewingDay(day)}
                                className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 ${
                                    isActive
                                        ? 'bg-[#0E7850] text-white shadow-xl shadow-primary/20 scale-105'
                                        : isDisabled 
                                        ? 'bg-[#F3F4F6] text-gray-200 cursor-not-allowed opacity-50'
                                        : 'bg-[#F3F4F6] text-gray-400'
                                }`}
                            >
                                {isCompleted && (
                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#0E7850]'}`}></div>
                                )}
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                                <span className="text-3xl font-black leading-none">{day}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden min-h-[400px]">
                    {enrollment.status === 'queued' && (
                        <div className="absolute inset-0 z-20 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                            <div className="mb-6 opacity-20">
                                <LocalLogo type="favicon" className="w-32 h-32" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight italic mb-2">In the Queue.</h2>
                            <p className="text-sm text-gray-500 font-medium mb-10 max-w-xs">
                                You have an active sprint running. This journey will automatically unlock once your current focus is complete.
                            </p>
                            <button 
                                onClick={() => navigate('/dashboard')}
                                className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95"
                            >
                                Return to Active Focus
                            </button>
                        </div>
                    )}

                    {dayLockDetails.isLocked && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                            <div className="mb-6 opacity-20">
                                <LocalLogo type="favicon" className="w-32 h-32" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight italic mb-2">Protocol Locked.</h2>
                            <p className="text-sm text-gray-500 font-medium mb-10 max-w-xs">
                                {dayLockDetails.unlockTime 
                                    ? `Next lesson unlocks at midnight.`
                                    : dayLockDetails.reason || 'Complete previous day first.'}
                            </p>
                            
                            {dayLockDetails.unlockTime && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Available In</p>
                                    <p className="text-4xl font-black text-gray-900 tabular-nums tracking-tighter">{timeToUnlock}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className={dayLockDetails.isLocked ? 'blur-sm pointer-events-none opacity-20' : ''}>
                        <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day {viewingDay}</h2>
                        
                        <div className="space-y-2 mb-10">
                            <SectionHeading>Today's Insight</SectionHeading>
                            <div className="text-gray-700 font-medium text-base leading-[1.6] max-w-[60ch]">
                                <FormattedText text={dayContent?.lessonText || ""} />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative group">
                                <SectionHeading>Today's Action Step</SectionHeading>
                                <p className="text-gray-900 font-bold text-sm sm:text-base leading-snug">
                                    <FormattedText text={dayContent?.taskPrompt || ""} />
                                </p>
                                <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                            </div>

                            {dayContent?.coachInsight && (
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <SectionHeading color="gray-400">Coach Insight</SectionHeading>
                                    <div className="text-gray-600 italic font-medium text-xs md:text-sm leading-relaxed">
                                        <FormattedText text={dayContent.coachInsight} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {!dayProgress?.completed && (
                            <div className="mt-12 space-y-6 animate-fade-in">
                                {dayContent?.proofType === 'picker' && (
                                    <div className="space-y-3">
                                        <SectionHeading>Proof of Action</SectionHeading>
                                        <div className="grid grid-cols-1 gap-2">
                                            {dayContent.proofOptions?.map(opt => (
                                                <button 
                                                    key={opt}
                                                    onClick={() => setProofSelected(opt)}
                                                    className={`w-full text-left p-4 rounded-xl border transition-all text-xs font-bold uppercase tracking-tight ${proofSelected === opt ? 'bg-primary text-white border-primary shadow-md scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-white hover:border-primary/20'}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {dayContent?.proofType === 'note' && (
                                    <div className="space-y-3">
                                        <SectionHeading>Submit Today's Response</SectionHeading>
                                        <textarea 
                                            value={proofInput}
                                            onChange={e => setProofInput(e.target.value)}
                                            placeholder="Enter your response here..."
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm font-medium min-h-[120px] focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                )}

                                <button 
                                  onClick={handleQuickComplete}
                                  disabled={isSubmitting || !isProofMet}
                                  className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl transition-all ${isProofMet ? 'bg-[#159E5B] text-white shadow-primary/10 active:scale-95' : 'bg-gray-100 text-gray-300 cursor-not-allowed grayscale'}`}
                                >
                                  {dayContent?.proofType === 'note' ? 'Send Submission' : "Today's task completed"}
                                </button>
                            </div>
                        )}

                        {dayProgress?.completed && (
                            <div className="mt-12 space-y-6">
                                <div className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] text-center border border-gray-100">
                                    Mission Complete
                                </div>

                                {dayProgress.submission && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Your Submission</p>
                                        <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100">
                                            <p className="text-gray-700 font-bold text-sm leading-relaxed">
                                                {dayProgress.submission}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {dayProgress.proofSelection && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Confirmed Outcome</p>
                                        <div className="bg-gray-50 rounded-[1.5rem] p-4 border border-gray-100 flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                                            <p className="text-xs font-black uppercase text-gray-700">{dayProgress.proofSelection}</p>
                                        </div>
                                    </div>
                                )}

                                {dayProgress.reflection && (
                                    <div className="animate-fade-in pt-4 border-t border-gray-50">
                                        <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-4">Your Breakthrough</p>
                                        <div className="bg-primary/5 rounded-[1.5rem] p-6 border border-primary/10">
                                            <p className="text-gray-800 italic font-medium text-sm leading-relaxed">
                                                "{dayProgress.reflection}"
                                            </p>
                                        </div>
                                    </div>
                                )}
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
                @keyframes slideUp { from { opacity: 0; transform: translateY(0); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;