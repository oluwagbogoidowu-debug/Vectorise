import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { ParticipantSprint, Sprint } from '../../types';

const GrowthDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, (data) => {
            setEnrollments(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const stats = useMemo(() => {
        const completed = enrollments.filter(e => e.progress.every(p => p.completed)).length;
        const totalWins = enrollments.flatMap(e => e.progress).filter(p => p.completed).length;
        const activeMomentum = enrollments.length > 0 ? Math.round((totalWins / (enrollments.length * 10)) * 100) : 0;
        return { completed, activeMomentum, totalWins };
    }, [enrollments]);

    if (!user) return null;

    return (
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 animate-fade-in text-base lg:text-lg pb-32">
            
            <header className="mb-12">
                <button onClick={() => navigate('/dashboard')} className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2 hover:text-primary transition-colors group">
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                    Dashboard
                </button>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-dark tracking-tighter leading-none mb-4 italic">Visible Progress.</h1>
                <p className="text-gray-500 font-medium">Growth analysis and catalytic metrics derived from your cycle history.</p>
            </header>

            {isLoading ? (
                <div className="h-64 flex items-center justify-center bg-white rounded-[3rem] border border-gray-50 shadow-sm"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Col: Core Metrics */}
                    <div className="md:col-span-7 space-y-8">
                        <div className="bg-primary rounded-[3rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden group">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-2">Growth Index</p>
                                <h2 className="text-6xl md:text-8xl font-black leading-none mb-6 italic tracking-tighter">{stats.activeMomentum}%</h2>
                                <p className="text-lg font-medium opacity-80 leading-relaxed max-w-sm">The aggregate magnitude of completed actions across all current sprints.</p>
                            </div>
                            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-[100px]" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Total Wins</p>
                                <p className="text-4xl font-black text-dark mb-2">{stats.totalWins}</p>
                                <p className="text-xs font-bold text-gray-400 italic">Daily tasks completed</p>
                            </div>
                            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Mastery Ratio</p>
                                <p className="text-4xl font-black text-dark mb-2">{stats.completed}</p>
                                <p className="text-xs font-bold text-gray-400 italic">Full cycles finished</p>
                            </div>
                        </div>
                    </div>

                    {/* Right Col: Secondary Insight */}
                    <div className="md:col-span-5 space-y-8">
                        <section className="bg-dark rounded-[3rem] p-10 lg:p-12 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black mb-8 tracking-tight">Active Portfolio</h3>
                                <div className="space-y-8">
                                    {enrollments.filter(e => e.progress.some(p => !p.completed)).map(e => {
                                        const p = Math.round((e.progress.filter(p => p.completed).length / e.progress.length) * 100);
                                        return (
                                            <div key={e.id} className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-sm font-black uppercase tracking-widest text-primary">In Progress</p>
                                                    <p className="text-lg font-black">{p}%</p>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${p}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {enrollments.length === 0 && <p className="text-white/40 italic text-sm">No data recorded yet.</p>}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default GrowthDashboard;