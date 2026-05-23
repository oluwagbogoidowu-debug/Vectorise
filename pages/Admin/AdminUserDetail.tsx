import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userService, sanitizeData } from '../../services/userService';
import { sprintService } from '../../services/sprintService';
import { Participant, ParticipantSprint, Sprint } from '../../types';
import { ArrowLeft, Calendar, Mail, User as UserIcon, Zap, Target, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import ArchetypeAvatar from '../../components/ArchetypeAvatar';
import { motion, AnimatePresence } from 'motion/react';

const formatDateSafe = (dateVal: any, formatPattern: string, fallback = 'N/A') => {
    if (!dateVal) return fallback;
    try {
        let dateObj: Date;
        if (dateVal && typeof dateVal === 'object') {
            if (typeof dateVal.toDate === 'function') {
                dateObj = dateVal.toDate();
            } else if (typeof dateVal.seconds === 'number') {
                dateObj = new Date(dateVal.seconds * 1000);
            } else {
                dateObj = new Date(dateVal);
            }
        } else {
            dateObj = new Date(dateVal);
        }

        if (isNaN(dateObj.getTime())) {
            const parsed = parseISO(String(dateVal));
            if (!isNaN(parsed.getTime())) {
                return format(parsed, formatPattern);
            }
            return fallback;
        }

        return format(dateObj, formatPattern);
    } catch (e) {
        console.error("Error formatting date:", dateVal, e);
        return fallback;
    }
};

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
                setEnrollments((enrollmentsData || []).filter(e => !!e && !!e.id));
                setSprints((sprintsData || []).filter(s => !!s && !!s.id));
            } catch (error) {
                console.error("Error fetching user detail:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);

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

    const activeEnrollment = Array.isArray(enrollments) ? enrollments.find(e => e && e.status === 'active') : null;
    const sortedEnrollments = Array.isArray(enrollments)
        ? [...enrollments]
            .filter((e): e is ParticipantSprint => !!e && !!e.id)
            .sort((a, b) => {
                const timeA = a.started_at ? new Date(a.started_at).getTime() : 0;
                const timeB = b.started_at ? new Date(b.started_at).getTime() : 0;
                return timeB - timeA;
            })
        : [];
    
    const lastCompletedEnrollment = Array.isArray(enrollments)
        ? enrollments
            .filter(e => e && e.status === 'completed')
            .sort((a, b) => {
                const dateA = a && a.completed_at ? new Date(a.completed_at).getTime() : 0;
                const dateB = b && b.completed_at ? new Date(b.completed_at).getTime() : 0;
                return dateB - dateA;
            })[0]
        : undefined;

    // Inactivity logic
    let inactivityWarning = null;
    
    // Check if they are inactive based on: "In the whole system a user is inactive once it's a day after the last submission of the last task."
    const completedTimestamps = Array.isArray(enrollments) 
        ? enrollments.flatMap(e => 
            (e && e.progress || [])
                .filter(p => p && p.completed && p.completedAt)
                .map(p => p.completedAt ? new Date(p.completedAt).getTime() : 0)
        ).filter(t => t > 0 && !isNaN(t))
        : [];

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
        const startDates = Array.isArray(enrollments) 
            ? enrollments.map(e => e && e.started_at ? new Date(e.started_at).getTime() : 0).filter(t => t > 0 && !isNaN(t))
            : [];
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
    const completedSprints = Array.isArray(enrollments)
        ? enrollments.filter(e => e && (e.status === 'completed' || e.progress?.every(p => p && p.completed)))
        : [];
    let isNoProgress = false;
    if (completedSprints.length > 0) {
        const sortedCompleted = [...completedSprints].sort((a, b) => {
            const dateA = a && a.completed_at ? new Date(a.completed_at).getTime() : (a && a.started_at ? new Date(a.started_at).getTime() : 0);
            const dateB = b && b.completed_at ? new Date(b.completed_at).getTime() : (b && b.started_at ? new Date(b.started_at).getTime() : 0);
            return dateA - dateB;
        });
        const firstFinished = sortedCompleted[0];
        const finishTime = firstFinished && firstFinished.completed_at ? new Date(firstFinished.completed_at).getTime() : null;

        if (finishTime !== null && !isNaN(finishTime)) {
            const otherSprints = Array.isArray(enrollments) ? enrollments.filter(e => e && e.id !== firstFinished.id) : [];
            const hasProceeded = otherSprints.length > 0;
            const timeSinceFinish = Date.now() - finishTime;
            if (!hasProceeded && timeSinceFinish >= oneDay) {
                isNoProgress = true;
                inactivityWarning = `No Progress: Pending New Sprint (Finished first sprint but didn't start another the next day)`;
            }
        }
    }

    const getSprintTitle = (sprintId: string) => {
        return sprints.find(s => s.id === sprintId)?.title || 'Unknown Sprint';
    };

    const [activeSlide, setActiveSlide] = useState(0);

    const slides = [
        {
            title: 'Current Stage & Activity',
            id: 'activity',
            icon: <Clock className="w-5 h-5 text-purple-600" />,
            content: (
                <div className="space-y-4 py-2">
                    <div className="flex items-center gap-4 bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100/50">
                        <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                            <Target className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stage</p>
                            <p className="text-sm font-bold text-gray-900">{user.currentStage || 'Foundation'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Joined Vectorise</p>
                            <p className="text-sm font-bold text-gray-900">
                                {formatDateSafe(user.createdAt, 'MMMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100/50">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Login</p>
                            <p className="text-sm font-bold text-gray-900">
                                {formatDateSafe(user.lastLoginAt, 'MMM d, h:mm a')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 bg-blue-50/50 p-3.5 rounded-2xl border border-blue-100/50">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Activity</p>
                            <p className="text-sm font-bold text-gray-900">
                                {formatDateSafe(enrollments && enrollments.length > 0 ? enrollments[0].last_activity_at : undefined, 'MMM d, h:mm a', 'No recent activity')}
                            </p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: 'User Goal',
            id: 'goal',
            icon: <Target className="w-5 h-5 text-emerald-600" />,
            content: (
                <div className="space-y-5 py-2">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Growth Focus</p>
                        <div className="flex flex-wrap gap-2">
                            {Array.isArray(user.growthAreas) && user.growthAreas.length > 0 ? (
                                user.growthAreas.map((area, idx) => (
                                    <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                                        {area}
                                    </span>
                                ))
                            ) : (
                                <p className="text-xs font-bold text-gray-400 italic">No growth areas defined</p>
                            )}
                        </div>
                    </div>

                    {user.risePathway && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rise Pathway</p>
                            <p className="text-sm font-bold text-[#0E7850]">{user.risePathway}</p>
                        </div>
                    )}

                    {user.impactStats && (
                        <div className="grid grid-cols-2 gap-4 pt-1">
                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">People Helped</p>
                                <p className="text-base font-black text-gray-900">{user.impactStats.peopleHelped || 0}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Streak</p>
                                <p className="text-base font-black text-gray-900">{user.impactStats.streak || 0} days</p>
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Onboarding Answers',
            id: 'onboarding',
            icon: <Calendar className="w-5 h-5 text-blue-600" />,
            content: (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 py-1 custom-scrollbar">
                    {user.onboardingAnswers && typeof user.onboardingAnswers === 'object' && !Array.isArray(user.onboardingAnswers) && Object.keys(user.onboardingAnswers).length > 0 ? (
                        Object.entries(user.onboardingAnswers).map(([key, value], idx) => (
                            <div key={idx} className="border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{key ? String(key).replace(/_/g, ' ') : ''}</p>
                                <p className="text-xs font-bold text-gray-700 leading-relaxed">
                                    {typeof value === 'object' && value !== null ? (() => {
                                        if ('seconds' in value && 'nanoseconds' in value) {
                                            return new Date((value as any).seconds * 1000).toLocaleString();
                                        }
                                        try {
                                            const cleanVal = sanitizeData(value);
                                            return JSON.stringify(cleanVal) || '{}';
                                        } catch (err) {
                                            console.error("[AdminUserDetail] Onboarding answers custom stringify error:", err);
                                            return '[Complex Value]';
                                        }
                                    })() : String(value)}
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-100">
                            <p className="text-xs font-bold text-gray-400 italic">No onboarding answers recorded.</p>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Claims & Badges',
            id: 'badges',
            icon: <Zap className="w-5 h-5 text-yellow-500" />,
            content: (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 py-1 custom-scrollbar">
                    {Array.isArray(user.claimedBadges) && user.claimedBadges.length > 0 ? (
                        user.claimedBadges.map((badge: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                                <div>
                                    <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                                        {badge && badge.milestoneId ? String(badge.milestoneId).replace(/-/g, ' ') : 'Milestone achieved'}
                                    </p>
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                                        {formatDateSafe(badge?.claimedAt, 'MMM d, yyyy')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-emerald-600">+{badge?.claimedCredit || 0} Credits</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-xs font-bold text-gray-400 italic">No badges claimed yet.</p>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: 'Notification Setup',
            id: 'notifications',
            icon: <Zap className="w-5 h-5 text-red-500" />,
            content: (
                <div className="space-y-4 py-2">
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100/80">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Push</p>
                        <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${user.pushSubscription ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>
                            {user.pushSubscription ? 'Subscribed' : 'Not Subscribed'}
                        </span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100/80">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User Preference</p>
                        <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${!user.notificationsDisabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {!user.notificationsDisabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    {user.pushPermissionLastRequestAt && (
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50 text-center">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                                Last Permission Request Actioned At
                            </p>
                            <p className="text-xs font-bold text-gray-700 mt-1">
                                {formatDateSafe(user.pushPermissionLastRequestAt, 'MMM d, yyyy • h:mm a')}
                            </p>
                        </div>
                    )}
                </div>
            )
        }
    ];

    const nextSlide = () => {
        setActiveSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    const handleDragEnd = (_event: any, info: any) => {
        const threshold = 50;
        if (info.offset.x < -threshold) {
            nextSlide();
        } else if (info.offset.x > threshold) {
            prevSlide();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Profile Card */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <div className="flex items-center gap-5 sm:gap-6">
                                <ArchetypeAvatar archetypeId={user.archetype} profileImageUrl={user.profileImageUrl} size="lg" className="flex-shrink-0" />
                                <div className="space-y-1 min-w-0">
                                    <div className="inline-flex items-center px-2.5 py-0.5 bg-[#0E7850]/10 text-[#0E7850] rounded-full text-[9px] font-black uppercase tracking-widest">
                                        @{user.persona || 'participant'}
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 leading-none tracking-tight truncate">{user.name}</h2>
                                    <p className="text-xs font-bold text-gray-400 truncate">{user.email}</p>
                                    {user.occupation && (
                                        <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mt-1">{user.occupation}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Interactive Swipe Sections Panel */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[460px]">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2.5 animate-fade-in">
                                        {slides[activeSlide].icon}
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{slides[activeSlide].title}.</h3>
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button 
                                            onClick={prevSlide}
                                            className="p-1 px-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                                            aria-label="Previous Slide"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={nextSlide}
                                            className="p-1 px-2 rounded-lg bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                                            aria-label="Next Slide"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative overflow-visible">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeSlide}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            drag="x"
                                            dragConstraints={{ left: 0, right: 0 }}
                                            onDragEnd={handleDragEnd}
                                            className="cursor-grab active:cursor-grabbing select-none"
                                        >
                                            {slides[activeSlide].content}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Dot indicators at the bottom */}
                            <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-gray-50 flex-shrink-0">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setActiveSlide(idx)}
                                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                            activeSlide === idx 
                                                ? 'w-6 bg-[#0E7850]' 
                                                : 'w-2 bg-gray-200 hover:bg-gray-300'
                                        }`}
                                        title={slides[idx].title}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sprint History */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-primary" />
                                    <h3 className="text-lg font-black text-gray-900 italic">Sprint History.</h3>
                                </div>
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {(enrollments || []).length} Total Sprints
                                </span>
                            </div>

                            <div className="space-y-6">
                                {sortedEnrollments.length > 0 ? (
                                    sortedEnrollments.map((enrollment, idx) => {
                                        const progressList = enrollment.progress || [];
                                        const actualCompletionRate = progressList.length > 0 ? (progressList.filter(p => p && p.completed).length / progressList.length) * 100 : 0;
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
                                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                                                            isCurrent ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-gray-400'
                                                        }`}>
                                                            <Zap className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-base font-black text-gray-900">{getSprintTitle(enrollment.sprint_id)}</h4>
                                                                {isCurrent && (
                                                                    <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-md">Active</span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                                                Started {formatDateSafe(enrollment.started_at, 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(completionRate)}%</p>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Completion</p>
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
                                                            {formatDateSafe(enrollment.last_activity_at, 'MMM d')}
                                                        </p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                            {(isNoProgress && isCurrent) ? 'Daily Progress (Suspended: No Sprint)' : 'Daily Progress'}
                                                        </p>
                                                        <div className="flex gap-1">
                                                            {progressList.map((p, i) => (
                                                                <div 
                                                                    key={i}
                                                                    className={`flex-1 h-2 rounded-sm ${(p && p.completed && !(isNoProgress && isCurrent)) ? 'bg-primary' : 'bg-gray-200'}`}
                                                                    title={`Day ${p?.day || i + 1}`}
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
            </div>
        </div>
    );
}
