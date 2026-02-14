
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
            <div className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden animate-slide-up flex flex-col p-8">
                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-8">Sprint Reflection</h3>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="One idea that shifted my thinking was..."
                    className="w-full bg-[#FAFAFA] border border-gray-100 rounded-2xl p-5 text-sm font-medium min-h-[140px] mb-8"
                />
                <button 
                    onClick={() => onFinish(text)}
                    disabled={isSubmitting}
                    className="w-full bg-[#0E7850] text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50"
                >
                    {isSubmitting ? 'Finalizing...' : `Finish Day ${day}`}
                </button>
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReflectionModalOpen, setIsReflectionModalOpen] = useState(false);
    
    const [reflectionsEnabled, setReflectionsEnabled] = useState(true);
    const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
    const [showMicroSelector, setShowMicroSelector] = useState(false);
    const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);

    useEffect(() => {
        if (!enrollmentId) return;
        const unsubscribe = sprintService.subscribeToEnrollment(enrollmentId, async (data) => {
            if (data) {
                setEnrollment(data);
                if (data.reflectionsDisabled !== undefined) {
                    setReflectionsEnabled(!data.reflectionsDisabled);
                }
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

    useEffect(() => {
      const loadSettings = async () => {
        const settings = await sprintService.getGlobalOrchestrationSettings();
        setGlobalSettings(settings);
      };
      loadSettings();
    }, []);

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
        if (!enrollment || !user || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const updatedProgress = enrollment.progress.map(p => 
                p.day === viewingDay ? { ...p, completed: true, completedAt: new Date().toISOString(), reflection: reflection.trim() } : p
            );
            const enrollmentRef = doc(db, 'enrollments', enrollment.id);
            await updateDoc(enrollmentRef, { progress: updatedProgress });
            
            setIsReflectionModalOpen(false);

            if (viewingDay === enrollment.progress.length && updatedProgress.every(p => p.completed)) {
                const prevEnrollments = await sprintService.getUserEnrollments(user.id);
                const totalFinished = prevEnrollments.filter(e => e.progress.every(p => p.completed)).length;
                const isPaid = (sprint?.price || 0) > 0;
                
                let triggerId: any = null;
                if (totalFinished === 1) triggerId = isPaid ? 'after_1_paid_sprint' : 'after_1_sprint';
                else if (totalFinished === 2) triggerId = isPaid ? 'after_2_paid_sprints' : 'after_2_sprints';
                else if (totalFinished === 3) triggerId = 'after_3_sprints';

                const action = triggerId && globalSettings?.triggerActions?.[triggerId];
                if (action) {
                  if (action.type === 'show_micro_selector') {
                    const selector = globalSettings.microSelectors.find(ms => ms.id === action.value);
                    if (selector) {
                      setActiveSelector(selector);
                      setCurrentStepIdx(0);
                      setShowMicroSelector(true);
                      setIsSubmitting(false);
                      return;
                    }
                  } else if (action.type === 'recommend_sprint') {
                    navigate(`/sprint/${action.value}`, { replace: true });
                    return;
                  }
                }
                navigate('/discover', { replace: true });
            }
        } catch (err) {
            console.error("Completion failed", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickComplete = () => {
        if (reflectionsEnabled) {
            setIsReflectionModalOpen(true);
        } else {
            handleFinishDay("");
        }
    };

    const handleOptionClick = (option: any) => {
      if (option.action === 'next_step') {
        setCurrentStepIdx(currentStepIdx + 1);
      } else if (option.action === 'skip_to_stage') {
        navigate('/discover', { state: { targetStage: option.value }, replace: true });
      } else if (option.action === 'finish_and_recommend') {
        navigate('/discover', { replace: true });
      }
    };

    if (!enrollment || !sprint) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    const dayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const dayProgress = enrollment.progress.find(p => p.day === viewingDay);
    const currentStep = activeSelector?.steps[currentStepIdx];

    return (
        <div className="w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
            <ReflectionModal isOpen={isReflectionModalOpen} day={viewingDay} onClose={() => setIsReflectionModalOpen(false)} onFinish={handleFinishDay} isSubmitting={isSubmitting} />

            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 active:scale-95 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate italic">{sprint.title}</h1>
                    </div>
                    <button 
                        onClick={toggleReflectionState}
                        className={`p-2.5 rounded-2xl shadow-sm transition-all border ${reflectionsEnabled ? 'bg-white text-primary border-gray-100' : 'bg-primary text-white border-primary'} active:scale-95`}
                        title={reflectionsEnabled ? "Disable Reflections" : "Enable Reflections"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </button>
                </div>

                {/* Sub-Header Actions */}
                <div className="flex gap-2 mt-6">
                    <Link to={`/sprint/${sprint.id}`} className="flex-1 bg-white border border-gray-100 rounded-xl py-3 px-4 flex items-center justify-center gap-2 group hover:bg-gray-50 transition-all active:scale-[0.98]">
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary">Protocol Info</span>
                    </Link>
                    <button className="flex-1 bg-white border border-gray-100 rounded-xl py-3 px-4 flex items-center justify-center gap-2 group hover:bg-gray-50 transition-all active:scale-[0.98]">
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-primary">Message Coach</span>
                    </button>
                </div>
            </header>

            <div className="px-6 max-w-2xl mx-auto w-full space-y-6 mt-4">
                {/* Day Navigation Strip */}
                <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar scroll-smooth px-1">
                    {Array.from({ length: sprint.duration }, (_, i) => i + 1).map((day) => {
                        const isActive = viewingDay === day;
                        const isCompleted = enrollment.progress.find(p => p.day === day)?.completed;

                        return (
                            <button
                                key={day}
                                onClick={() => setViewingDay(day)}
                                className={`flex-shrink-0 w-20 h-20 rounded-[1.5rem] flex flex-col items-center justify-center relative transition-all duration-300 active:scale-95 ${
                                    isActive
                                        ? 'bg-[#0E7850] text-white shadow-xl shadow-primary/20 scale-105'
                                        : 'bg-[#F3F4F6] text-gray-400'
                                }`}
                            >
                                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isCompleted ? (isActive ? 'bg-white' : 'bg-[#0E7850]') : 'bg-transparent'}`}></div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                                <span className="text-3xl font-black leading-none">{day}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-3xl p-6 md:p-10 border border-gray-100 shadow-sm animate-slide-up relative overflow-hidden">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.25em] mb-6">Execution Path Day {viewingDay}</h2>
                    
                    <div className="prose max-w-none text-gray-700 font-medium text-sm md:text-base leading-relaxed mb-10">
                        <FormattedText text={dayContent?.lessonText || ""} />
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 relative group">
                            <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-3">Today's Mission</p>
                            <p className="text-gray-900 font-bold text-sm sm:text-base leading-snug">
                                <FormattedText text={dayContent?.taskPrompt || ""} />
                            </p>
                            <div className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        </div>

                        {/* Coach Insight Section */}
                        {dayContent?.coachInsight && (
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Coach's Insight</p>
                                <p className="text-gray-600 italic font-medium text-xs md:text-sm leading-relaxed">
                                    "{dayContent.coachInsight}"
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 space-y-6">
                        <button 
                          onClick={handleQuickComplete}
                          disabled={isSubmitting || dayProgress?.completed}
                          className="w-full py-5 bg-[#159E5B] text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] shadow-xl shadow-primary/10 active:scale-95 disabled:opacity-50 transition-all"
                        >
                          {dayProgress?.completed ? 'Mission Complete' : 'Mark Task Complete'}
                        </button>

                        {/* Completed Reflection Display */}
                        {dayProgress?.completed && dayProgress.reflection && (
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
                </div>
            </div>

            {showMicroSelector && activeSelector && currentStep && (
              <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-dark/95 backdrop-blur-md animate-fade-in">
                <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-sm shadow-2xl relative animate-slide-up">
                  <header className="text-center mb-10">
                    <LocalLogo type="favicon" className="h-10 w-auto mx-auto mb-6 opacity-40" />
                    <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight italic leading-tight px-2">{currentStep.question}</h2>
                  </header>
                  <div className="space-y-3">
                    {currentStep.options.map((opt, idx) => (
                      <button key={idx} onClick={() => handleOptionClick(opt)} className="w-full py-4 px-6 bg-gray-50 border border-gray-100 rounded-2xl font-black text-[9px] uppercase tracking-widest text-gray-500 hover:bg-primary hover:text-white transition-all cursor-pointer">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;
