import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ParticipantSprint, Sprint, Participant } from '../../types';
import ProgressBar from '../../components/ProgressBar';
import { sprintService } from '../../services/sprintService';
import { userService, sanitizeData } from '../../services/userService';
import { getSprintCoverImage } from '../../utils/sprintUtils';
import { Flame, ArrowRight, Sparkles, Zap, Trash2, ArrowUpRight } from 'lucide-react';

export const MySprints: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState<ParticipantSprint[]>([]);
    const [allSprints, setAllSprints] = useState<Sprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        const unsubEnrollments = sprintService.subscribeToUserEnrollments(user.id, (data) => {
            setEnrollments(data || []);
        }, (error) => {
            console.error("Enrollment subscription error:", error);
            setIsLoading(false);
        });

        const unsubSprints = sprintService.subscribeToAllSprints((data) => {
            setAllSprints(data || []);
            setIsLoading(false);
        }, (error) => {
            console.error("Sprints subscription error:", error);
            setIsLoading(false);
        });

        return () => {
            unsubEnrollments();
            unsubSprints();
        };
    }, [user?.id]);

    const isChallenge = (s: Sprint) => 
        s.contentType === 'challenge' || Boolean((s as any).challengeData) || Boolean((s as any).challengeType);

    // Identify the primary active sprint (non-challenge, active, not completed)
    const activeEnrollment = useMemo(() => {
        return enrollments.find(e => {
            if (e.status !== 'active') return false;
            if (e.completed_at) return false;
            const sprint = allSprints.find(s => s.id === e.sprint_id);
            if (sprint && isChallenge(sprint)) return false;
            const allDaysCompleted = Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every((p: any) => p.completed);
            return !allDaysCompleted;
        }) || null;
    }, [enrollments, allSprints]);

    const activeSprint = useMemo(() => {
        if (!activeEnrollment) return null;
        return allSprints.find(s => s.id === activeEnrollment.sprint_id) || null;
    }, [activeEnrollment, allSprints]);

    const totalDays = activeSprint?.duration || 5;

    const completedDaysCount = useMemo(() => {
        if (!activeEnrollment) return 0;
        const progress = (activeEnrollment as any).progress || [];
        return progress.filter((p: any) => p.completed).length;
    }, [activeEnrollment]);

    const currentDay = useMemo(() => {
        if (!activeEnrollment) return 1;
        return Math.min(completedDaysCount + 1, totalDays);
    }, [activeEnrollment, completedDaysCount, totalDays]);

    const handleContinueActiveSprint = () => {
        if (!activeEnrollment) return;
        navigate(`/participant/sprint/${activeEnrollment.id}`);
    };

    // Calculate progress % for any sprint run
    const calculateProgress = (progressArray: ParticipantSprint['progress'] = []) => {
        const completed = progressArray.filter(p => p.completed).length;
        const total = progressArray.length;
        return total > 0 ? (completed / total) * 100 : 0;
    };

    // 1. Active Challenges
    const activeChallenges = useMemo(() => {
        return enrollments
            .filter(e => {
                if (e.status !== 'active' || e.completed_at) return false;
                const sprint = allSprints.find(s => s.id === e.sprint_id);
                return sprint && isChallenge(sprint);
            })
            .map(e => ({
                id: e.id,
                enrollment: e,
                sprint: allSprints.find(s => s.id === e.sprint_id)!,
                type: 'challenge' as const,
            }));
    }, [enrollments, allSprints]);

    // 2. Paused Sprints (explicitly paused or other in-progress sprints)
    const pausedSprints = useMemo(() => {
        return enrollments
            .filter(e => {
                if (e.completed_at) return false;
                const sprint = allSprints.find(s => s.id === e.sprint_id);
                if (!sprint || isChallenge(sprint)) return false;
                if (e.status === 'paused') return true;
                if (e.status === 'active' && activeEnrollment && e.id !== activeEnrollment.id) return true;
                return false;
            })
            .map(e => ({
                id: e.id,
                enrollment: e,
                sprint: allSprints.find(s => s.id === e.sprint_id)!,
                type: 'paused' as const,
            }));
    }, [enrollments, allSprints, activeEnrollment]);

    // 3. Queue Sprints (queued enrollments + saved wishlist)
    const queuedSprints = useMemo(() => {
        const list: {
            id: string;
            enrollment?: ParticipantSprint;
            sprint: Sprint;
            type: 'queue';
        }[] = [];

        enrollments.forEach(e => {
            if (e.status === 'queued') {
                const sprint = allSprints.find(s => s.id === e.sprint_id);
                if (sprint) {
                    list.push({ id: e.id, enrollment: e, sprint, type: 'queue' });
                }
            }
        });

        const enrolledSprintIds = new Set(enrollments.map(e => e.sprint_id));
        const p = user as Participant;
        (p?.savedSprintIds || []).forEach(id => {
            if (!enrolledSprintIds.has(id)) {
                const sprint = allSprints.find(s => s.id === id);
                if (sprint && !isChallenge(sprint)) {
                    list.push({ id: `saved_${id}`, sprint, type: 'queue' });
                }
            }
        });

        return list;
    }, [enrollments, allSprints, user]);

    // Order: Active challenge comes first, then paused sprint, then queue sprint
    const horizontalJourneyItems = useMemo(() => {
        return [
            ...activeChallenges,
            ...pausedSprints,
            ...queuedSprints,
        ];
    }, [activeChallenges, pausedSprints, queuedSprints]);

    const handleRemoveFromQueue = async (sprintId: string, enrollmentId?: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!user) return;
        try {
            const p = user as Participant;
            const newSaved = (p.savedSprintIds || []).filter(id => id !== sprintId);
            await userService.updateUserDocument(user.id, { savedSprintIds: newSaved });
            await updateProfile(sanitizeData({ savedSprintIds: newSaved }));
            
            if (enrollmentId && !enrollmentId.startsWith('saved_')) {
                await sprintService.deleteEnrollment(enrollmentId);
            }
        } catch (err) {
            console.error("Failed to remove sprint from queue:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="h-screen w-full bg-[#FAFAFA] dark:bg-[#121212] flex flex-col overflow-hidden">
                <div className="px-6 py-5 flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800">
                    <div className="h-6 w-32 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
                </div>
                <div className="flex-1 p-6 space-y-8 max-w-lg mx-auto w-full">
                    <div className="h-72 bg-gray-200 dark:bg-zinc-800 rounded-[2.5rem] animate-pulse" />
                    <div className="h-44 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#FAFAFA] dark:bg-[#121212] flex flex-col selection:bg-[#0E7850]/10 font-sans">
            {/* Header */}
            <header className="px-6 py-5 flex-shrink-0 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-30">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                        My Sprints
                    </h1>
                    {activeEnrollment && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500 text-white flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            Active
                        </span>
                    )}
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 px-4 sm:px-6 py-6 pb-28 max-w-3xl mx-auto w-full space-y-10">
                
                {/* 1. ACTIVE SPRINT (THE BIG DESIGN) */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                                Active Sprint
                            </h2>
                            {activeEnrollment && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-[#0E7850] dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                                    <span className="w-1 h-1 rounded-full bg-[#0E7850] dark:bg-emerald-400 animate-pulse" />
                                    In Progress
                                </span>
                            )}
                        </div>
                    </div>

                    {activeSprint && activeEnrollment ? (
                        <div 
                            onClick={handleContinueActiveSprint}
                            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100/90 dark:border-zinc-800 flex flex-col space-y-5 cursor-pointer hover:border-[#0E7850]/40 hover:shadow-2xl transition-all group animate-fade-in"
                        >
                            {/* Sprint Cover / Visual Header */}
                            <div className="relative w-full h-44 sm:h-52 rounded-3xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-inner">
                                <img
                                    src={getSprintCoverImage(activeSprint)}
                                    alt={activeSprint.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"></div>

                                {/* Floating Progress Pill */}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                                        <Flame className="w-3 h-3 text-amber-400" />
                                        Move {currentDay} of {totalDays}
                                    </span>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                                        {activeSprint.category || "Growth Journey"}
                                    </span>
                                    <h2 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-sm truncate">
                                        {activeSprint.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Schedule Tracker Progress Dots */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-zinc-500">
                                    <span>Milestones Completed</span>
                                    <span>{completedDaysCount} / {totalDays} Moves</span>
                                </div>

                                <div className="flex gap-1.5 items-center">
                                    {Array.from({ length: totalDays }).map((_, index) => {
                                        const dayNum = index + 1;
                                        const isCompleted = ((activeEnrollment as any)?.progress || []).some((p: any) => p.day === dayNum && p.completed);
                                        const isCurrent = dayNum === currentDay;

                                        return (
                                            <div
                                                key={dayNum}
                                                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                                    isCompleted
                                                        ? 'bg-[#0E7850]'
                                                        : isCurrent
                                                            ? 'bg-amber-400 animate-pulse'
                                                            : 'bg-gray-100 dark:bg-zinc-800'
                                                }`}
                                                title={`Move ${dayNum}: ${isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Continue CTA Button */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleContinueActiveSprint();
                                }}
                                className="w-full py-4 bg-[#0E7850] hover:bg-[#085C3D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E7850]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Continue Move {currentDay}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-zinc-800 text-center space-y-4 animate-fade-in">
                            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-[#0E7850]">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                    No Active Sprint Right Now
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium max-w-sm mx-auto">
                                    Ready for your next growth step? Check out your recommended sprint!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/participant/next-sprint')}
                                className="px-6 py-3.5 bg-[#0E7850] hover:bg-[#085C3D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-[#0E7850]/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                            >
                                <span>View Your Next Sprint</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </section>

                {/* 2. MY JOURNEY (HORIZONTAL ROW: ACTIVE CHALLENGES -> PAUSED SPRINTS -> QUEUE SPRINTS) */}
                <section className="space-y-3 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                                My Journey
                            </h2>
                            {horizontalJourneyItems.length > 0 && (
                                <span className="text-[10px] font-bold text-gray-400">
                                    ({horizontalJourneyItems.length})
                                </span>
                            )}
                        </div>
                    </div>

                    {horizontalJourneyItems.length > 0 ? (
                        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 custom-scrollbar scroll-smooth snap-x snap-mandatory">
                            {horizontalJourneyItems.map((item) => {
                                const { id, sprint, enrollment, type } = item;
                                const isChall = type === 'challenge';
                                const isPaused = type === 'paused';
                                const isQueue = type === 'queue';
                                const sprintCover = getSprintCoverImage(sprint);
                                const progressList = (enrollment as any)?.progress || [];
                                const progressVal = calculateProgress(progressList);
                                const totalRuns = (enrollment?.currentRun || enrollment?.runNumber || 1);

                                const linkPath = isChall 
                                    ? `/challenge/${sprint.id}`
                                    : enrollment 
                                        ? `/participant/sprint/${enrollment.id}`
                                        : `/sprint/${sprint.id}`;

                                const linkState = isChall 
                                    ? { sprint, enrollment, viewMode: 'active', continueChallenge: true }
                                    : undefined;

                                return (
                                    <div 
                                        key={id}
                                        className="w-[280px] sm:w-[320px] flex-shrink-0 snap-start bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800 hover:shadow-md hover:border-gray-200 dark:hover:border-zinc-700 transition-all flex flex-col justify-between group"
                                    >
                                        <div>
                                            {/* Cover thumbnail with badge */}
                                            <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-inner mb-3">
                                                <img 
                                                    src={sprintCover} 
                                                    alt={sprint.title} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                                
                                                {/* Status Pill on Top */}
                                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                                                    {isChall && (
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-purple-600 text-white shadow-xs">
                                                            Active Challenge
                                                        </span>
                                                    )}
                                                    {isPaused && (
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                                            Paused
                                                        </span>
                                                    )}
                                                    {isQueue && (
                                                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-gray-800/90 text-white shadow-xs">
                                                            Queued
                                                        </span>
                                                    )}
                                                    {totalRuns >= 2 && !isChall && (
                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-100">
                                                            Run {totalRuns}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Delete from queue button */}
                                                {isQueue && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleRemoveFromQueue(sprint.id, enrollment?.id, e)}
                                                        className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors cursor-pointer"
                                                        title="Remove from queue"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}

                                                <div className="absolute bottom-2 left-3 right-3">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 block truncate">
                                                        {isChall ? 'Challenge' : sprint.category}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Title & info */}
                                            <div className="space-y-1 mb-3">
                                                <h3 className="font-black text-sm text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {sprint.title}
                                                </h3>
                                                {isQueue ? (
                                                    <p className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-tight">
                                                        {sprint.duration || 5} Days • {sprint.category}
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1.5 pt-1">
                                                        <ProgressBar value={progressVal} />
                                                        <div className="flex justify-between items-center text-[9px] font-bold text-gray-400 dark:text-zinc-500">
                                                            <span>{progressVal.toFixed(0)}% Completed</span>
                                                            <span>Day {Math.min(progressList.filter((p: any) => p.completed).length + 1, sprint.duration || 5)} / {sprint.duration || 5}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resume / Start CTA */}
                                        <Link 
                                            to={linkPath} 
                                            state={linkState}
                                            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-zinc-800 hover:bg-[#0E7850] text-gray-700 dark:text-gray-300 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between group/btn cursor-pointer"
                                        >
                                            <span>{isQueue ? 'Start Sprint' : 'Resume'}</span>
                                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800 text-center">
                            <p className="text-xs text-gray-400 font-medium">No additional journeys in progress or queued.</p>
                        </div>
                    )}

                    {/* Small text reading: see previous experience leading to sprint archive page */}
                    <div className="pt-2 text-left pl-1">
                        <Link 
                            to="/profile/archive" 
                            className="text-xs font-semibold text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 group"
                        >
                            <span className="underline decoration-gray-300 dark:decoration-zinc-700 underline-offset-4 group-hover:decoration-primary">
                                see previous experience
                            </span>
                            <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default MySprints;
