import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, X, Sparkles, Star, CheckCircle2, Menu, MoreVertical, BookOpen, UserPlus, Coins, Trophy, Sun, Moon, Users, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import SprintCard from '../../components/SprintCard';
import BottomModalCoinCards from '../../components/BottomModalCoinCards';
import ParticipantDrawerMenu from '../../components/ParticipantDrawerMenu';
import PagedSprintDescription from '../../components/PagedSprintDescription';
import { SwitchModeModal, hasMultipleModes } from '../../components/SwitchModeModal';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { paymentService } from '../../services/paymentService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach, UserRole, Participant, LifecycleSlotAssignment } from '../../types';
import { CATEGORY_TO_STAGE_MAP, FOCUS_OPTIONS } from '../../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import { getExploreFirstSprint } from '../../utils/sprintUtils';
import { toast } from 'sonner';
import { triggerHaptic, hapticPatterns } from '../../utils/haptics';

export const NextSprintRecommendation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateProfile, activeRole, switchRole } = useAuth();

    const { sprintId } = useParams();
    const completedSprintId = location.state?.completedSprintId;
    const initialSprint = location.state?.recommendedSprint || location.state?.sprint || null;

    const [sprint, setSprint] = useState<Sprint | null>(initialSprint);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(!initialSprint);
    const [sprintLinks, setSprintLinks] = useState<any[]>([]);

    // Overview & Payment Modal State
    const [showOverviewModal, setShowOverviewModal] = useState<boolean>(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('coins');
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    const [isSwitchModeModalOpen, setIsSwitchModeModalOpen] = useState(false);
    const kebabMenuRef = useRef<HTMLDivElement>(null);
    const [isDarkMode, setIsDarkMode] = useState(() => 
        typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
    );
    const [activeOngoingEnrollment, setActiveOngoingEnrollment] = useState<any | null>(null);

    // Subscribe to user enrollments to track active in-progress sprint
    useEffect(() => {
        if (!user) {
            setActiveOngoingEnrollment(null);
            return;
        }

        const unsubscribe = sprintService.subscribeToUserEnrollments(user.id, (enrollments) => {
            const active = enrollments.find((e) => {
                if (e.status !== 'active') return false;
                if (e.completed_at) return false;
                const allDaysCompleted = Array.isArray(e.progress) && e.progress.length > 0 && e.progress.every((p) => p.completed);
                return !allDaysCompleted;
            });
            setActiveOngoingEnrollment(active || null);
        });

        return () => unsubscribe();
    }, [user]);

    const hasDualOrMultiMode = useMemo(() => {
        return hasMultipleModes(user);
    }, [user]);

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };
        checkDarkMode();
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Failsafe: Automatically fulfill and save any pending preview action when landing on dashboard
    useEffect(() => {
        if (!user) return;
        const pendingRaw = localStorage.getItem('pending_first_action');
        if (!pendingRaw) return;
        try {
            const pending = JSON.parse(pendingRaw);
            if (pending && pending.sprintId) {
                sprintService.getSprintById(pending.sprintId).then(async (targetSprint) => {
                    if (targetSprint) {
                        const effectiveInputs = pending.taskInputs || (pending.firstActionInput ? [pending.firstActionInput] : []);
                        const firstInput = effectiveInputs[0] || pending.firstActionInput || "";
                        const enrollment = await sprintService.enrollUser(user.id, targetSprint.id, targetSprint.duration, {
                            firstActionInput: firstInput,
                            taskInputs: effectiveInputs
                        } as any);

                        await userService.addUserEnrollment(user.id, targetSprint.id);

                        if (enrollment && enrollment.progress && enrollment.progress[0]) {
                            const updatedProgress = [...enrollment.progress];
                            updatedProgress[0] = {
                                ...updatedProgress[0],
                                completed: true,
                                completedAt: new Date().toISOString(),
                                answers: effectiveInputs,
                                submission: firstInput
                            };
                            const enrollmentRef = doc(db, "users", user.id, "enrollments", enrollment.id);
                            await updateDoc(enrollmentRef, { 
                                progress: updatedProgress,
                                last_activity_at: new Date().toISOString()
                            });
                        }
                        console.log("[NextSprintRecommendation] Auto-fulfilled pending preview action and saved to database for sprint:", targetSprint.id);
                        localStorage.removeItem('pending_first_action');
                        localStorage.removeItem('vectorise_last_sprint');
                        const d1Content = Array.isArray(targetSprint?.dailyContent) ? targetSprint.dailyContent.find((dc: any) => dc.day === 1) : undefined;
                        navigate('/participant/day-success', {
                            replace: true,
                            state: {
                                day: 1,
                                coinsUnlocked: 10,
                                bridgeNote: d1Content?.bridgeNote,
                                sprintId: targetSprint.id,
                                sprint: targetSprint,
                                enrollmentId: enrollment?.id,
                                taskInputs: effectiveInputs,
                                redirectToDaySuccess: true
                            }
                        });
                    }
                }).catch(err => console.error("Error auto-fulfilling pending action on dashboard:", err));
            }
        } catch (e) {
            console.error("Error reading pending action in NextSprintRecommendation:", e);
        }
    }, [user, navigate]);

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
        setIsThemeModalOpen(false);
        setIsKebabMenuOpen(false);
    };

    // Detect if the recommended sprint is a same-sprint link (repeat recommendation)
    const isSameSprintLinked = useMemo(() => {
        if (!sprint) return false;
        if (completedSprintId && sprint.id === completedSprintId) return true;
        if (sprint.nextSprintId === sprint.id || sprint.linkedSprintId === sprint.id) return true;
        if (Array.isArray(sprintLinks) && sprintLinks.some(l => 
            (l.sourceSprintId === (completedSprintId || sprint.id)) && l.targetSprintId === sprint.id
        )) {
            return true;
        }
        return false;
    }, [sprint, completedSprintId, sprintLinks]);

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

    const vectoriseCoach: Coach = useMemo(() => ({
        id: 'vectorise',
        name: 'Vectorise',
        profileImageUrl: 'https://lh3.googleusercontent.com/d/1jdtxp_51VdLMYNHsmyN-yNFTPN5GFjBd',
        role: UserRole.COACH,
        email: 'hello@vectorise.life',
        niche: 'AI Growth',
        bio: 'Your guide to the Vectorise platform.',
        approved: true
    }), []);

    // Load next recommended sprint using Explore recommendation logic
    const loadNextSprint = useCallback(async () => {
        if (initialSprint) {
            setSprint(initialSprint);
            if (initialSprint.coachId) {
                try {
                    const dbCoach = await userService.getUserDocument(initialSprint.coachId);
                    setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                } catch (e) {
                    setFetchedCoach(vectoriseCoach);
                }
            } else {
                setFetchedCoach(vectoriseCoach);
            }
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const [allPublished, dbCoaches, orchestration, links] = await Promise.all([
                sprintService.getPublishedSprints().catch(() => []),
                userService.getCoaches().catch(() => []),
                (sprintService.getOrchestration() as Promise<Record<string, LifecycleSlotAssignment>>).catch(() => ({} as Record<string, LifecycleSlotAssignment>)),
                sprintService.getSprintLinks().catch(() => [])
            ]);
            setSprintLinks(links || []);
            
            if (sprintId) {
                const target = allPublished.find(s => s.id === sprintId) || await sprintService.getSprintById(sprintId);
                if (target) {
                    setSprint(target);
                    if (target.coachId) {
                        try {
                            const dbCoach = dbCoaches.find(c => c.id === target.coachId) || await userService.getUserDocument(target.coachId);
                            setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                        } catch (e) {
                            setFetchedCoach(vectoriseCoach);
                        }
                    } else {
                        setFetchedCoach(vectoriseCoach);
                    }
                    setIsLoading(false);
                    return;
                }
            }

            let userEnrollments: any[] = [];
            let userEnrolledIds: string[] = [];
            if (user) {
                try {
                    userEnrollments = await sprintService.getUserEnrollments(user.id);
                    userEnrolledIds = userEnrollments.map(e => e.sprint_id);
                } catch (e) {
                    console.error("Error fetching enrollments:", e);
                }
            }

            const enrolledSet = new Set(userEnrolledIds);
            if (completedSprintId) {
                enrolledSet.add(completedSprintId);
            }

            // Sprint-to-Sprint Option Linking is senior brother to all other orchestrator logic
            const candidateSprint = getExploreFirstSprint(
                allPublished, 
                user, 
                orchestration, 
                enrolledSet, 
                userEnrollments, 
                links, 
                completedSprintId
            );

            if (candidateSprint) {
                setSprint(candidateSprint);
                if (candidateSprint.coachId) {
                    const matchedCoach = dbCoaches.find(c => c.id === candidateSprint?.coachId);
                    if (matchedCoach) {
                        setFetchedCoach(matchedCoach);
                    } else {
                        try {
                            const dbCoach = await userService.getUserDocument(candidateSprint.coachId);
                            setFetchedCoach((dbCoach as Coach) || vectoriseCoach);
                        } catch (e) {
                            setFetchedCoach(vectoriseCoach);
                        }
                    }
                } else {
                    setFetchedCoach(vectoriseCoach);
                }
            }
        } catch (err) {
            console.error("[NextSprintRecommendation] Error loading next sprint:", err);
        } finally {
            setIsLoading(false);
        }
    }, [initialSprint, sprintId, completedSprintId, user, vectoriseCoach]);

    useEffect(() => {
        loadNextSprint();
    }, [loadNextSprint]);

    // Update payment method default based on user balance
    useEffect(() => {
        if (sprint && user) {
            const cost = sprint.pointCost || 10;
            const balance = (user as Participant)?.walletBalance ?? 0;
            if (balance >= cost) {
                setPaymentMethod('coins');
            } else {
                setPaymentMethod('pkg_100');
            }
        }
    }, [sprint, user]);

    const handleConfirmCommitment = async () => {
        if (!user || !sprint || isProcessingPayment) return;

        if (activeOngoingEnrollment) {
            toast.error("You cannot start a new sprint while a sprint is currently in progress.");
            return;
        }

        setIsProcessingPayment(true);
        const cost = sprint.pointCost || 10;
        const currentBalance = (user as Participant)?.walletBalance ?? 0;

        try {
            if (paymentMethod === 'coins') {
                if (currentBalance < cost) {
                    toast.error("Insufficient Growth Coins. Please select a package or instant top-up.");
                    setIsProcessingPayment(false);
                    return;
                }

                // Deduct coins via processWalletTransaction
                await userService.processWalletTransaction(user.id, {
                    amount: -cost,
                    type: 'purchase',
                    description: `Unlocked ${sprint.title} via Growth Coins`,
                    auditId: sprint.id
                });

                // Enroll in the sprint
                const enrollment = await sprintService.enrollUser(
                    user.id,
                    sprint.id,
                    sprint.duration || 7,
                    {
                        coachId: sprint.coachId,
                        pricePaid: 0,
                        currency: sprint.currency || 'NGN',
                        source: 'coin'
                    }
                );

                toast.success(`Unlocked ${sprint.title}! Let's start Day 1.`);
                setIsPaymentModalOpen(false);
                navigate(`/participant/sprint/${enrollment.id}`, { replace: true });
            } else if (paymentMethod === 'card') {
                const coinsRem = Math.max(0, cost - currentBalance);
                const topupPrice = coinsRem > 0 ? coinsRem * 20 : (sprint.price || 1000);

                const checkoutUrl = await paymentService.initializeFlutterwave({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    amount: topupPrice,
                    currency: sprint.currency || 'NGN',
                    sprintId: sprint.id,
                    trackId: sprint.trackId
                });

                window.location.href = checkoutUrl;
            } else if (paymentMethod.startsWith('pkg_')) {
                const pkgPrices: Record<string, { price: number; coins: number }> = {
                    pkg_30: { price: 500, coins: 30 },
                    pkg_100: { price: 1300, coins: 100 },
                    pkg_300: { price: 3600, coins: 300 }
                };
                const selectedPkg = pkgPrices[paymentMethod] || { price: 1300, coins: 100 };

                const checkoutUrl = await paymentService.initializeFlutterwave({
                    userId: user.id,
                    email: user.email,
                    name: user.name,
                    amount: selectedPkg.price,
                    currency: 'NGN',
                    coinPackageId: paymentMethod,
                    coins: selectedPkg.coins,
                    sprintId: sprint.id,
                    trackId: sprint.trackId
                });

                window.location.href = checkoutUrl;
            }
        } catch (err) {
            console.error("Failed to unlock sprint:", err);
            toast.error("Failed to unlock sprint. Please try again.");
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const userBalance = (user as Participant)?.walletBalance ?? 0;
    const sprintCost = sprint?.pointCost || 10;
    const sprintPrice = sprint?.price || 1000;

    // Default to pkg_100 if user balance is lower than sprint cost
    useEffect(() => {
        if (isPaymentModalOpen && userBalance < sprintCost && (paymentMethod === 'coins' || !paymentMethod)) {
            setPaymentMethod('pkg_100');
        }
    }, [isPaymentModalOpen, userBalance, sprintCost, paymentMethod]);

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100 relative overflow-hidden">
            {/* Navigation Header */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-20 flex items-center justify-between pt-2 bg-transparent">
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
                        onClick={() => setIsKebabMenuOpen((prev) => !prev)}
                        className={`p-2.5 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl shadow-sm text-gray-700 dark:text-gray-200 hover:text-gray-950 dark:hover:text-white active:scale-95 transition-all cursor-pointer flex items-center justify-center ${isKebabMenuOpen ? 'ring-2 ring-[#0E7850]/20' : ''}`}
                        title="Options"
                    >
                        <MoreVertical className="w-5 h-5" />
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

            {/* Main Content */}
            <div className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-6 text-center bg-transparent dark:bg-transparent">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                        Your Next Sprint
                    </h1>
                </div>

                {/* Sprint Card with Price Badge visible */}
                <div className="w-full text-left bg-transparent dark:bg-transparent">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center bg-transparent dark:bg-transparent">
                            <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                        </div>
                    ) : sprint ? (
                        <div className="space-y-2 bg-transparent dark:bg-transparent">
                            <SprintCard 
                                sprint={sprint} 
                                coach={fetchedCoach || vectoriseCoach} 
                                isStatic={true} 
                                hideFooterDetails={false}
                                variant="light"
                                onOpenOverview={() => setShowOverviewModal(true)}
                            />
                            {isSameSprintLinked && (
                                <div className="flex justify-end pr-1 pt-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setShowOverviewModal(true)}
                                        className="text-xs font-bold text-[#0E7850] dark:text-emerald-400 hover:text-[#085C3D] hover:underline transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                    >
                                        View overview.
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300">No additional sprints found.</p>
                            <button
                                onClick={() => navigate('/explore')}
                                className="mt-4 px-4 py-2 bg-[#0E7850] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                            >
                                Browse All Sprints
                            </button>
                        </div>
                    )}
                </div>

                {/* Continue CTA */}
                {sprint && (
                    <div className="w-full space-y-3">
                        <button
                            onClick={() => {
                                if (activeOngoingEnrollment) {
                                    toast.error("You cannot start a new sprint while you are currently in one.");
                                    return;
                                }
                                setIsPaymentModalOpen(true);
                            }}
                            disabled={isLoading || !sprint || Boolean(activeOngoingEnrollment)}
                            className={`w-full py-5 font-black uppercase tracking-[0.2em] text-xs rounded-2xl transition-all flex items-center justify-center gap-2 ${
                                activeOngoingEnrollment
                                    ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-gray-250 dark:border-zinc-700 shadow-none'
                                    : 'bg-[#0E7850] hover:bg-[#085C3D] text-white shadow-xl shadow-[#0E7850]/20 hover:scale-[1.02] active:scale-95 cursor-pointer'
                            }`}
                        >
                            <span>{activeOngoingEnrollment ? 'Sprint in Progress' : 'Continue'}</span>
                            {!activeOngoingEnrollment && <ArrowRight className="w-4 h-4" />}
                        </button>

                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="w-full text-center pb-12 z-10 flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => navigate('/explore')}
                    className="text-xs text-gray-500 hover:text-[#0E7850] dark:text-gray-400 dark:hover:text-emerald-400 font-medium transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                    Explore other sprints in your path
                </button>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 opacity-60">GET 1% BETTER DAILY</p>
            </footer>

            {/* Bottom Modal Bar for Overview */}
            <AnimatePresence>
                {showOverviewModal && sprint && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="bg-white dark:bg-[#1c1c1e] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full text-gray-900 dark:text-gray-100 relative shadow-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto text-left border border-transparent dark:border-zinc-800"
                        >
                            {/* Drag Handle indicator */}
                            <div className="w-12 h-1 bg-gray-200 dark:bg-zinc-700 rounded-full mx-auto mb-4"></div>

                            {/* Close Button */}
                            <button
                                type="button"
                                onClick={() => setShowOverviewModal(false)}
                                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Category / Duration / Repeat badges */}
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#0E7850] bg-[#0E7850]/5 px-2.5 py-1 rounded-lg">
                                    {sprint.category || "Growth"}
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                                    {sprint.duration || 7} Days
                                </span>
                                {isSameSprintLinked && (
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        🔁 Repeat Sprint
                                    </span>
                                )}
                            </div>

                            {/* Sprint Title */}
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-gray-950 dark:text-white mb-3">
                                {sprint.title}
                            </h3>

                            {/* Description with Paged Slides / Formatted Text */}
                            <div className="mb-6">
                                <PagedSprintDescription text={sprint.description || sprint.subtitle || "Unlock consistency and start your rise."} />
                            </div>

                            {/* Continue CTA */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (activeOngoingEnrollment) {
                                        toast.error("You cannot start a new sprint while you are currently in one.");
                                        return;
                                    }
                                    setShowOverviewModal(false);
                                    setIsPaymentModalOpen(true);
                                }}
                                disabled={Boolean(activeOngoingEnrollment)}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 mt-4 ${
                                    activeOngoingEnrollment
                                        ? 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed border border-gray-250 dark:border-zinc-700'
                                        : 'bg-[#0E7850] hover:bg-[#085C3D] text-white shadow-xl shadow-[#0E7850]/20 hover:scale-[1.01] active:scale-95 cursor-pointer'
                                }`}
                            >
                                <span>{activeOngoingEnrollment ? 'Sprint in Progress' : 'Continue'}</span>
                                {!activeOngoingEnrollment && <ArrowRight className="w-4 h-4" />}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Modal Bar for Payment */}
            <AnimatePresence>
                {isPaymentModalOpen && sprint && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="bg-white dark:bg-[#1c1c1e] rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full text-gray-900 dark:text-gray-100 relative shadow-2xl max-h-[90vh] overflow-y-auto border border-transparent dark:border-zinc-800"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)}
                                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="text-left mb-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 mb-2">
                                    <Sparkles className="w-4 h-4 text-[#0E7850] dark:text-emerald-400" />
                                    <span className="text-xs font-black uppercase text-[#0E7850] dark:text-emerald-400 tracking-wider">
                                        Unlock Sprint
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-950 dark:text-white tracking-tight leading-snug">
                                    {sprint.title}
                                </h3>
                            </div>

                            {/* Wallet Balance Card */}
                            <div className="bg-gray-50/90 dark:bg-zinc-800/80 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-zinc-700 mb-4 text-left space-y-3.5">
                                {/* Balance and Cost Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                                            Your Balance
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-gray-950 dark:text-white flex items-center gap-1.5">
                                            <span>🪙 {userBalance}</span>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Coins</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">
                                            Sprint Cost
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-[#0E7850] dark:text-emerald-400 flex items-center justify-end gap-1.5">
                                            <span>{sprintCost}</span>
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Coins</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Option: Use Coins (Only shown when coins are enough) */}
                                {userBalance >= sprintCost && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-zinc-700">
                                        <div className="p-3.5 sm:p-4 rounded-xl border-2 border-[#0E7850] bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full border-2 border-[#0E7850] bg-[#0E7850] flex items-center justify-center text-white shrink-0">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                                                    Use {sprintCost} coins of your balance to continue
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-[#0E7850] bg-emerald-100 dark:bg-emerald-900/60 dark:text-emerald-300 px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
                                                Available
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Outside the card on plain ground: Coin Packages & Direct remaining coin pay */}
                            {userBalance < sprintCost && (
                                <div className="space-y-3.5 mb-4 text-left">
                                    {/* Horizontal Coin Packages on plain ground */}
                                    <BottomModalCoinCards 
                                        userBalance={userBalance}
                                        sprintCost={sprintCost}
                                        sprintId={sprint.id}
                                        trackId={sprint.trackId}
                                        selectedPaymentMethod={paymentMethod}
                                        onSelectPaymentMethod={(method) => setPaymentMethod(method)}
                                        isProcessing={isProcessingPayment}
                                    />

                                    {/* Pay for remaining coins directly on plain ground */}
                                    <div 
                                        onClick={() => !isProcessingPayment && setPaymentMethod('card')}
                                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                                            paymentMethod === 'card' 
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-[#0E7850] text-gray-900 dark:text-white shadow-xs ring-1 ring-[#0E7850]/30' 
                                                : 'bg-white dark:bg-zinc-800/80 border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 text-gray-700 dark:text-gray-200'
                                        }`}
                                    >
                                        <span className="text-sm sm:text-base font-bold">
                                            Pay for remaining coins directly
                                        </span>
                                        {(() => {
                                            const coinsRem = Math.max(0, sprintCost - userBalance);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : sprintPrice;
                                            return (
                                                <span className="text-sm sm:text-base font-black text-[#0E7850] dark:text-emerald-400 shrink-0 ml-2">
                                                    ₦{topupPrice.toLocaleString()}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Unlock Action Button */}
                            <div className="pt-2">
                                <button
                                    onClick={handleConfirmCommitment}
                                    disabled={isProcessingPayment || (paymentMethod === 'coins' && userBalance < sprintCost)}
                                    className={`w-full py-4.5 rounded-2xl shadow-xl transition-all text-sm sm:text-base font-black tracking-wider uppercase border-none flex items-center justify-center gap-2 cursor-pointer ${
                                        !isProcessingPayment && !(paymentMethod === 'coins' && userBalance < sprintCost)
                                            ? 'bg-[#0E7850] hover:bg-[#085C3D] text-white active:scale-95 shadow-[#0E7850]/20' 
                                            : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    {isProcessingPayment ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Unlocking Day 1...</span>
                                        </div>
                                    ) : userBalance >= sprintCost ? (
                                        <span>Start Day 1 Now • Use {sprintCost} Coins</span>
                                    ) : paymentMethod === 'card' ? (
                                        (() => {
                                            const coinsRem = Math.max(0, sprintCost - userBalance);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : sprintPrice;
                                            return <span>Instant Pay ₦{topupPrice.toLocaleString()} & Unlock</span>;
                                        })()
                                    ) : paymentMethod.startsWith('pkg_') ? (
                                        <span>Purchase Package & Unlock</span>
                                    ) : (
                                        <span>Select Payment Method</span>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isThemeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsThemeModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up">
                        <div className="p-8">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mb-2">Switch Mode</h2>
                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-8">Select your preferred view.</p>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <button 
                                    onClick={toggleDarkMode}
                                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 ${!isDarkMode ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 hover:border-gray-200 dark:hover:border-zinc-600'}`}
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-yellow-100 dark:bg-zinc-700 shadow-lg">☀️</div>
                                    <div className="text-left">
                                        <h4 className="text-xs font-black text-gray-900 dark:text-gray-100">Light Mode</h4>
                                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Bright and clear</p>
                                    </div>
                                </button>
                                <button 
                                    onClick={toggleDarkMode}
                                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all active:scale-95 ${isDarkMode ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 dark:bg-zinc-800 border-gray-100 dark:border-zinc-700 hover:border-gray-200 dark:hover:border-zinc-600'}`}
                                >
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-indigo-900 dark:bg-zinc-700 shadow-lg">🌙</div>
                                    <div className="text-left">
                                        <h4 className="text-xs font-black text-gray-900 dark:text-gray-100">Dark Mode</h4>
                                        <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Easy on eyes</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsThemeModalOpen(false)}
                            className="w-full py-5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black uppercase tracking-[0.3em] text-[10px]"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Participant Drawer Menu */}
            <ParticipantDrawerMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />

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
        </div>
    );
};

export default NextSprintRecommendation;
