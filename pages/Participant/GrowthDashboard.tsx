
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { ParticipantSprint, Participant, Sprint } from '../../types';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { motion } from 'motion/react';
import { 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Zap, 
    Target, 
    Shield, 
    Layers, 
    ChevronLeft
} from 'lucide-react';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { format, subDays, isSameDay, eachDayOfInterval } from 'date-fns';

const GrowthDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [sprints, setSprints] = useState<Record<string, Sprint>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, async (data) => {
            setEnrollments(data);
            
            // Fetch missing sprints
            const missingIds = data.map(e => e.sprint_id).filter(id => !sprints[id]);
            if (missingIds.length > 0) {
                const newSprints = { ...sprints };
                await Promise.all(missingIds.map(async (id) => {
                    const s = await sprintService.getSprintById(id);
                    if (s) newSprints[id] = s;
                }));
                setSprints(newSprints);
            }
            
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    const analytics = useMemo(() => {
        if (!enrollments.length) return null;

        const allProgress = enrollments.flatMap(e => e.progress);
        const completedTasks = allProgress.filter(p => p.completed);
        
        // 1. Growth Score (Overall Completion %)
        const totalTasks = allProgress.length;
        const growthScore = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

        // 2. Streak Calculation
        const completionDates = completedTasks
            .map(p => p.completedAt ? new Date(p.completedAt) : null)
            .filter((d): d is Date => !!d)
            .sort((a, b) => b.getTime() - a.getTime());

        let currentStreak = 0;
        if (completionDates.length > 0) {
            let checkDate = new Date();
            checkDate.setHours(0, 0, 0, 0);
            
            // Check if last completion was today or yesterday
            const lastComp = new Date(completionDates[0]);
            lastComp.setHours(0, 0, 0, 0);
            
            const diffDays = Math.floor((checkDate.getTime() - lastComp.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays <= 1) {
                currentStreak = 1;
                let lastDate = lastComp;
                for (let i = 1; i < completionDates.length; i++) {
                    const d = new Date(completionDates[i]);
                    d.setHours(0, 0, 0, 0);
                    const diff = Math.floor((lastDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
                    if (diff === 1) {
                        currentStreak++;
                        lastDate = d;
                    } else if (diff > 1) {
                        break;
                    }
                }
            }
        }

        // 3. Level Determination
        let level = "Initiate";
        if (growthScore > 80) level = "Architect";
        else if (growthScore > 60) level = "Builder";
        else if (growthScore > 40) level = "Operator";
        else if (growthScore > 20) level = "Seeker";

        // 4. Core Metrics
        const last30Days = Array.from({ length: 30 }, (_, i) => subDays(new Date(), i));
        const activeDaysLast30 = last30Days.filter(day => 
            completionDates.some(cd => isSameDay(cd, day))
        ).length;
        const consistency = Math.round((activeDaysLast30 / 30) * 100);

        const startedSprints = enrollments.length;
        const fullyCompletedSprints = enrollments.filter(e => e.progress.every(p => p.completed)).length;
        const completionRate = startedSprints > 0 ? Math.round((fullyCompletedSprints / startedSprints) * 100) : 0;

        // 5. Weekly Activity Data for Graph
        const weekDays = eachDayOfInterval({
            start: subDays(new Date(), 6),
            end: new Date()
        });

        const chartData = weekDays.map(day => ({
            name: format(day, 'EEE'),
            count: completionDates.filter(cd => isSameDay(cd, day)).length
        }));

        // 6. Category Breakdown
        const categories = {
            "Daily Discipline": 0,
            "Long Game": 0,
            "Inner Work": 0,
            "Influence": 0
        };

        enrollments.forEach(e => {
            const compCount = e.progress.filter(p => p.completed).length;
            const sprint = sprints[e.sprint_id];
            const cat = sprint?.category?.toLowerCase() || "";
            if (cat.includes('habit') || cat.includes('prod') || cat.includes('discipline')) categories["Daily Discipline"] += compCount;
            else if (cat.includes('strat') || cat.includes('vision') || cat.includes('long')) categories["Long Game"] += compCount;
            else if (cat.includes('mind') || cat.includes('well') || cat.includes('inner')) categories["Inner Work"] += compCount;
            else if (cat.includes('lead') || cat.includes('comm') || cat.includes('influence')) categories["Influence"] += compCount;
            else categories["Daily Discipline"] += compCount; // Default
        });

        const maxCat = Math.max(...Object.values(categories), 1);
        const normalizedCategories = Object.entries(categories).map(([name, val]) => ({
            name,
            value: Math.round((val / (maxCat * 1.2)) * 100)
        }));

        return {
            level,
            growthScore,
            currentStreak,
            consistency,
            completionRate,
            chartData,
            categories: normalizedCategories
        };
    }, [enrollments, sprints]);

    if (!user) return null;
    const p = user as Participant;

    const MetricCard = ({ title, value, trend, insight, icon: Icon }: any) => (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-xl text-gray-400">
                    <Icon className="w-4 h-4" />
                </div>
                <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${
                    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'
                }`}>
                    {value}% {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                </div>
            </div>
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</h4>
            <p className="text-xs font-medium text-gray-500 leading-tight">{insight}</p>
        </div>
    );

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-[#FAFAFA]">
            <div className="max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12 animate-fade-in pb-32">
                
                <header className="mb-12 flex items-center justify-between">
                    <button onClick={() => navigate('/dashboard')} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-400 hover:text-primary transition-all active:scale-95">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Growth Profile</p>
                            <p className="text-sm font-black text-dark">{p.name}</p>
                        </div>
                        <ArchetypeAvatar archetypeId={p.archetype} profileImageUrl={p.profileImageUrl} size="md" />
                    </div>
                </header>

                {!isLoading && enrollments.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-6">
                            <Zap className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">No Growth Data Yet</h3>
                        <p className="text-sm text-gray-500 font-medium max-w-xs leading-relaxed">
                            Complete your first sprint day to unlock your growth analysis and performance insights.
                        </p>
                    </div>
                ) : !analytics || isLoading ? (
                    <div className="h-96 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        
                        {/* LAYER 1: IDENTITY */}
                        <section className="relative">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {analytics.level}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {analytics.growthScore}% Growth
                                        </span>
                                    </div>
                                    <h2 className="text-5xl md:text-7xl font-black text-dark tracking-tighter leading-none mb-4">
                                        {analytics.growthScore > 70 ? "Building steady momentum." : analytics.growthScore > 40 ? "Finding your rhythm." : "Beginning the ascent."}
                                    </h2>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-sm font-black text-dark uppercase tracking-widest">{analytics.currentStreak} Day Streak</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:block text-right">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2">Current Standing</p>
                                    <div className="text-6xl font-black text-primary/10 tracking-tighter">{analytics.level}</div>
                                </div>
                            </div>
                        </section>

                        {/* LAYER 2: DIRECTION */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard 
                                title="Consistency" 
                                value={analytics.consistency} 
                                trend={analytics.consistency > 50 ? 'up' : 'down'}
                                insight={analytics.consistency > 70 ? "Your daily rhythm is solidifying." : "Focus on showing up every day."}
                                icon={Target}
                            />
                            <MetricCard 
                                title="Completion" 
                                value={analytics.completionRate} 
                                trend={analytics.completionRate > 60 ? 'up' : 'down'}
                                insight={analytics.completionRate > 80 ? "You finish what you start." : "Aim to close more open loops."}
                                icon={Shield}
                            />
                            <MetricCard 
                                title="Discipline" 
                                value={Math.min(100, analytics.consistency + 10)} 
                                trend="up"
                                insight="Strong morning execution pattern."
                                icon={Zap}
                            />
                            <MetricCard 
                                title="Depth" 
                                value={45} 
                                trend="neutral"
                                insight="Medium engagement with reflections."
                                icon={Layers}
                            />
                        </section>

                        {/* LAYER 3: VISUAL MOMENTUM */}
                        <section className="bg-white rounded-[3rem] p-8 md:p-12 border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Visual Momentum</h3>
                                    <p className="text-2xl font-black text-dark tracking-tight">Weekly Activity Pattern</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">Active Week</p>
                                </div>
                            </div>
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.chartData}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0E7850" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#0E7850" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 900, fill: '#9CA3AF' }}
                                            dy={10}
                                        />
                                        <YAxis hide />
                                        <Tooltip 
                                            contentStyle={{ 
                                                borderRadius: '16px', 
                                                border: 'none', 
                                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                textTransform: 'uppercase'
                                            }} 
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="count" 
                                            stroke="#0E7850" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorCount)" 
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </section>

                        {/* LAYER 4: BREAKDOWN */}
                        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Growth Breakdown</h3>
                                    <p className="text-2xl font-black text-dark tracking-tight">Where you're growing.</p>
                                </div>
                                <div className="space-y-6">
                                    {analytics.categories.map((cat) => (
                                        <div key={cat.name} className="space-y-2">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{cat.name}</span>
                                                <span className="text-xs font-black text-dark">{cat.value}%</span>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${cat.value}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-primary rounded-full"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* LAYER 5: INSIGHT */}
                            <div className="bg-dark rounded-[3rem] p-10 md:p-12 text-white flex flex-col justify-center relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Strategic Insight</h3>
                                    <div className="space-y-4">
                                        <p className="text-xl md:text-2xl font-bold leading-tight">
                                            {analytics.growthScore > 70 
                                                ? "Your growth is active and disciplined. You're hitting a high-performance stride."
                                                : analytics.consistency > 60
                                                ? "You're consistent, but not yet finishing what you start. Focus on closing loops."
                                                : "Your growth is in the discovery phase. Build consistency before seeking depth."
                                            }
                                        </p>
                                        <p className="text-white/40 text-sm font-medium">
                                            {analytics.completionRate < 50 
                                                ? "Focus on completing tasks before starting new ones to increase your mastery ratio."
                                                : "Maintain your current streak to solidify these new neural pathways."
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px]" />
                            </div>
                        </section>

                        {/* LAYER 6: FORWARD TRIGGER */}
                        <section className="pt-12 border-t border-gray-100">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                        <TrendingUp className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-dark tracking-tight">Next Milestone</h4>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {analytics.currentStreak < 7 
                                                ? `${7 - analytics.currentStreak} more days to reach your first weekly streak.`
                                                : analytics.completionRate < 100
                                                ? "Complete 1 more sprint to improve your mastery ratio."
                                                : "Try a new category to expand your growth surface."
                                            }
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/discover')}
                                    className="px-8 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                >
                                    Continue the Journey
                                </button>
                            </div>
                        </section>

                    </div>
                )}
                
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                `}</style>
            </div>
        </div>
    );
};

export default GrowthDashboard;
