import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, sanitizeData } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint } from '../../types';
import { ArrowLeft, Calendar, Mail, User as UserIcon, Zap, Target, Clock, AlertCircle, ChevronRight, Award, Flame, TrendingUp } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { UserStreakVisualizer } from '../../components/UserStreakVisualizer';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';

export default function AdminUserDetail() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<Participant | null>(null);
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) return;
            setIsLoading(true);
            try {
                const [userData, enrollmentsData, sprintsData] = await Promise.all([
                    userService.getUserDocument(userId),
                    sprintService.getUserEnrollments(userId),
                    sprintService.getAdminSprints()
                ]);
                setUser(userData as Participant);
                setEnrollments(enrollmentsData);
                setSprints(sprintsData);
            } catch (error) {
                console.error("Error fetching user detail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-light">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-light p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-black text-gray-900 italic">User not found.</h2>
                <button 
                    onClick={() => navigate('/admin/dashboard')}
                    className="mt-6 px-6 py-3 bg-primary text-white font-black rounded-2xl shadow-lg hover:scale-105 transition-transform"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const activeEnrollment = enrollments.find(e => e.status === 'active');
    const sortedEnrollments = [...enrollments].sort((a, b) => 
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    
    const lastCompletedEnrollment = enrollments
        .filter(e => e.status === 'completed')
        .sort((a, b) => {
            const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
            const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
            return dateB - dateA;
        })[0];

    // Inactivity logic
    let inactivityWarning = null;
    
    // Check if they are inactive based on: "In the whole system a user is inactive once it's a day after the last submission of the last task."
    const completedTimestamps = enrollments.flatMap(e => 
        (e.progress || [])
            .filter(p => p.completed && p.completedAt)
            .map(p => p.completedAt ? new Date(p.completedAt).getTime() : 0)
    ).filter(t => t > 0 && !isNaN(t));

    let lastSubmissionTime: number | null = null;
    if (completedTimestamps.length > 0) {
        lastSubmissionTime = Math.max(...completedTimestamps);
    }

    let isInactiveSystem = false;
    const oneDay = 24 * 60 * 60 * 1000;

    if (lastSubmissionTime !== null) {
        if (Date.now() - lastSubmissionTime >= oneDay) {
            isInactiveSystem = true;
            const daysInactive = Math.floor((Date.now() - lastSubmissionTime) / oneDay);
            inactivityWarning = `Inactive (${daysInactive} day${daysInactive > 1 ? 's' : ''} since last task submission)`;
        }
    } else {
        // No submissions at all. Let's check start or join time.
        const startDates = enrollments.map(e => new Date(e.started_at).getTime()).filter(t => !isNaN(t));
        if (startDates.length > 0) {
            const earliestStart = Math.min(...startDates);
            if (Date.now() - earliestStart >= oneDay) {
                isInactiveSystem = true;
                inactivityWarning = `Inactive (No task submitted within a day of starting first sprint)`;
            }
        } else if (user.createdAt) {
            const joinedAt = new Date(user.createdAt).getTime();
            if (!isNaN(joinedAt) && (Date.now() - joinedAt >= oneDay)) {
                isInactiveSystem = true;
                inactivityWarning = `Inactive (No task submitted within a day of joining)`;
            }
        }
    }

    // Checking "No progress when they didn't proceed with a new sprint the next day after they finished the first"
    const completedSprints = enrollments.filter(e => e.status === 'completed' || e.progress?.every(p => p.completed));
    let isNoProgress = false;
    if (completedSprints.length > 0) {
        const sortedCompleted = [...completedSprints].sort((a, b) => {
            const dateA = a.completed_at ? new Date(a.completed_at).getTime() : new Date(a.started_at).getTime();
            const dateB = b.completed_at ? new Date(b.completed_at).getTime() : new Date(b.started_at).getTime();
            return dateA - dateB;
        });
        const firstFinished = sortedCompleted[0];
        const finishTime = firstFinished.completed_at ? new Date(firstFinished.completed_at).getTime() : null;

        if (finishTime !== null && !isNaN(finishTime)) {
            const otherSprints = enrollments.filter(e => e.id !== firstFinished.id);
            const hasProceeded = otherSprints.length > 0;
            const timeSinceFinish = Date.now() - finishTime;
            if (!hasProceeded && timeSinceFinish >= oneDay) {
                isNoProgress = true;
                inactivityWarning = `No Progress: Pending New Sprint (Finished first sprint but didn't start another the next day)`;
            }
        }
    }

    const completionRate = useMemo(() => {
        const startedSprints = enrollments.length;
        const fullyCompletedSprints = enrollments.filter(e => e.progress && e.progress.every(p => p.completed)).length;
        return startedSprints > 0 ? Math.round((fullyCompletedSprints / startedSprints) * 100) : 0;
    }, [enrollments]);

    const disciplineValue = useMemo(() => {
        return Math.min(100, streakStats.last30DaysConsistency + 17);
    }, [streakStats.last30DaysConsistency]);

    const getSprintTitle = (sprintId: string) => {
        return sprints.find(s => s.id === sprintId)?.title || 'Unknown Sprint';
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <style>{`
                .scrollbar-hidden::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hidden {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* Header */}
            <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-2.5 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-black text-gray-900 italic">User Profile.</h1>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrative View</p>
                            </div>
                        </div>
                        {inactivityWarning && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-pulse">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{inactivityWarning}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                
                {/* Profile Card Section (A bit smaller like participant design) */}
                <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Participant Identity</h3>
                    <div className="inline-block bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm min-w-[280px] hover:border-[#0E7850]/20 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <ArchetypeAvatar 
                                archetypeId={user.archetype} 
                                profileImageUrl={user.profileImageUrl} 
                                size="lg" 
                                isVerified={user.emailVerifiedConfirmed || user.emailVerifiedOverride}
                            />
                            <div className="min-w-0">
                                <h2 className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{user.name}</h2>
                                <p className="text-[10px] font-bold text-gray-400 truncate tracking-wide leading-none">{user.email}</p>
                                <p className="text-[9px] font-black text-[#0E7850] uppercase mt-2 bg-emerald-50/50 border border-emerald-100/50 px-2 py-0.5 rounded-md inline-block tracking-wider leading-none">
                                    @{user.occupation || user.persona || 'Student/Graduate'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info & Metrics Swipeable Deck */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Engagement & Onboarding Deck</h3>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            Swipe Sideways ➔
                        </span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scrollbar-hidden">
                        
                        {/* Timeline Metrics Card (The 2nd Card) */}
                        <div className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start hover:border-[#0E7850]/10 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50 flex-shrink-0">
                                <span className="text-sm">⏱️</span>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</h4>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Current Stage</p>
                                        <p className="text-xs font-black text-[#0E7850] bg-emerald-50/50 border border-emerald-100/30 px-2.5 py-0.5 rounded-full inline-block tracking-tight uppercase">
                                            {user.currentStage || 'Foundation'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Joined Vectorise</p>
                                    <p className="text-xs font-bold text-gray-900">
                                        {user.createdAt ? format(parseISO(user.createdAt), 'MMMM d, yyyy') : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Last Login</p>
                                    <p className="text-xs font-bold text-gray-900">
                                        {user.lastLoginAt 
                                            ? format(parseISO(user.lastLoginAt), 'MMM d, h:mm a')
                                            : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Last Activity</p>
                                    <p className="text-xs font-bold text-gray-900">
                                        {enrollments[0]?.last_activity_at 
                                            ? format(parseISO(enrollments[0].last_activity_at), 'MMM d, h:mm a')
                                            : 'No recent activity'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Onboarding Answers Card */}
                        <div className="flex-shrink-0 w-[290px] sm:w-[320px] h-[280px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start flex flex-col hover:border-[#0E7850]/10 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50 flex-shrink-0">
                                <span className="text-sm">📋</span>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest justify-between w-full flex items-center">
                                    <span>Onboarding Answers</span>
                                </h4>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 scrollbar-hidden">
                                {user.onboardingAnswers && Object.keys(user.onboardingAnswers).length > 0 ? (
                                    Object.entries(user.onboardingAnswers).map(([key, value], idx) => (
                                        <div key={idx} className="border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{key.replace(/_/g, ' ')}</p>
                                            <p className="text-[11px] font-bold text-gray-700 leading-relaxed">
                                                {typeof value === 'object' && value !== null ? (
                                                    ('seconds' in value && 'nanoseconds' in value)
                                                        ? new Date((value as any).seconds * 1000).toLocaleString()
                                                        : JSON.stringify(sanitizeData(value))
                                                ) : String(value)}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-gray-400 italic py-4">No answers submitted.</p>
                                )}
                            </div>
                        </div>

                        {/* Claims & Badges Card */}
                        <div className="flex-shrink-0 w-[290px] sm:w-[320px] h-[280px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start flex flex-col hover:border-[#0E7850]/10 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50 flex-shrink-0">
                                <span className="text-sm">🎖️</span>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Claims & Badges</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-hidden">
                                {user.claimedBadges && user.claimedBadges.length > 0 ? (
                                    user.claimedBadges.map((badge: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100/50 text-xs">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate max-w-[150px]">{badge.milestoneId.replace(/-/g, ' ')}</p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                                                    {badge.claimedAt ? format(parseISO(badge.claimedAt), 'MMM d, yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-[10px] font-black text-[#0E7850] bg-emerald-50 px-2 py-1 rounded-lg">+{badge.claimedCredit} Cr</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-bold text-gray-400 italic text-center py-8">No badges claimed yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Notifications Card */}
                        <div className="flex-shrink-0 w-[290px] sm:w-[320px] bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm snap-start hover:border-[#0E7850]/10 transition-all duration-300">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-50 flex-shrink-0">
                                <span className="text-sm">🔔</span>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notification Preferences</h4>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System Push</p>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${user.pushSubscription ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                        {user.pushSubscription ? 'Subscribed' : 'Not Subscribed'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">User Preference</p>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${!user.notificationsDisabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                        {!user.notificationsDisabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                                {user.pushPermissionLastRequestAt && (
                                    <div className="pt-2 border-t border-gray-50">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Last Request Time</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                                            {format(parseISO(user.pushPermissionLastRequestAt), 'MMM d, h:mm a')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Visual Cognitive & Execution Metrics */}
                <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cognitive & Execution Deck</h3>
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 animate-pulse">
                            Swipe Sideways ➔
                        </span>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scrollbar-hidden">
                        {/* Card 1: Consistency */}
                        <div className="flex-shrink-0 w-[210px] bg-white border border-gray-100 rounded-[2.25rem] p-5 shadow-sm snap-start hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-[#0E7850]/5 rounded-xl text-[#0E7850]">
                                    <Target className="w-4 h-4" />
                                </div>
                                <div className="text-[11px] font-black text-gray-900 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg">
                                    {streakStats.last30DaysConsistency}%
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1">Consistency</h4>
                            <p className="text-[11px] font-medium text-gray-500 leading-tight">Focus on showing up every day.</p>
                        </div>

                        {/* Card 2: Completion */}
                        <div className="flex-shrink-0 w-[210px] bg-white border border-gray-100 rounded-[2.25rem] p-5 shadow-sm snap-start hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-[#0E7850]/5 rounded-xl text-[#0E7850]">
                                    <Award className="w-4 h-4" />
                                </div>
                                <div className="text-[11px] font-black text-gray-900 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg">
                                    {completionRate}%
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1">Completion</h4>
                            <p className="text-[11px] font-medium text-gray-500 leading-tight">Aim to close more open loops.</p>
                        </div>

                        {/* Card 3: Discipline */}
                        <div className="flex-shrink-0 w-[210px] bg-white border border-gray-100 rounded-[2.25rem] p-5 shadow-sm snap-start hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-[#0E7850]/5 rounded-xl text-[#0E7850]">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <div className="text-[11px] font-black text-gray-900 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg">
                                    {disciplineValue}%
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1">Discipline</h4>
                            <p className="text-[11px] font-medium text-gray-500 leading-tight">Strong morning execution pattern.</p>
                        </div>

                        {/* Card 4: Depth */}
                        <div className="flex-shrink-0 w-[210px] bg-white border border-gray-100 rounded-[2.25rem] p-5 shadow-sm snap-start hover:border-[#0E7850]/15 hover:shadow-md transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-[#0E7850]/5 rounded-xl text-[#0E7850]">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="text-[11px] font-black text-gray-900 bg-gray-50 border border-gray-100 px-2.5 py-0.5 rounded-lg">
                                    45%
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1">Depth</h4>
                            <p className="text-[11px] font-medium text-gray-500 leading-tight">Medium engagement with reflections.</p>
                        </div>
                    </div>
                </div>

                {/* Streak & Consistency Sideways Swipeable Deck */}
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
                                    User completed tasks on {streakStats.activeInLast30} of last 30 days
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

                {/* Sprint History Detail Section */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 p-6 md:p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Sprint Enrollments</h3>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider mt-0.5">Chronological list of all active or completed sprints</p>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                            {enrollments.length} Total
                        </span>
                    </div>

                    <div className="space-y-6">
                        {sortedEnrollments.length > 0 ? (
                            sortedEnrollments.map((enrollment) => {
                                const actualCompletionRate = (enrollment.progress.filter(p => p.completed).length / enrollment.progress.length) * 100;
                                const isCurrent = enrollment.status === 'active';
                                const completionRate = (isNoProgress && isCurrent) ? 0 : actualCompletionRate;
                                
                                return (
                                    <div 
                                        key={enrollment.id}
                                        className={`p-6 rounded-3xl border transition-all ${
                                            isCurrent 
                                                ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/10' 
                                                : 'bg-gray-50/50 border-gray-100'
                                        }`}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${
                                                    isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-100 text-gray-400'
                                                }`}>
                                                    <Zap className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-black text-gray-900">{getSprintTitle(enrollment.sprint_id)}</h4>
                                                        {isCurrent && (
                                                            <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">Active</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                        Started {format(parseISO(enrollment.started_at), 'MMM d, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(completionRate)}%</p>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Completion</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white/50 p-3 rounded-2xl border border-gray-100/50">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                                <p className="text-xs font-black text-gray-700 uppercase tracking-widest">{enrollment.status}</p>
                                            </div>
                                            <div className="bg-white/50 p-3 rounded-2xl border border-gray-100/50">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Activity</p>
                                                <p className="text-xs font-black text-gray-700">
                                                    {enrollment.last_activity_at 
                                                        ? format(parseISO(enrollment.last_activity_at), 'MMM d')
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                    {(isNoProgress && isCurrent) ? 'Daily Progress (Suspended: No Sprint)' : 'Daily Progress'}
                                                </p>
                                                <div className="flex gap-1">
                                                    {enrollment.progress.map((p, i) => (
                                                        <div 
                                                            key={i}
                                                            className={`flex-1 h-2 rounded-sm ${(p.completed && !(isNoProgress && isCurrent)) ? 'bg-primary' : 'bg-gray-200'}`}
                                                            title={`Day ${p.day}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="py-12 text-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                                <p className="text-sm font-black text-gray-400 uppercase tracking-widest italic">No sprint history found.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
