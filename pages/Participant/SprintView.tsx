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

    if (!enrollment || !sprint) return <div className="flex items-center justify-center h-screen text-gray-400 font-black uppercase tracking-widest text-[7px]">Syncing...</div>;

    const progressPercent = (enrollment.progress.filter(p => p.completed).length / sprint.duration) * 100;
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const isCompleted = enrollment.progress.find(p => p.day === viewingDay)?.completed;

    return (
        <div className="h-screen w-full bg-light flex flex-col overflow-hidden animate-fade-in">
            {/* Fixed Top Navigation Header */}
            <header className="px-5 pt-3 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="max-w-screen-lg mx-auto w-full">
                    <div className="flex justify-between items-start mb-2">
                        <button onClick={() => navigate(-1)} className="text-[7px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 hover:text-primary transition-colors">
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                            Exit
                        </button>
                        <p className="text-[7px] font-black text-primary uppercase tracking-[0.2em]">Session • Day {viewingDay}</p>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                        <h1 className="text-lg font-black text-gray-900 tracking-tight leading-tight truncate w-full md:flex-1">{sprint.title}</h1>
                        <div className="w-full md:w-36 h-1 flex-shrink-0">
                            <ProgressBar value={progressPercent} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Scrollable Main Content & Nav Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-screen-lg mx-auto w-full">
                
                {/* Timeline - Left on Desktop, Top horizontal on Mobile */}
                <aside className="w-full md:w-28 flex-shrink-0 bg-white border-b md:border-b-0 md:border-r border-gray-50 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar py-2 md:py-4 px-4 md:px-2 gap-1.5">
                    {enrollment.progress.map(p => (
                        <button 
                            key={p.day} 
                            onClick={() => setViewingDay(p.day)} 
                            className={`flex flex-shrink-0 flex-col items-center justify-center w-14 md:w-auto h-12 md:h-14 rounded-xl transition-all ${
                                viewingDay === p.day 
                                ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105 z-10' 
                                : p.completed 
                                ? 'bg-green-50 text-green-700 border border-green-100' 
                                : 'bg-gray-50 text-gray-400 border border-gray-100'
                            }`}
                        >
                            <span className="text-[6px] font-black uppercase mb-0.5">Day</span>
                            <span className="text-sm font-black leading-none">{p.day}</span>
                            {p.completed && viewingDay !== p.day && <div className="absolute top-1 right-1 w-1 h-1 bg-green-500 rounded-full"></div>}
                        </button>
                    ))}
                </aside>

                {/* Lesson Viewer Content Container */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                    <div className="px-6 py-6 md:px-10 md:py-12 pb-32">
                        <div className="max-w-xl mx-auto">
                            <div className="text-[13px] sm:text-[14px] font-medium leading-relaxed text-gray-700 mb-8 prose max-w-none">
                                <FormattedText text={currentDayContent?.lessonText || "Syncing material..."} />
                            </div>

                            {/* Action Card */}
                            <div className="bg-primary/5 rounded-2xl p-5 md:p-8 border border-primary/10 mb-8 shadow-sm">
                                <h4 className="text-[7px] font-black text-primary uppercase tracking-[0.2em] mb-4">
                                    Strategic Action
                                </h4>
                                <p className="text-base font-black text-gray-900 leading-snug mb-5">
                                    <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                </p>
                                
                                {!isCompleted ? (
                                    <textarea 
                                        value={textSubmission} 
                                        onChange={e => setTextSubmission(e.target.value)} 
                                        placeholder="Record your execution notes here..." 
                                        className="w-full p-4 bg-white border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all text-sm font-medium resize-none h-28 shadow-inner"
                                    />
                                ) : (
                                    <div className="bg-white/80 p-4 rounded-xl border border-primary/5 text-center shadow-inner">
                                        <p className="font-bold text-gray-500 text-xs italic">"Record verified in registry."</p>
                                    </div>
                                )}
                            </div>

                            {/* Completion Footer */}
                            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Registry Status</span>
                                    <span className={`text-[9px] font-black uppercase ${isCompleted ? 'text-green-600' : 'text-orange-500'}`}>
                                        {isCompleted ? 'Cleared' : 'Action Required'}
                                    </span>
                                </div>
                                {!isCompleted ? (
                                    <Button 
                                        className="px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-primary/10" 
                                        disabled={!textSubmission.trim()}
                                    >
                                        Complete Day {viewingDay}
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-green-600 font-black uppercase tracking-[0.2em] text-[8px] bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                        Verified
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;