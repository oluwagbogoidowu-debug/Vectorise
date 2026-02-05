
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

    if (!enrollment || !sprint) return <div className="flex items-center justify-center h-screen bg-white text-gray-300 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Synchronizing Cycle...</div>;

    const progressPercent = (enrollment.progress.filter(p => p.completed).length / sprint.duration) * 100;
    const currentDayContent = sprint.dailyContent.find(dc => dc.day === viewingDay);
    const isCompleted = enrollment.progress.find(p => p.day === viewingDay)?.completed;

    return (
        <div className="h-screen w-full bg-[#FAFAFA] flex flex-col overflow-hidden animate-fade-in font-sans">
            {/* 1. HIGH-CONTRAST NAVIGATION HEADER */}
            <header className="px-6 py-5 bg-white border-b border-gray-100 flex-shrink-0 z-30">
                <div className="max-w-screen-lg mx-auto w-full">
                    <div className="flex justify-between items-start mb-3">
                        <button onClick={() => navigate(-1)} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2 hover:text-primary transition-colors active:scale-95 group">
                            <svg className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                            Terminate Session
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Day {viewingDay} active</p>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-none truncate w-full md:flex-1">{sprint.title}</h1>
                        <div className="w-full md:w-48 flex flex-col items-end gap-1">
                            <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(14,120,80,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{progressPercent.toFixed(0)}% Path Coverage</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. MAIN WORKSPACE AREA */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-screen-lg mx-auto w-full bg-white md:bg-transparent">
                
                {/* Vertical Sidebar Timeline */}
                <aside className="w-full md:w-32 flex-shrink-0 bg-white md:bg-transparent border-b md:border-b-0 md:border-r border-gray-100 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto no-scrollbar py-4 md:py-8 px-6 md:px-4 gap-2.5">
                    {enrollment.progress.map(p => (
                        <button 
                            key={p.day} 
                            onClick={() => setViewingDay(p.day)} 
                            className={`flex flex-shrink-0 flex-col items-center justify-center w-16 md:w-auto h-16 md:h-20 rounded-2xl transition-all duration-500 relative ${
                                viewingDay === p.day 
                                ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.05] z-10' 
                                : p.completed 
                                ? 'bg-white text-primary border border-primary/20 shadow-sm hover:bg-primary/5' 
                                : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-white hover:border-gray-200'
                            }`}
                        >
                            <span className="text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-60">Day</span>
                            <span className="text-xl font-black leading-none">{p.day}</span>
                            {p.completed && viewingDay !== p.day && (
                                <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-white"></div>
                            )}
                        </button>
                    ))}
                    <div className="hidden md:block h-32 flex-shrink-0"></div>
                </aside>

                {/* Content Viewer / Execution Deck */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-white shadow-2xl md:my-6 md:mr-6 md:rounded-[3rem] relative border border-gray-100/50">
                    <div className="px-8 py-10 md:px-16 md:py-20 pb-40">
                        <div className="max-w-2xl mx-auto">
                            {/* Lesson Typography Optimization */}
                            <div className="text-[15px] md:text-[16px] font-medium leading-[1.8] text-gray-600 mb-16 prose max-w-none selection:bg-primary/10">
                                <FormattedText text={currentDayContent?.lessonText || "Synchronizing narrative material..."} className="first-letter:text-5xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left first-letter:mt-1" />
                            </div>

                            {/* Strategic Action Deck */}
                            <div className="bg-[#FAFAFA] rounded-[2.5rem] p-8 md:p-12 border border-gray-100 mb-10 shadow-sm relative overflow-hidden group">
                                <div className="relative z-10">
                                    <div className="inline-block px-3 py-1 bg-primary text-white rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-6 shadow-lg shadow-primary/20">
                                        Primary Directive
                                    </div>
                                    <p className="text-xl md:text-2xl font-black text-gray-900 leading-[1.2] mb-8 tracking-tight italic">
                                        <FormattedText text={currentDayContent?.taskPrompt || ""} />
                                    </p>
                                    
                                    {!isCompleted ? (
                                        <div className="relative">
                                            <textarea 
                                                value={textSubmission} 
                                                onChange={e => setTextSubmission(e.target.value)} 
                                                placeholder="Document your execution path..." 
                                                className="w-full p-6 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all text-base font-bold text-gray-800 resize-none h-40 shadow-inner placeholder:text-gray-300"
                                            />
                                            <div className="absolute bottom-4 right-4 pointer-events-none">
                                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Execution Notes</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/60 p-8 rounded-2xl border border-primary/5 text-center shadow-inner flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 bg-green-50 text-primary rounded-full flex items-center justify-center text-xl shadow-sm">✓</div>
                                            <p className="font-black text-gray-500 text-xs uppercase tracking-[0.2em]">"Record verified in growth registry."</p>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>
                            </div>

                            {/* Verification Footer */}
                            <div className="pt-8 border-t border-gray-50 flex flex-col sm:flex-row justify-between items-center gap-6">
                                <div className="flex flex-col items-center sm:items-start">
                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-1">Status Report</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-green-600' : 'text-orange-500'}`}>
                                            {isCompleted ? 'Verified Mastered' : 'Action Outstanding'}
                                        </span>
                                    </div>
                                </div>
                                {!isCompleted ? (
                                    <button 
                                        className="w-full sm:w-auto px-12 py-5 bg-primary text-white rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.03] transition-all active:scale-95 disabled:opacity-20 disabled:grayscale" 
                                        disabled={!textSubmission.trim()}
                                    >
                                        Complete Day {viewingDay}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-3 text-green-600 font-black uppercase tracking-[0.3em] text-[10px] bg-green-50 px-6 py-3 rounded-full border border-green-100 shadow-sm">
                                        Session Cleared
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default SprintView;
