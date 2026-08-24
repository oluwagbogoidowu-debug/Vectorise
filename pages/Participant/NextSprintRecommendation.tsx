import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, X, Sparkles, Star, CheckCircle2, Menu, MoreVertical, BookOpen, UserPlus, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import LocalLogo from '../../components/LocalLogo';
import SprintCard from '../../components/SprintCard';
import BottomModalCoinCards from '../../components/BottomModalCoinCards';
import ParticipantDrawerMenu from '../../components/ParticipantDrawerMenu';
import { sprintService } from '../../services/sprintService';
import { userService } from '../../services/userService';
import { paymentService } from '../../services/paymentService';
import { assetService } from '../../services/assetService';
import { Sprint, Coach, UserRole, Participant, LifecycleSlotAssignment } from '../../types';
import { CATEGORY_TO_STAGE_MAP, FOCUS_OPTIONS } from '../../services/mockData';
import { GROWTH_AREAS, RISE_PATHWAYS } from '../../constants';
import { getExploreFirstSprint } from '../../utils/sprintUtils';
import { toast } from 'sonner';

export const NextSprintRecommendation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, updateProfile } = useAuth();

    const { sprintId } = useParams();
    const completedSprintId = location.state?.completedSprintId;
    const initialSprint = location.state?.recommendedSprint || location.state?.sprint || null;

    const [sprint, setSprint] = useState<Sprint | null>(initialSprint);
    const [fetchedCoach, setFetchedCoach] = useState<Coach | null>(null);
    const [isLoading, setIsLoading] = useState(!initialSprint);

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isKebabMenuOpen, setIsKebabMenuOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('coins');
    const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
    const kebabMenuRef = useRef<HTMLDivElement>(null);

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
            const [allPublished, dbCoaches, orchestration, sprintLinks] = await Promise.all([
                sprintService.getPublishedSprints().catch(() => []),
                userService.getCoaches().catch(() => []),
                (sprintService.getOrchestration() as Promise<Record<string, LifecycleSlotAssignment>>).catch(() => ({} as Record<string, LifecycleSlotAssignment>)),
                sprintService.getSprintLinks().catch(() => [])
            ]);
            
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
                sprintLinks, 
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

    return (
        <div className="flex flex-col min-h-screen w-full items-center justify-between p-6 bg-white text-gray-900 relative overflow-hidden">
            {/* Navigation Header */}
            <header className="w-full max-w-[340px] sm:max-w-[380px] z-20 flex items-center justify-between pt-2">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen(true)}
                    className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-700 hover:text-gray-950 active:scale-95 transition-all cursor-pointer"
                    title="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <LocalLogo type="green" className="h-5 w-auto" />

                <div className="relative" ref={kebabMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsKebabMenuOpen((prev) => !prev)}
                        className={`p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm text-gray-700 hover:text-gray-950 active:scale-95 transition-all cursor-pointer flex items-center justify-center ${isKebabMenuOpen ? 'ring-2 ring-[#0E7850]/20' : ''}`}
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
                                className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100/90 py-2 px-2 z-[100] origin-top-right overflow-hidden select-none"
                            >
                                <div className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={handleReadBlog}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                            <BookOpen className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs truncate">
                                            <span className="font-bold text-gray-900">Read Rise Blog</span>
                                            <span className="font-normal text-gray-500"> · Earn coins</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleReferFriend}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                            <UserPlus className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs truncate">
                                            <span className="font-bold text-gray-900">Refer a Friend</span>
                                            <span className="font-normal text-gray-500"> · Earn coins</span>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleBuyCoins}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-gray-50 active:bg-gray-100 transition-all text-left cursor-pointer group"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center shrink-0 group-hover:bg-[#0E7850]/10 group-hover:text-[#0E7850] transition-colors">
                                            <Coins className="w-4 h-4" />
                                        </div>
                                        <div className="text-xs truncate">
                                            <span className="font-bold text-gray-900">Buy Coins</span>
                                            <span className="font-normal text-gray-500"> • Progress faster</span>
                                        </div>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full max-w-[340px] sm:max-w-[380px] my-auto py-6 z-10 animate-fade-in space-y-6 text-center">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-950">
                        Your Next Sprint
                    </h1>
                </div>

                {/* Sprint Card with Price Badge visible */}
                <div className="w-full text-left">
                    {isLoading ? (
                        <div className="py-20 flex justify-center items-center">
                            <div className="w-8 h-8 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
                        </div>
                    ) : sprint ? (
                        <div className="space-y-3">
                            <SprintCard 
                                sprint={sprint} 
                                coach={fetchedCoach || vectoriseCoach} 
                                isStatic={true} 
                                hideFooterDetails={false}
                                variant="light"
                            />
                        </div>
                    ) : (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                            <p className="text-xs font-bold text-gray-700">No additional sprints found.</p>
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
                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        disabled={isLoading || !sprint}
                        className="w-full py-5 bg-[#0E7850] hover:bg-[#085C3D] text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl shadow-[#0E7850]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                )}
            </main>

            {/* Footer */}
            <footer className="w-full text-center pb-4 opacity-40 z-10">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">GET 1% BETTER DAILY</p>
            </footer>

            {/* Bottom Modal Bar for Payment */}
            <AnimatePresence>
                {isPaymentModalOpen && sprint && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-7 max-w-md w-full text-gray-900 relative shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => !isProcessingPayment && setIsPaymentModalOpen(false)}
                                className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header */}
                            <div className="text-left mb-4">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-200/60 mb-2">
                                    <Sparkles className="w-4 h-4 text-[#0E7850]" />
                                    <span className="text-xs font-black uppercase text-[#0E7850] tracking-wider">
                                        Unlock Sprint
                                    </span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight leading-snug">
                                    {sprint.title}
                                </h3>
                            </div>

                            {/* Wallet Balance Card */}
                            <div className="bg-gray-50/90 rounded-2xl p-4 sm:p-5 border border-gray-200/80 mb-4 text-left space-y-3.5">
                                {/* Balance and Cost Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                                            Your Balance
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-1.5">
                                            <span>🪙 {userBalance}</span>
                                            <span className="text-xs font-bold text-gray-500 uppercase">Coins</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                                            Sprint Cost
                                        </div>
                                        <div className="text-base sm:text-lg font-black text-[#0E7850] flex items-center justify-end gap-1.5">
                                            <span>{sprintCost}</span>
                                            <span className="text-xs font-bold text-emerald-700 uppercase">Coins</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Option: Use Coins (Only shown when coins are enough) */}
                                {userBalance >= sprintCost && (
                                    <div className="pt-3 border-t border-gray-200">
                                        <div className="p-3.5 sm:p-4 rounded-xl border-2 border-[#0E7850] bg-emerald-50/40 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full border-2 border-[#0E7850] bg-[#0E7850] flex items-center justify-center text-white shrink-0">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm sm:text-base font-black text-gray-900">
                                                    Use {sprintCost} coins of your balance to continue
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-[#0E7850] bg-emerald-100 px-2.5 py-1 rounded-md uppercase tracking-wider shrink-0">
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
                                                ? 'bg-emerald-50/50 border-[#0E7850] text-gray-900 shadow-xs ring-1 ring-[#0E7850]/30' 
                                                : 'bg-white border-gray-200 hover:border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        <span className="text-sm sm:text-base font-bold">
                                            Pay for remaining coins directly
                                        </span>
                                        {(() => {
                                            const coinsRem = Math.max(0, sprintCost - userBalance);
                                            const topupPrice = coinsRem > 0 ? coinsRem * 20 : sprintPrice;
                                            return (
                                                <span className="text-sm sm:text-base font-black text-[#0E7850] shrink-0 ml-2">
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
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
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

            {/* Participant Drawer Menu */}
            <ParticipantDrawerMenu 
                isOpen={isMenuOpen} 
                onClose={() => setIsMenuOpen(false)} 
            />
        </div>
    );
};

export default NextSprintRecommendation;
