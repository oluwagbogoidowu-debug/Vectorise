import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Sparkles, Trophy, BookOpen, UserPlus, Coins, Sun, Moon, Flame, Menu, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';
import ParticipantDrawerMenu from '../../components/ParticipantDrawerMenu';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { Sprint, Coach, UserRole, Participant, ParticipantSprint } from '../../types';
import { toast } from 'sonner';

export const ActiveSprintPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const [activeEnrollment, setActiveEnrollment] = useState<ParticipantSprint | null>(null);
    const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
    const [coach, setCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
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

    // Load active ongoing sprint enrollment
    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, async (enrollments: any[]) => {
            const active = enrollments.find((e: any) => {
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
        <div className="relative min-h-[100dvh] w-full bg-[#FAFAFA] dark:bg-[#121212] flex flex-col justify-between items-center px-4 overflow-x-hidden selection:bg-[#0E7850]/10 font-sans pb-12 select-none">
            {/* Drawer Menu */}
            <ParticipantDrawerMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />

            {/* Header: Left drawer button, Center Logo, Right kebab */}
            <header className="w-full max-w-lg mx-auto flex items-center justify-between pt-6 pb-2 px-2 z-20">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Open Navigation"
                    aria-label="Open Navigation"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center">
                    <LocalLogo type="green" className="h-6 w-auto opacity-90" />
                </div>

                <div className="relative" ref={kebabMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsKebabMenuOpen(!isKebabMenuOpen)}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="More Options"
                        aria-label="More Options"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Kebab Menu Overlay Dropdown */}
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
                                        <div className="w-8 h-8 rounded-xl bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                            <Trophy className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs truncate">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">Claim Milestones</span>
                                            <span className="font-normal text-gray-500 dark:text-gray-400"> • Earn coin</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={toggleDarkMode}
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
                                                title={`Day ${dayNum}: ${isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Upcoming'}`}
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
                                <span>Continue Day {currentDay}</span>
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

            {/* Footer: NO explore text, but "GET 1% BETTER DAILY" remains */}
            <footer className="w-full text-center py-4 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 opacity-60">
                    GET 1% BETTER DAILY
                </p>
            </footer>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default ActiveSprintPage;
