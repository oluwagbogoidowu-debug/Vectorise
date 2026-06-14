
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { sprintService } from '../../services/sprintService';
import { ParticipantSprint, Participant, Sprint } from '../../types';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { motion } from 'motion/react';
import { 
    TrendingUp, 
    Zap, 
    ChevronLeft,
    Flame,
    Award
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
import { format, subDays, isSameDay, eachDayOfInterval, differenceInDays, parseISO } from 'date-fns';

const GrowthDashboard: React.FC = () => {
    const { user, mustVerifyEmail } = useAuth();
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

    const streakStats = useMemo(() => {
        const completedDatesSet = new Set<string>();

        enrollments.forEach((e) => {
            if (e.progress) {
                e.progress.forEach((p) => {
                    if (p.completed) {
                        let dateStr = '';
                        if (p.completedAt) {
                            try {
                                dateStr = format(parseISO(p.completedAt), 'yyyy-MM-dd');
                            } catch (err) {}
                        }
                        if (!dateStr && e.started_at) {
                            try {
                                const startedDate = parseISO(e.started_at);
                                const targetDate = new Date(startedDate.getTime() + (p.day - 1) * 24 * 60 * 60 * 1000);
                                dateStr = format(targetDate, 'yyyy-MM-dd');
                            } catch (err) {}
                        }
                        if (dateStr) {
                            completedDatesSet.add(dateStr);
                        }
                    }
                });
            }

            if (e.checkInHistory) {
                e.checkInHistory.forEach((ch) => {
                    if (ch.timestamp) {
                        try {
                            const dateStr = format(parseISO(ch.timestamp), 'yyyy-MM-dd');
                            completedDatesSet.add(dateStr);
                        } catch (err) {}
                    }
                });
            }
        });

        const sortedDates = Array.from(completedDatesSet).sort();
        let currentStreak = 0;
        let maxStreak = 0;

        if (sortedDates.length > 0) {
            let tempStreak = 1;
            maxStreak = 1;

            for (let i = 1; i < sortedDates.length; i++) {
                try {
                    const prev = parseISO(sortedDates[i - 1]);
                    const curr = parseISO(sortedDates[i]);
                    const diff = differenceInDays(curr, prev);

                    if (diff === 1) {
                        tempStreak++;
                        if (tempStreak > maxStreak) {
                            maxStreak = tempStreak;
                        }
                    } else if (diff > 1) {
                        tempStreak = 1;
                    }
                } catch (err) {}
            }

            const today = new Date();
            const todayStr = format(today, 'yyyy-MM-dd');
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const yesterdayStr = format(yesterday, 'yyyy-MM-dd');

            const hasToday = completedDatesSet.has(todayStr);
            const hasYesterday = completedDatesSet.has(yesterdayStr);

            if (hasToday || hasYesterday) {
                let streakCount = 1;
                let checkDate = hasToday ? today : yesterday;

                while (true) {
                    const prevDay = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
                    const prevDayStr = format(prevDay, 'yyyy-MM-dd');
                    if (completedDatesSet.has(prevDayStr)) {
                        streakCount++;
                        checkDate = prevDay;
                    } else {
                        break;
                    }
                }
                currentStreak = streakCount;
            } else {
                currentStreak = 0;
            }
        }

        const today = new Date();
        let activeInLast30 = 0;
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = format(d, 'yyyy-MM-dd');
            if (completedDatesSet.has(dateStr)) {
                activeInLast30++;
            }
        }

        const last30DaysConsistency = Math.round((activeInLast30 / 30) * 100);

        return {
            completedDatesSet,
            currentStreak,
            maxStreak,
            last30DaysConsistency,
            activeInLast30,
        };
    }, [enrollments]);

    const currentGrowthPhase = useMemo(() => {
        const streak = streakStats?.currentStreak || 0;
        const day = streak || 1; // Default to Day 1 if they have a 0-day streak

        if (day <= 2) {
            return {
                tag: "First Moves",
                title: "Beginning the Ascent",
                insight: "You’ve just started. Energy is fragile here."
            };
        } else if (day <= 5) {
            return {
                tag: "Finding Rhythm",
                title: "Building Momentum",
                insight: "Now you’re proving it’s not a fluke."
            };
        } else if (day <= 10) {
            return {
                tag: "Holding Pace",
                title: "Holding the Line",
                insight: "This is where most people fall off. Staying matters."
            };
        } else if (day <= 20) {
            return {
                tag: "In the Flow",
                title: "Deep in the Process",
                insight: "Now it’s less emotional, more identity."
            };
        } else {
            return {
                tag: "Part of You",
                title: "This Is What I Do",
                insight: "At this point, it’s no longer effort. It’s who you are."
            };
        }
    }, [streakStats?.currentStreak]);

    if (!user) return null;
    const p = user as Participant;



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
                        <ArchetypeAvatar 
                            archetypeId={p.archetype} 
                            profileImageUrl={p.profileImageUrl} 
                            size="md" 
                            isVerified={!mustVerifyEmail || p.emailVerifiedConfirmed || p.emailVerifiedOverride} 
                        />
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
                                        <span className="px-3 py-1 bg-[#0E7850]/10 text-[#0E7850] rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
                                            {currentGrowthPhase.tag}
                                        </span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {analytics.growthScore}% Growth
                                        </span>
                                    </div>
                                    <h2 className="text-5xl md:text-7xl font-black text-dark tracking-tighter leading-none mb-4 italic uppercase">
                                        {currentGrowthPhase.title}
                                    </h2>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                            <span className="text-sm font-black text-dark uppercase tracking-widest">{streakStats.currentStreak} Day Streak</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden lg:block text-right">
                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2">Current Standing</p>
                                    <div className="text-6xl font-black text-primary/10 tracking-tighter uppercase italic">{currentGrowthPhase.tag}</div>
                                </div>
                            </div>
                        </section>



                        {/* Streak & Consistency Ledger */}
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Streak & Consistency Ledger</h3>
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                    Swipe Sideways ➔
                                </span>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scrollbar-hidden">
                                
                                {/* Card 1: Current Active Streak */}
                                <div className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start relative overflow-hidden group hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Flame className="w-12 h-12 text-orange-600 fill-current" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                            Current Active Streak
                                        </p>
                                        <p className="text-3xl font-black text-gray-950 tracking-tight">
                                            {streakStats.currentStreak} <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Days</span>
                                        </p>
                                        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (streakStats.currentStreak / 30) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] text-[#0E7850] font-black uppercase tracking-wide mt-3.5">
                                            {streakStats.currentStreak >= 30 ? 'Elite habits established!' : `${30 - streakStats.currentStreak} days to 30-day milestone`}
                                        </p>
                                    </div>
                                </div>

                                {/* Card 2: All-Time Longest Streak */}
                                <div className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start relative overflow-hidden group hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Award className="w-12 h-12 text-yellow-600 fill-current" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                            All-Time Longest Streak
                                        </p>
                                        <p className="text-3xl font-black text-gray-950 tracking-tight">
                                            {streakStats.maxStreak} <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Days</span>
                                        </p>
                                        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (streakStats.maxStreak / 30) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide mt-3.5">
                                            Maximum unbroken chain of execution
                                        </p>
                                    </div>
                                </div>

                                {/* Card 3: Past 30 Days Consistency */}
                                <div className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start relative overflow-hidden group hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <TrendingUp className="w-12 h-12 text-[#0E7850]" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                            Past 30 Days Consistency
                                        </p>
                                        <p className="text-3xl font-black text-gray-950 tracking-tight">
                                            {streakStats.last30DaysConsistency}%
                                        </p>
                                        <div className="mt-4 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-emerald-400 to-[#0E7850] rounded-full transition-all duration-1000"
                                                style={{ width: `${streakStats.last30DaysConsistency}%` }}
                                            />
                                        </div>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wide mt-3.5">
                                            You completed tasks on {streakStats.activeInLast30} of last 30 days
                                        </p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* 35-Day Heatmap Consistency Grid */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 md:p-8 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-gray-50">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">35-Day Consistency Heatmap</h4>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider mt-0.5">Consecutive Task Completion Matrix</p>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] font-black text-gray-400 uppercase mt-2 sm:mt-0">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded bg-gray-50 border border-gray-200" /> Inactive
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded bg-[#0E7850]" /> Task Completed
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-3 text-center max-w-sm mx-auto">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((wd, i) => (
                                    <span key={i} className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                                        {wd}
                                    </span>
                                ))}

                                {Array.from({ length: 35 }).map((_, idx) => {
                                    const dateObj = new Date();
                                    dateObj.setDate(new Date().getDate() - (34 - idx));
                                    const dateStr = format(dateObj, 'yyyy-MM-dd');
                                    const isCompleted = streakStats.completedDatesSet.has(dateStr);
                                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                                    return (
                                        <div key={idx} className="flex flex-col items-center justify-center relative aspect-square group">
                                            <div 
                                                className={`w-full max-w-[36px] aspect-square rounded-xl flex items-center justify-center font-black text-[10px] tracking-tight transition-all relative ${
                                                    isCompleted 
                                                        ? 'bg-[#0E7850] text-white shadow-sm shadow-[#0E7850]/20 scale-100 hover:scale-110 active:scale-95' 
                                                        : isToday
                                                            ? 'bg-white border-2 border-[#0E7850]/50 text-gray-700 font-black'
                                                            : 'bg-gray-50 border border-gray-100 hover:border-gray-300 text-gray-400 font-medium'
                                                }`}
                                            >
                                                {isCompleted ? (
                                                    <span className="text-[8px] font-black">✓</span>
                                                ) : (
                                                    <span>{format(dateObj, 'd')}</span>
                                                )}

                                                {isToday && (
                                                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-orange-500 rounded-full border border-white animate-pulse" />
                                                )}
                                            </div>
                                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-bold tracking-wider uppercase px-2 py-1 rounded shadow opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none whitespace-nowrap z-20">
                                                {format(dateObj, 'MMM d')} • {isCompleted ? 'Done' : 'Pending'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

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
                            <div className="bg-dark rounded-[3rem] p-10 md:p-12 text-white flex flex-col justify-center relative overflow-hidden min-h-[280px]">
                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Strategic Insight</h3>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-black italic tracking-tight leading-tight text-[#FAFAFA]">
                                        "{currentGrowthPhase.insight}"
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-[#0E7850]/10 rounded-full blur-[100px]" />
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
                                    onClick={() => navigate('/explore')}
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
                    .scrollbar-hidden::-webkit-scrollbar { display: none; }
                    .scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
            </div>
        </div>
    );
};

export default GrowthDashboard;
