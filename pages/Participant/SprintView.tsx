import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ParticipantSprint, Sprint } from '../../types';
import Button from '../../components/Button';
import ProgressBar from '../../components/ProgressBar';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import FormattedText from '../../components/FormattedText';

const SprintView: React.FC = () => {
    const { user } = useAuth();
    const { enrollmentId } = useParams();
    const navigate = useNavigate();
    const [enrollment, setEnrollment] = useState<ParticipantSprint | null>(null);
    const [sprint, setSprint] = useState<Sprint | null>(null);
    const [viewingDay, setViewingDay] = useState<number>(1);
    const [textSubmission, setTextSubmission] = useState('');

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

    if (!enrollment || !sprint) return <div className="flex items-center justify-center min-h-screen text-gray-400 font-bold uppercase tracking-widest text-[10px]">Syncing Journey...</div>;

    const progressPercent = (enrollment.progress.filter(p => p.completed).length / sprint.duration) * 100;
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const isCompleted = enrollment.progress.find(p => p.day === viewingDay)?.completed;

    return (
        <div className="max-w-screen-lg mx-auto px-4 py-4 md:py-8 animate-fade-in pb-24">
            
            <header className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div className="min-w-0 w-full">
                    <button onClick={() => navigate(-1)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1 hover:text-primary transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                        Exit Session
                    </button>
                    <h1 className="text-2xl md:text-4xl font-black text-dark tracking-tight leading-tight">{sprint.title}</h1>
                </div>
                <div className="w-full md:w-60">
                    <ProgressBar value={progressPercent} label="Progress" />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Timeline - Compact */}
                <aside className="lg:col-span-3 order-2 lg:order-1 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 hide-scrollbar">
                    <div className="flex lg:flex-col gap-2 min-w-max lg:min-w-0 lg:sticky lg:top-6">
                        {enrollment.progress.map(p => (
                            <button key={p.day} onClick={() => setViewingDay(p.day)} className={`flex items-center justify-center lg:justify-between px-4 py-2.5 lg:py-3 lg:px-5 rounded-xl transition-all whitespace-nowrap ${viewingDay === p.day ? 'bg-primary text-white shadow-md' : p.completed ? 'bg-green-50 text-green-700' : 'bg-white border border-gray-100 text-gray-400'}`}>
                                <span className="font-black text-[9px] uppercase tracking-widest">Day {p.day}</span>
                                {p.completed && <svg className="hidden lg:block w-3.5 h-3.5 ml-2" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                            </button>
                        ))}
                    </div>
                </aside>

                {/* Main Content Viewer - Reduced padding */}
                <main className="lg:col-span-9 order-1 lg:order-2">
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-50 shadow-sm overflow-hidden">
                        <div className="px-5 py-6 md:px-10 md:py-12">
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em] mb-5 block">Material • Day {viewingDay}</span>
                            
                            <div className="max-w-3xl">
                                <div className="text-base font-medium leading-relaxed text-gray-700 mb-8 prose">
                                    <FormattedText text={currentDayContent?.lessonText || "Syncing material..."} />
                                </div>

                                <div className="bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/10 mb-8">
                                    <h4 className="text-[9px] font-black text-primary uppercase tracking-widest mb-5">
                                        Actionable Step
                                    </h4>
                                    <p className="text-lg font-black text-dark leading-snug mb-6">
                                        <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                    </p>
                                    
                                    {!isCompleted ? (
                                        <textarea 
                                            value={textSubmission} 
                                            onChange={e => setTextSubmission(e.target.value)} 
                                            placeholder="Notes on your progress..." 
                                            className="w-full p-4 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all text-sm font-medium resize-none h-28"
                                        />
                                    ) : (
                                        <div className="bg-white/60 p-3 rounded-xl border border-primary/5 text-center">
                                            <p className="font-bold text-gray-600 text-sm italic">"Submission verified for this phase."</p>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-5 border-t border-gray-50 flex justify-between items-center">
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{isCompleted ? 'Finished' : 'Action Required'}</p>
                                    {!isCompleted ? (
                                        <Button className="px-6 py-3 rounded-lg text-[10px] uppercase tracking-widest" disabled={!textSubmission.trim()}>Secure Milestone</Button>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-green-600 font-black uppercase tracking-widest text-[9px]">✓ Step Cleared</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;