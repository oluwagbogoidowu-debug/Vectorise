import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { ParticipantSprint, Sprint, Participant } from '../../types';

const GrowthDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [allSprints, setAllSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPortfolioExpanded, setIsPortfolioExpanded] = useState(false);

    useEffect(() => {
        if (!user) return;
        
        setIsLoading(true);
        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, async (data) => {
            setEnrollments(data);
            
            // Enrich with sprint data
            const sprintIds = Array.from(new Set(data.map(e => e.sprintId)));
            const fetchedSprints = await Promise.all(sprintIds.map(id => sprintService.getSprintById(id)));
            setAllSprints(fetchedSprints.filter((s): s is Sprint => s !== null));
            
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // --- VECTORISE GROWTH ENGINE (DETERMINISTIC) ---
    const metrics = useMemo(() => {
        if (enrollments.length === 0 || allSprints.length === 0) return null;

        const allSprintsEnriched = enrollments.map(e => {
            const sprint = allSprints.find(s => s.id === e.sprintId);
            const completedCount = e.progress.filter(p => p.completed).length;
            const percent = Math.round((completedCount / e.progress.length) * 100);
            return { ...e, sprint, percent, isFinished: percent === 100 };
        });

        const activeEnrollments = allSprintsEnriched.filter(e => !e.isFinished);
        const finishedEnrollments = allSprintsEnriched.filter(e => e.isFinished);
        
        const allTasks = enrollments.flatMap(e => e.progress);
        const completedTasks = allTasks.filter(p => p.completed);
        const reflections = completedTasks.filter(p => !!p.reflection);

        // 1. Average Active Progress
        const activeSum = activeEnrollments.reduce((acc, e) => acc + e.percent, 0);
        const activeMomentum = activeEnrollments.length > 0 
            ? Math.round(activeSum / activeEnrollments.length) 
            : 0;

        // 2. Mastery Yield
        const totalCompletionRate = Math.round((completedTasks.length / allTasks.length) * 100);

        // 3. Days Active & Velocity
        const startDates = enrollments.map(e => new Date(e.startDate).getTime());
        const firstDay = Math.min(...startDates);
        const daysActive = Math.max(1, Math.ceil((Date.now() - firstDay) / (1000 * 60 * 60 * 24)));
        const velocity = completedTasks.length / daysActive; 

        // 4. Forecast for Primary
        const primaryActive = [...activeEnrollments].sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
        let forecast = null;
        if (primaryActive && primaryActive.sprint) {
            const remaining = primaryActive.progress.filter(p => !p.completed).length;
            const estDaysToFinish = velocity > 0.1 ? Math.ceil(remaining / velocity) : remaining;
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + estDaysToFinish);

            forecast = {
                title: primaryActive.sprint.title,
                daysRemaining: estDaysToFinish,
                finishDate: expectedDate.toLocaleDateString([], { month: 'short', day: 'numeric' }),
                status: velocity >= 0.9 ? 'Accelerated' : velocity >= 0.5 ? 'On Track' : 'Needs Input'
            };
        }

        // 5. Growth Dimensions
        const dimensions = {
            'Clarity': Math.min(100, enrollments.filter(e => allSprints.find(s => s.id === e.sprintId)?.category === 'Productivity').length * 25),
            'Consistency': Math.min(100, Math.round(velocity * 100)),
            'Focus': Math.min(100, completedTasks.length * 5),
            'Self-trust': Math.min(100, reflections.length * 10)
        };

        // 6. Latest Specific Reflection
        const sortedReflections = [...reflections].sort((a,b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
        const latestReflection = sortedReflections.length > 0 ? sortedReflections[0] : null;

        return {
            activeMomentum,
            totalCompletionRate,
            daysActive,
            sprintsStarted: enrollments.length,
            sprintsCompleted: finishedEnrollments.length,
            reflectionsCount: reflections.length,
            forecast,
            dimensions,
            latestReflection,
            allSprintsEnriched,
            velocity: velocity.toFixed(1)
        };
    }, [enrollments, allSprints]);

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-32 animate-fade-in bg-[#FAFAFA]">
            {/* Header */}
            <div className="mb-12">
                <button 
                    onClick={() => navigate('/dashboard')} 
                    className="group flex items-center text-gray-400 hover:text-primary transition-colors mb-6 text-xs font-black uppercase tracking-widest"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                    Dashboard
                </button>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2 italic">The Mirror.</h1>
                <p className="text-gray-500 font-medium text-lg">Growth analysis and visible progress metrics.</p>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border border-gray-100">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Polishing insights...</p>
                </div>
            ) : !metrics ? (
                <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl opacity-30 grayscale">✨</div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Awaiting the First Step</h3>
                    <p className="text-gray-500 font-medium mb-10">Start your first sprint to generate growth data.</p>
                    <Link to="/discover" className="px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20">
                        Find a Sprint
                    </Link>
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* 1. HERO METRICS */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-primary to-[#0B6040] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">Active Progress</p>
                                <h2 className="text-6xl font-black mb-4 leading-none">{metrics.activeMomentum}%</h2>
                                <p className="text-sm font-medium text-white/80 max-w-[240px] leading-relaxed italic">
                                    The average percentage of your overall active sprints.
                                </p>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Mastery</p>
                                <div className="flex items-baseline gap-2 mb-4">
                                    <h2 className="text-5xl font-black text-gray-900 leading-none">{metrics.totalCompletionRate}%</h2>
                                    <span className="text-xs font-bold text-gray-400">Overall Rate</span>
                                </div>
                                <p className="text-xs text-gray-500 font-medium leading-relaxed italic">Your completion yield across all current and previous programs.</p>
                            </div>
                            <div className="mt-6 w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-primary h-full rounded-full transition-all duration-1000" style={{ width: `${metrics.totalCompletionRate}%` }}></div>
                            </div>
                        </div>
                    </section>

                    {/* 2. RECENT REFLECTION CARD */}
                    {metrics.latestReflection && (
                        <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden group">
                             <div className="absolute top-0 right-0 bg-yellow-400/10 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest text-yellow-700">
                                Recent Insight
                             </div>
                             <div className="flex flex-col md:flex-row gap-8 items-start">
                                <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner flex-shrink-0">💡</div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Linguistic Breakthrough</h3>
                                    <p className="text-lg text-gray-700 font-medium leading-relaxed italic mb-6">
                                        "{metrics.latestReflection.reflection}"
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div className="h-px w-8 bg-gray-200"></div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            Saved {new Date(metrics.latestReflection.completedAt!).toLocaleDateString([], { month: 'long', day: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                             </div>
                        </section>
                    )}

                    {/* 3. MASTERY PORTFOLIO */}
                    <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-widest">Mastery Portfolio</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{metrics.allSprintsEnriched.length} Programs</p>
                        </div>
                        <div className="space-y-6">
                            {(isPortfolioExpanded ? metrics.allSprintsEnriched : metrics.allSprintsEnriched.slice(0, 3)).map((e, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-center gap-4 group animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl shadow-sm ${e.isFinished ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {e.isFinished ? '🏆' : '🔥'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-2">
                                            <p className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">{e.sprint?.title || "Unknown Sprint"}</p>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${e.isFinished ? 'text-green-600' : 'text-blue-500'}`}>
                                                {e.percent}% {e.isFinished ? 'Mastered' : 'Progress'}
                                            </p>
                                        </div>
                                        <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${e.isFinished ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${e.percent}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {metrics.allSprintsEnriched.length > 3 && (
                            <button 
                                onClick={() => setIsPortfolioExpanded(!isPortfolioExpanded)}
                                className="mt-10 w-full py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-gray-100 active:scale-95"
                            >
                                {isPortfolioExpanded ? 'Show Less' : `See More (${metrics.allSprintsEnriched.length - 3} Hidden)`}
                            </button>
                        )}
                    </section>

                    {/* 4. SPRINT FORECAST */}
                    {metrics.forecast && (
                        <section className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className={`text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${metrics.forecast.status === 'Needs Input' ? 'bg-orange-500' : 'bg-primary'}`}>
                                            {metrics.forecast.status}
                                        </span>
                                        <h3 className="text-sm font-black text-white/40 uppercase tracking-widest">Growth Forecast</h3>
                                    </div>
                                    <h2 className="text-3xl font-black mb-4 leading-tight">{metrics.forecast.title}</h2>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Expected Completion</p>
                                            <p className="text-2xl font-black">{metrics.forecast.finishDate}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">Daily Pace</p>
                                            <p className="text-lg font-black text-primary">{metrics.velocity} <span className="text-[10px] opacity-40">wins/day</span></p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-px h-px md:h-24 bg-white/10"></div>
                                <div className="text-center md:text-right">
                                    <div className="text-5xl font-black mb-2 leading-none text-primary">~{metrics.forecast.daysRemaining}</div>
                                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Days to Mastery</p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
                        </section>
                    )}
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default GrowthDashboard;
