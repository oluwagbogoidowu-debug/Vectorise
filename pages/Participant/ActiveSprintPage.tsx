import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Sparkles, Trophy, BookOpen, UserPlus, Coins, Sun, Moon, Flame, Menu, MoreVertical, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import ParticipantDrawerMenu from '../../components/ParticipantDrawerMenu';
import { SwitchModeModal, hasMultipleModes } from '../../components/SwitchModeModal';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { shineService } from '../../services/shineService';
import { MILESTONES, computeMilestoneStats, calculateMilestoneStatValue } from '../../services/milestoneConstants';
import { Sprint, Coach, UserRole, Participant, ParticipantSprint } from '../../types';
import { toast } from 'sonner';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';

export const ActiveSprintPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, activeRole, switchRole } = useAuth();

    const [activeEnrollment, setActiveEnrollment] = useState<ParticipantSprint | null>(null);
    const [userEnrollments, setUserEnrollments] = useState<ParticipantSprint[]>([]);
    const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
    const [coach, setCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [unclaimedMilestones, setUnclaimedMilestones] = useState<any[]>([]);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
    const [isSwitchModeModalOpen, setIsSwitchModeModalOpen] = useState(false);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const kebabMenuRef = useRef<HTMLDivElement>(null);

    const [isDarkMode, setIsDarkMode] = useState(() => 
        typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
    );

    // Watch dark mode
    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    const toggleDarkMode = () => {
        const nextVal = !isDarkMode;
        setIsDarkMode(nextVal);
        if (nextVal) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        setIsKebabMenuOpen(false);
    };

    // Close kebab menu when clicking outside
    useEffect(() => {
        if (!isKebabMenuOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (kebabMenuRef.current && !kebabMenuRef.current.contains(event.target as Node)) {
                setIsKebabMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isKebabMenuOpen]);

    // Check unclaimed milestones for badge indicators
    useEffect(() => {
        if (!user) {
            setUnclaimedMilestones([]);
            return;
        }
        const checkMilestones = async () => {
            try {
                const enrollments = userEnrollments.length > 0 ? userEnrollments : await sprintService.getUserEnrollments(user.id);
                const reflections = await shineService.getPostsByUserId(user.id).catch(() => []);
                const referralsCount = (user as any)?.referralsCount || 0;
                const stats = computeMilestoneStats(enrollments, reflections, referralsCount);
                const claimed = (user as Participant).claimedMilestoneIds || [];
                const unclaimed = MILESTONES.filter(m => {
                    const val = calculateMilestoneStatValue(m.id, stats);
                    return val >= m.targetValue && !claimed.includes(m.id);
                });
                setUnclaimedMilestones(unclaimed);
            } catch (e) {
                console.error("Error checking milestones in ActiveSprintPage:", e);
            }
        };
        checkMilestones();
    }, [user, userEnrollments]);

    // Load active ongoing sprint enrollment
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, async (enrollments: any[]) => {
            setUserEnrollments(enrollments || []);
            const active = (enrollments || []).find((e: any) => {
                if (e.status !== 'active') return false;
                if (e.completed_at) return false;
                const allDaysCompleted = Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every((p: any) => p.completed);
                return !allDaysCompleted;
            });

            if (active) {
                setActiveEnrollment(active);
                let loadedSprint = (active as any).sprint || null;
                if (!loadedSprint || !loadedSprint.title) {
                    try {
                        loadedSprint = await sprintService.getSprintById(active.sprint_id);
                    } catch (err) {
                        console.error("Error loading active sprint:", err);
                    }
                }
                setActiveSprint(loadedSprint);

                if (loadedSprint?.coachId) {
                    try {
                        const dbCoach = await userService.getUserDocument(loadedSprint.coachId);
                        if (dbCoach) setCoach(dbCoach as Coach);
                    } catch (e) {}
                }
            } else {
                setActiveEnrollment(null);
                setActiveSprint(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Calculate current milestone/day
    const totalDays = activeSprint?.duration || 5;

    const currentDay = useMemo(() => {
        if (!activeEnrollment) return 1;
        const progress = (activeEnrollment as any).progress || [];
        const firstUncompleted = progress.find((p: any) => !p.completed);
        const calcDay = firstUncompleted ? firstUncompleted.day : ((activeEnrollment as any).currentMilestoneDay || totalDays);
        return Math.min(Math.max(1, calcDay), totalDays);
    }, [activeEnrollment, totalDays]);

    const completedDaysCount = useMemo(() => {
        if (!activeEnrollment) return 0;
        const count = ((activeEnrollment as any).progress || []).filter((p: any) => p.completed).length;
        return Math.min(count, totalDays);
    }, [activeEnrollment, totalDays]);

    const hasDualOrMultiMode = useMemo(() => {
        return hasMultipleModes(user);
    }, [user]);

    const handleToggleKebabMenu = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        triggerHaptic(hapticPatterns.light);
        setIsKebabMenuOpen(prev => !prev);
    };

    const handleContinueSprint = () => {
        if (!activeEnrollment) {
            navigate('/participant/next-sprint');
            return;
        }
        navigate(`/participant/sprint/${activeEnrollment.id}`);
    };

    const handleReadBlog = () => {
        setIsKebabMenuOpen(false);
        navigate('/blog');
    };

    const handleReferFriend = async () => {
        setIsKebabMenuOpen(false);
        const p = user as Participant;
        const refCode = p?.referralCode || user?.id || '';
        const shareUrl = refCode ? `${window.location.origin}/?ref=${refCode}` : window.location.origin;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Join me on Vectorise',
                    text: 'Start rapid micro-sprints on Vectorise to build momentum and grow your career!',
                    url: shareUrl,
                });
                return;
            } catch (err: any) {
                if (err?.name !== 'AbortError') {
                    try {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success('Referral link copied to clipboard!');
                    } catch (e) {}
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Referral link copied to clipboard!');
            } catch (e) {
                toast.error('Could not copy link');
            }
        }
    };

    const handleClaimMilestones = () => {
        setIsKebabMenuOpen(false);
        navigate('/profile/hall-of-rise');
    };

    const handleBuyCoins = () => {
        setIsKebabMenuOpen(false);
        navigate('/buy-coins', { state: { from: location.pathname } });
    };

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-[#FAFAFA] dark:bg-[#121212] relative overflow-hidden selection:bg-[#0E7850]/10 font-sans select-none">
            {/* Drawer Menu */}
            <ParticipantDrawerMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />

            {/* Header: Left drawer button, Right Switch Mode & Kebab Menu (Identical to NextSprintRecommendation) */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-20 flex items-center justify-between pt-4 sm:pt-6 bg-transparent">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2.5 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
                    title="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                    {hasDualOrMultiMode && (
                        <button
                            type="button"
                            onClick={() => {
                                triggerHaptic(hapticPatterns.light);
                                setIsSwitchModeModalOpen(true);
                            }}
                            className="p-2.5 bg-[#0E7850] border border-[#0E7850] rounded-2xl shadow-sm text-white hover:bg-[#0b5d3e] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                            title="Switch Mode"
                        >
                            <SlidersHorizontal className="w-5 h-5 stroke-[2.5]" />
                        </button>
                    )}

                    <div className="relative" ref={kebabMenuRef}>
                        <button
                            type="button"
                            onClick={handleToggleKebabMenu}
                            className={`p-2.5 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center relative ${isKebabMenuOpen ? 'ring-2 ring-[#0E7850]/20' : ''}`}
                            title="Options"
                        >
                            <MoreVertical className="w-5 h-5" />
                            {unclaimedMilestones.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-black leading-none animate-pulse pointer-events-none">
                                    {unclaimedMilestones.length}
                                </span>
                            )}
                        </button>

                        <AnimatePresence>
                            {isKebabMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                                    transition={{ duration: 0.16, ease: "easeOut" }}
                                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-gray-100/90 dark:border-zinc-800 py-2 px-2 z-[100] origin-top-right overflow-hidden select-none"
                                >
                                    <div className="space-y-1">
                                        <button
                                            type="button"
                                            onClick={handleReadBlog}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div className="text-xs truncate">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">Read Rise Blog</span>
                                                <span className="font-normal text-gray-500 dark:text-gray-400"> · Earn coins</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleReferFriend}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                                <UserPlus className="w-4 h-4" />
                                            </div>
                                            <div className="text-xs truncate">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">Refer a Friend</span>
                                                <span className="font-normal text-gray-500 dark:text-gray-400"> · Earn coins</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleClaimMilestones}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors relative">
                                                <Trophy className="w-4 h-4" />
                                                {unclaimedMilestones.length > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
                                                )}
                                            </div>
                                            <div className="text-xs truncate flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">Claim Milestones</span>
                                                {unclaimedMilestones.length > 0 && (
                                                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-xs shrink-0 min-w-[16px] h-4">
                                                        {unclaimedMilestones.length}
                                                    </span>
                                                )}
                                                <span className="font-normal text-gray-500 dark:text-gray-400"> · Earn coins</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsKebabMenuOpen(false);
                                                setIsThemeModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                            </div>
                                            <div className="text-xs truncate">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">Switch Mode</span>
                                                <span className="font-normal text-gray-500 dark:text-gray-400"> • {isDarkMode ? 'Light' : 'Dark'}</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleBuyCoins}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700 transition-all text-left cursor-pointer group"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                                <Coins className="w-4 h-4" />
                                            </div>
                                            <div className="text-xs truncate">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">Buy Coins</span>
                                                <span className="font-normal text-gray-500 dark:text-gray-400"> • Progress faster</span>
                                            </div>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Main Center Container */}
            <div className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950 dark:text-white flex flex-wrap items-center justify-center gap-2">
                        <span>Your Active Sprint</span>
                        <span className="inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-[#0E7850] dark:text-emerald-400 text-[8px] font-black uppercase tracking-wider rounded-full">
                            In Progress
                        </span>
                    </h1>
                </div>

                {/* Active Sprint Card */}
                <div className="w-full text-left">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                        </div>
                    ) : activeSprint && activeEnrollment ? (
                        <div 
                            onClick={handleContinueSprint}
                            className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-2xl border border-gray-100/90 dark:border-zinc-800 flex flex-col space-y-5 cursor-pointer hover:border-[#0E7850]/40 transition-all group"
                        >
                            {/* Sprint Cover / Visual Header */}
                            <div className="relative w-full h-44 rounded-3xl overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-inner">
                                <img
                                    src={activeSprint.coverImageUrl || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80"}
                                    alt={activeSprint.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20"></div>

                                {/* Floating Progress Pill */}
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                                        <Flame className="w-3 h-3 text-amber-400" />
                                        Move {currentDay} of {totalDays}
                                    </span>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 block mb-1">
                                        {activeSprint.category || "Growth Journey"}
                                    </span>
                                    <h2 className="text-lg font-black text-white leading-tight drop-shadow-sm truncate">
                                        {activeSprint.title}
                                    </h2>
                                </div>
                            </div>

                            {/* Schedule Tracker Progress Dots */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
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
                                    handleContinueSprint();
                                }}
                                className="w-full py-4 bg-[#0E7850] hover:bg-[#085C3D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0E7850]/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Continue Move {currentDay}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-zinc-800 text-center space-y-4">
                            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto text-[#0E7850]">
                                <Sparkles className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                No Active Sprint Right Now
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                                Ready for your next growth step? Check out your recommended sprint!
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/participant/next-sprint')}
                                className="w-full py-4 bg-[#0E7850] hover:bg-[#085C3D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md active:scale-95 transition-all cursor-pointer"
                            >
                                View Your Next Sprint
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: GET 1% BETTER DAILY */}
            <footer className="w-full text-center py-4 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 opacity-60">
                    GET 1% BETTER DAILY
                </p>
            </footer>

            {/* Theme Toggle Modal */}
            {isThemeModalOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsThemeModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] max-w-sm w-full p-6 text-center space-y-6 shadow-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Appearance</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Choose how Vectorise looks to you</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => {
                                    setIsDarkMode(false);
                                    document.documentElement.classList.remove('dark');
                                    localStorage.setItem('theme', 'light');
                                    setIsThemeModalOpen(false);
                                }}
                                className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all cursor-pointer ${!isDarkMode ? 'border-[#0E7850] bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-gray-100 dark:border-zinc-800 hover:border-gray-200'}`}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-amber-100 text-amber-600 shadow-xs">☀️</div>
                                <div className="text-center">
                                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100">Light Mode</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Clean & crisp</p>
                                </div>
                            </button>
                            <button
                                onClick={() => {
                                    setIsDarkMode(true);
                                    document.documentElement.classList.add('dark');
                                    localStorage.setItem('theme', 'dark');
                                    setIsThemeModalOpen(false);
                                }}
                                className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all cursor-pointer ${isDarkMode ? 'border-[#0E7850] bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-gray-100 dark:border-zinc-800 hover:border-gray-200'}`}
                            >
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-indigo-900 dark:bg-zinc-700 shadow-xs">🌙</div>
                                <div className="text-center">
                                    <h4 className="text-xs font-black text-gray-900 dark:text-gray-100">Dark Mode</h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Easy on eyes</p>
                                </div>
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsThemeModalOpen(false)}
                            className="w-full py-4 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-black uppercase tracking-widest text-[10px] cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Switch Mode Modal (for dual/multi-mode coaches and admins) */}
            <SwitchModeModal
                isOpen={isSwitchModeModalOpen}
                onClose={() => setIsSwitchModeModalOpen(false)}
                user={user}
                activeRole={activeRole}
                onSelectMode={(role, route) => {
                    switchRole(role);
                    navigate(route);
                }}
            />

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ActiveSprintPage;
