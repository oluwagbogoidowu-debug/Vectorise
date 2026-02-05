import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { ParticipantSprint, Sprint, UserRole, CoachingComment, Review, Coach, Participant } from '../../types';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { chatService } from '../../services/chatService';
import { sprintService } from '../../services/sprintService';
import { notificationService } from '../../services/notificationService';
import { eventService } from '../../services/eventService';
import { userService } from '../../services/userService';
import { getSprintOutcomes } from '../../utils/sprintUtils';
import { MOCK_USERS } from '../../services/mockData';
import FormattedText from '../../components/FormattedText';

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [now, setNow] = useState(Date.now());
    const [textSubmission, setTextSubmission] = useState('');
    const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);

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
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!enrollment || !sprint) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;

    const progressPercent = (enrollment.progress.filter(p => p.completed).length / sprint.duration) * 100;
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const isCompleted = enrollment.progress.find(p => p.day === viewingDay)?.completed;

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 animate-fade-in text-base lg:text-lg pb-32">
            
            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <button onClick={() => navigate(-1)} className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-primary transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Back
                    </button>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark tracking-tighter leading-none">{sprint.title}</h1>
                </div>
                <div className="w-full md:w-80">
                    <ProgressBar value={progressPercent} label="Course Progress" />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
                
                {/* Timeline Sidebar */}
                <aside className="lg:col-span-3 order-2 lg:order-1">
                    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm sticky top-8">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 px-2">Timeline</h3>
                        <div className="space-y-3">
                            {enrollment.progress.map(p => (
                                <button key={p.day} onClick={() => setViewingDay(p.day)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${viewingDay === p.day ? 'bg-primary text-white shadow-lg shadow-primary/20' : p.completed ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                                    <span className="font-black text-xs uppercase tracking-widest">Day {p.day}</span>
                                    {p.completed ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg> : <div className={`w-1.5 h-1.5 rounded-full ${viewingDay === p.day ? 'bg-white' : 'bg-gray-300'}`} />}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Lesson Content Area */}
                <main className="lg:col-span-9 order-1 lg:order-2">
                    <div className="bg-white rounded-[2.5rem] lg:rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden">
                        <div className="px-8 md:px-12 lg:px-20 py-12 md:py-16">
                            <span className="text-xs md:text-sm font-black text-primary uppercase tracking-[0.4em] mb-8 block">Phase Day {viewingDay} Instruction</span>
                            
                            <div className="max-w-3xl">
                                <div className="text-lg lg:text-xl font-medium leading-relaxed md:leading-loose text-dark mb-12">
                                    <FormattedText text={currentDayContent?.lessonText || "Resuming session..."} />
                                </div>

                                <div className="bg-primary/5 rounded-[2.5rem] p-8 md:p-12 border border-primary/10 mb-12 shadow-inner">
                                    <h4 className="flex items-center gap-3 text-xs md:text-sm font-black text-primary uppercase tracking-widest mb-6">
                                        <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center">⚡</div>
                                        Required Action
                                    </h4>
                                    <p className="text-xl md:text-2xl font-black text-dark leading-tight mb-8">
                                        <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                    </p>
                                    
                                    {!isCompleted && (
                                        <textarea 
                                            value={textSubmission} 
                                            onChange={e => setTextSubmission(e.target.value)} 
                                            placeholder="Write your reflection or response here..." 
                                            className="w-full p-6 md:p-8 bg-white border border-primary/10 rounded-[2rem] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-sm md:text-base font-medium resize-none shadow-sm h-48"
                                        />
                                    )}
                                    
                                    {isCompleted && (
                                        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-primary/5 shadow-sm">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">Stored Submission</p>
                                            <p className="font-bold text-gray-700 italic">"Success recorded for this day."</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-8 border-t border-gray-100 flex justify-between items-center">
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{isCompleted ? 'Milestone Cleared' : 'Action Pending'}</p>
                                    {!isCompleted ? (
                                        <Button className="px-10 py-5 rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all text-sm md:text-base" disabled={!textSubmission.trim()}>Secure Day {viewingDay} Win</Button>
                                    ) : (
                                        <span className="flex items-center gap-2 text-green-600 font-black uppercase tracking-widest text-xs">✓ Step Verified</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;