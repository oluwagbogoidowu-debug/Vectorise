
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
    
    const [globalSettings, setGlobalSettings] = useState<GlobalOrchestrationSettings | null>(null);
    const [showMicroSelector, setShowMicroSelector] = useState(false);
    const [activeSelector, setActiveSelector] = useState<MicroSelector | null>(null);
    const [currentStepIdx, setCurrentStepIdx] = useState(0);

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

    useEffect(() => {
      const loadSettings = async () => {
        const settings = await sprintService.getGlobalOrchestrationSettings();
        setGlobalSettings(settings);
      };
      loadSettings();
    }, []);

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

            // Final day logic
            if (viewingDay === enrollment.progress.length && updatedProgress.every(p => p.completed)) {
                // Determine Trigger ID based on count
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
    const currentStep = activeSelector?.steps[currentStepIdx];

    return (
        <div className="w-full bg-[#FAFAFA] flex flex-col font-sans text-dark animate-fade-in pb-24">
            <ReflectionModal isOpen={isReflectionModalOpen} day={viewingDay} onClose={() => setIsReflectionModalOpen(false)} onFinish={handleFinishDay} isSubmitting={isSubmitting} />

            <header className="px-6 pt-10 pb-4 max-w-2xl mx-auto w-full sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md">
                <div className="flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="text-center flex-1 mx-4 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate">{sprint.title}</h1>
                    </div>
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
                                {/* Status Dot */}
                                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-[#0E7850]'}`}></div>

                                <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-white/60' : 'text-gray-300'}`}>Day</span>
                                <span className="text-3xl font-black leading-none">{day}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-50 shadow-sm animate-slide-up">
                    <h2 className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Lesson Day {viewingDay}</h2>
                    <div className="prose max-w-none text-gray-600 font-medium text-xs sm:text-sm leading-relaxed mb-8">
                        <FormattedText text={dayContent?.lessonText || ""} />
                    </div>
                    <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                        <p className="text-gray-900 font-bold text-sm sm:text-base leading-snug">
                            <FormattedText text={dayContent?.taskPrompt || ""} />
                        </p>
                    </div>
                    <div className="mt-8">
                        <button 
                          onClick={() => setIsReflectionModalOpen(true)}
                          disabled={isSubmitting || enrollment.progress.find(p => p.day === viewingDay)?.completed}
                          className="w-full py-4 bg-[#159E5B] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg disabled:opacity-50"
                        >
                          {enrollment.progress.find(p => p.day === viewingDay)?.completed ? 'Day Completed' : 'Mark Task Complete'}
                        </button>
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
